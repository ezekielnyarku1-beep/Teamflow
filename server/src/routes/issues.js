import { Router } from 'express'
import { generateJson, answerText } from '../assistant.js'
import { prisma } from '../db.js'
import { findVisibleIssue, findVisibleTeam, isAdmin, teamKeyOf, visibleTeamsWhere } from '../access.js'
import { syncCycles } from '../cycles.js'
import { HttpError } from '../errors.js'
import { IssuePriority, IssueStatus } from '../generated/prisma/enums.ts'
import { checkIssueReferences, createIssue, describeChanges, notifyAboutComment, notifyAssignee, notifyPeople } from '../issues.js'
import {
  creationActivity,
  issueDetailInclude,
  issueInclude,
  personSelect,
  serializeComment,
  serializeIssue,
  serializeIssueDetail,
} from '../serializers.js'
import {
  readBody,
  readChoice,
  readId,
  readIdList,
  readOptionalDate,
  readOptionalId,
  readTeamKey,
  readText,
} from '../validation.js'

export const issuesRouter = Router()

const statuses = Object.values(IssueStatus)
const priorities = Object.values(IssuePriority)

issuesRouter.post('/draft', async (request, response) => {
  const body = readBody(request)
  await findVisibleTeam(request.user, readTeamKey(body.teamKey))
  const sentence = readText(body.sentence, 'Idea', { max: 200 })
  const draft = await generateJson('Draft a concise actionable issue using only the supplied facts. Return {title,description,priority}. Choose priority from the supplied list. Use NO_PRIORITY when urgency is unclear.', { sentence, priorities })
  response.json({
    title: answerText(draft?.title, 200),
    description: answerText(draft?.description),
    priority: priorities.includes(draft?.priority) ? draft.priority : 'NO_PRIORITY',
  })
})

issuesRouter.post('/:identifier/summary', async (request, response) => {
  const issue = await findVisibleIssue(request.user, request.params.identifier, {
    comments: { select: { body: true }, orderBy: { createdAt: 'desc' }, take: 30 },
  })
  if (!issue.comments.length) return response.json({ text: 'No comments yet.' })
  const comments = issue.comments.reverse().map(comment => comment.body.slice(0, 1200))
  const result = await generateJson('Summarize decisions, open questions and next steps supported by the comments. Return {text}.', comments)
  response.json({ text: answerText(result?.text) })
})

function readIssueFields(body, { creating }) {
  const fields = {}
  if (creating || 'title' in body) fields.title = readText(body.title, 'Title', { max: 200 })
  if (creating || 'status' in body) fields.status = readChoice(body.status, 'Status', statuses)
  if ('description' in body) fields.description = readText(body.description, 'Description', { max: 10000, allowEmpty: true, keepSpaces: true })
  if ('priority' in body) fields.priority = readChoice(body.priority, 'Priority', priorities)
  if ('assigneeId' in body) fields.assigneeId = readOptionalId(body.assigneeId, 'Assignee')
  if ('projectId' in body) fields.projectId = readOptionalId(body.projectId, 'Project')
  if ('cycleId' in body) fields.cycleId = readOptionalId(body.cycleId, 'Cycle')
  if ('dueDate' in body) fields.dueDate = readOptionalDate(body.dueDate, 'Due date')
  if ('labelIds' in body) fields.labelIds = readIdList(body.labelIds, 'Labels')
  return fields
}

issuesRouter.get('/', async (request, response) => {
  const { team, project, cycle, assignee } = request.query
  const where = { team: visibleTeamsWhere(request.user) }
  if (typeof team === 'string') where.team.key = team
  if (project !== undefined) where.projectId = readOptionalId(project, 'Project')
  if (cycle !== undefined) where.cycleId = readId(cycle, 'Cycle')
  await syncCycles(where.team)
  if (assignee === 'me') where.assigneeId = request.user.id
  const issues = await prisma.issue.findMany({
    where,
    include: issueInclude,
    orderBy: [{ status: 'asc' }, { number: 'desc' }],
  })
  response.json(issues.map(serializeIssue))
})

issuesRouter.get('/:identifier', async (request, response) => {
  const teamKey = teamKeyOf(request.params.identifier)
  if (teamKey) await syncCycles({ ...visibleTeamsWhere(request.user), key: teamKey })
  const issue = await findVisibleIssue(request.user, request.params.identifier, issueDetailInclude)
  response.json(serializeIssueDetail(issue))
})

issuesRouter.post('/', async (request, response) => {
  const body = readBody(request)
  const team = await findVisibleTeam(request.user, readTeamKey(body.teamKey))
  const fields = readIssueFields(body, { creating: true })
  const issue = await prisma.$transaction(async tx => {
    await checkIssueReferences(tx, team.id, fields)
    const created = await createIssue(tx, { ...fields, teamId: team.id, actorId: request.user.id }, issueInclude)
    await notifyAssignee(tx, { issueId: created.id, assigneeId: created.assigneeId, actorId: request.user.id })
    return created
  })
  response.status(201).json(serializeIssue(issue))
})

issuesRouter.patch('/:identifier', async (request, response) => {
  const body = readBody(request)
  const issue = await findVisibleIssue(request.user, request.params.identifier)
  const { labelIds, ...fields } = readIssueFields(body, { creating: false })
  if (!Object.keys(fields).length && !labelIds) throw new HttpError(400, 'There is nothing to change.')

  const after = await prisma.$transaction(async tx => {
    const locked = await tx.$queryRaw`SELECT id FROM "Issue" WHERE id = ${issue.id} FOR UPDATE`
    if (!locked.length) throw new HttpError(404, 'Issue not found.')
    const before = await tx.issue.findUnique({ where: { id: issue.id }, include: issueInclude })
    await checkIssueReferences(tx, before.teamId, { ...fields, labelIds })
    const updated = await tx.issue.update({
      where: { id: before.id },
      data: { ...fields, ...(labelIds && { labels: { set: labelIds.map(id => ({ id })) } }) },
      include: issueInclude,
    })
    if (updated.assigneeId !== before.assigneeId) {
      await notifyAssignee(tx, { issueId: before.id, assigneeId: updated.assigneeId, actorId: request.user.id })
    }
    const changes = describeChanges(before, updated)
    if (changes.length) {
      await tx.issueActivity.createMany({
        data: changes.map(change => ({
          ...change,
          issueId: before.id,
          actorId: request.user.id,
          createdAt: updated.updatedAt,
        })),
      })
    }
    return { updated, before }
  }, { maxWait: 10000, timeout: 20000 })
  const { updated, before } = after
  // A new assignee already gets an "assigned" notification, so only tell an unchanged assignee about the new status.
  if (updated.status !== before.status && updated.assigneeId === before.assigneeId) {
    await notifyPeople(prisma, { issueId: updated.id, actorId: request.user.id, type: 'STATUS_CHANGED', userIds: [updated.assigneeId] })
  }
  response.json(serializeIssue(updated))
})

issuesRouter.delete('/:identifier', async (request, response) => {
  const issue = await findVisibleIssue(request.user, request.params.identifier, { activities: creationActivity })
  if (!isAdmin(request.user) && issue.activities[0]?.actorId !== request.user.id) {
    throw new HttpError(403, 'Only admins and the person who created this issue can delete it.')
  }
  await prisma.issue.delete({ where: { id: issue.id } })
  response.status(204).end()
})

issuesRouter.post('/:identifier/comments', async (request, response) => {
  const body = readBody(request)
  const issue = await findVisibleIssue(request.user, request.params.identifier)
  const comment = await prisma.comment.create({
    data: { issueId: issue.id, authorId: request.user.id, body: readText(body.body, 'Comment', { max: 5000 }) },
    include: { author: personSelect },
  })
  await notifyAboutComment(prisma, { issueId: issue.id, commentId: comment.id, actorId: request.user.id, assigneeId: issue.assigneeId })
  response.status(201).json(serializeComment(comment))
})
