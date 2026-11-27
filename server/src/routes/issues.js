import { Router } from 'express'
import { prisma } from '../db.js'
import { findVisibleIssue, findVisibleTeam, isAdmin, teamKeyOf, visibleTeamsWhere } from '../access.js'
import { startOfTodayUtc, syncCycles } from '../cycles.js'
import { HttpError } from '../errors.js'
import { IssuePriority, IssueStatus } from '../generated/prisma/enums.ts'
import { checkIssueReferences, createIssue, describeChanges, findMentions, notifyAboutComment, notifyAssignee, notifyPeople } from '../issues.js'
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
  if ('parentId' in body) fields.parentId = readOptionalId(body.parentId, 'Parent issue')
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

const openStatuses = ['BACKLOG', 'TODO', 'IN_PROGRESS']
const statsWeeks = 8
const dayMs = 24 * 60 * 60 * 1000
const weekStart = date => {
  const day = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
  day.setUTCDate(day.getUTCDate() - ((day.getUTCDay() + 6) % 7))
  return day
}

// Numbers for the Overview: open work, overdue issues, and issues finished per week (Monday to Sunday, UTC) over
// the last 8 weeks. "me" counts issues assigned to you; "team" counts every issue you can see.
issuesRouter.get('/stats', async (request, response) => {
  const where = { team: visibleTeamsWhere(request.user), ...(request.query.scope !== 'team' && { assigneeId: request.user.id }) }
  const today = startOfTodayUtc()
  const firstWeek = new Date(weekStart(today).getTime() - (statsWeeks - 1) * 7 * dayMs)
  const [open, inProgress, overdue, finished] = await Promise.all([
    prisma.issue.count({ where: { ...where, status: { in: openStatuses } } }),
    prisma.issue.count({ where: { ...where, status: 'IN_PROGRESS' } }),
    prisma.issue.count({ where: { ...where, status: { in: openStatuses }, dueDate: { lt: today } } }),
    prisma.issueActivity.findMany({
      where: { field: 'status', toValue: 'DONE', createdAt: { gte: firstWeek }, issue: { ...where, status: 'DONE' } },
      select: { issueId: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    }),
  ])
  // An issue moved to Done more than once counts once, on the last time.
  const doneAt = new Map(finished.map(event => [event.issueId, event.createdAt]))
  const weeks = Array.from({ length: statsWeeks }, (_, index) => new Date(firstWeek.getTime() + index * 7 * dayMs))
  const counts = weeks.map(() => 0)
  let doneLast7Days = 0
  for (const date of doneAt.values()) {
    counts[Math.floor((weekStart(date) - firstWeek) / (7 * dayMs))] += 1
    if (Date.now() - date.getTime() < 7 * dayMs) doneLast7Days += 1
  }
  response.json({
    open,
    inProgress,
    overdue,
    doneLast7Days,
    donePerWeek: weeks.map((start, index) => ({ weekStart: start.toISOString().slice(0, 10), count: counts[index] })),
  })
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
    await checkIssueReferences(tx, before.teamId, { ...fields, labelIds }, { issueId: before.id })
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

const issueId = identifier => readText(identifier, 'Issue ID', { max: 30 }).toUpperCase()
const issueDetail = (user, identifier) => findVisibleIssue(user, identifier, issueDetailInclude).then(serializeIssueDetail)

// Marks this issue as blocked by another one you can see (any team). An issue cannot block itself, and two issues
// cannot block each other.
issuesRouter.post('/:identifier/blocked-by', async (request, response) => {
  const body = readBody(request)
  const blocked = await findVisibleIssue(request.user, request.params.identifier)
  const blockerKey = issueId(body.identifier)
  const blocker = await findVisibleIssue(request.user, blockerKey)
  if (blocker.id === blocked.id) throw new HttpError(400, 'An issue cannot block itself.')
  const pair = { blockerId: blocker.id, blockedId: blocked.id }
  const reverse = await prisma.issueBlock.findUnique({ where: { blockerId_blockedId: { blockerId: blocked.id, blockedId: blocker.id } } })
  if (reverse) throw new HttpError(400, `${blockerKey} is already blocked by this issue.`)
  const existing = await prisma.issueBlock.findUnique({ where: { blockerId_blockedId: pair } })
  if (!existing) {
    await prisma.$transaction([
      prisma.issueBlock.create({ data: pair }),
      prisma.issueActivity.create({ data: { issueId: blocked.id, actorId: request.user.id, field: 'blockedBy', toValue: blockerKey } }),
    ])
  }
  response.status(existing ? 200 : 201).json(await issueDetail(request.user, request.params.identifier))
})

issuesRouter.delete('/:identifier/blocked-by/:blocker', async (request, response) => {
  const blocked = await findVisibleIssue(request.user, request.params.identifier)
  const blockerKey = issueId(request.params.blocker)
  const blocker = await findVisibleIssue(request.user, blockerKey)
  const { count } = await prisma.issueBlock.deleteMany({ where: { blockerId: blocker.id, blockedId: blocked.id } })
  if (count) {
    await prisma.issueActivity.create({ data: { issueId: blocked.id, actorId: request.user.id, field: 'blockedBy', fromValue: blockerKey } })
  }
  response.json(await issueDetail(request.user, request.params.identifier))
})

issuesRouter.post('/:identifier/comments', async (request, response) => {
  const body = readBody(request)
  const issue = await findVisibleIssue(request.user, request.params.identifier)
  const comment = await prisma.comment.create({
    data: { issueId: issue.id, authorId: request.user.id, body: readText(body.body, 'Comment', { max: 5000 }) },
    include: { author: personSelect },
  })
  const members = await prisma.user.findMany({ where: { memberships: { some: { teamId: issue.teamId } } }, select: { id: true, name: true } })
  const mentioned = findMentions(comment.body, members)
  await notifyPeople(prisma, { issueId: issue.id, actorId: request.user.id, type: 'MENTIONED', userIds: mentioned })
  await notifyAboutComment(prisma, { issueId: issue.id, commentId: comment.id, actorId: request.user.id, assigneeId: issue.assigneeId, skipUserIds: mentioned })
  response.status(201).json(serializeComment(comment))
})
