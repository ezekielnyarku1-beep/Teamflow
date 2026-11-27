import { Router } from 'express'
import { generateJson, answerText } from '../assistant.js'
import { prisma } from '../db.js'
import { findVisibleTeam, requireAdmin, visibleTeamsWhere } from '../access.js'
import { HttpError } from '../errors.js'
import { loadProgress } from '../progressQueries.js'
import { personSelect, serializeProject, teamSelect } from '../serializers.js'
import { isId, readBody, readOptionalDate, readOptionalId, readTeamKey, readText } from '../validation.js'

export const projectsRouter = Router()

const projectInclude = { team: teamSelect, owner: personSelect }

async function serializeWithProgress(projects) {
  const progress = await loadProgress('projectId', projects.map(project => project.id))
  return projects.map(project => serializeProject(project, progress.get(project.id)))
}

async function findVisibleProject(user, id) {
  const project = isId(id) && await prisma.project.findFirst({
    where: { id, team: visibleTeamsWhere(user) },
    include: projectInclude,
  })
  if (!project) throw new HttpError(404, 'Project not found.')
  return project
}

function readProjectFields(body, { creating }) {
  const fields = {}
  if (creating || 'name' in body) fields.name = readText(body.name, 'Project name', { max: 80 })
  if ('description' in body) fields.description = readText(body.description, 'Description', { max: 5000, allowEmpty: true, keepSpaces: true })
  if ('ownerId' in body) fields.ownerId = readOptionalId(body.ownerId, 'Owner')
  if ('startDate' in body) fields.startDate = readOptionalDate(body.startDate, 'Start date')
  if ('targetDate' in body) fields.targetDate = readOptionalDate(body.targetDate, 'Target date')
  return fields
}

async function checkProjectFields(teamId, { ownerId, startDate, targetDate }) {
  if (ownerId) {
    const membership = await prisma.teamMember.findUnique({ where: { teamId_userId: { teamId, userId: ownerId } } })
    if (!membership) throw new HttpError(400, 'The owner must be a member of the team.')
  }
  if (startDate && targetDate && startDate > targetDate) {
    throw new HttpError(400, 'The target date cannot be before the start date.')
  }
}

projectsRouter.get('/', async (request, response) => {
  const teamFilter = visibleTeamsWhere(request.user)
  if (typeof request.query.team === 'string') teamFilter.key = request.query.team
  const projects = await prisma.project.findMany({
    where: { team: teamFilter },
    include: projectInclude,
    orderBy: { createdAt: 'asc' },
  })
  response.json(await serializeWithProgress(projects))
})

projectsRouter.get('/:id', async (request, response) => {
  const project = await findVisibleProject(request.user, request.params.id)
  const [serialized] = await serializeWithProgress([project])
  response.json(serialized)
})

projectsRouter.post('/:id/blockers', async (request, response) => {
  const project = await findVisibleProject(request.user, request.params.id)
  const issues = await prisma.issue.findMany({
    where: { projectId: project.id, teamId: project.teamId, status: { notIn: ['DONE', 'CANCELED'] } },
    orderBy: { updatedAt: 'desc' }, take: 40,
    select: { number: true, title: true, description: true,
      comments: { orderBy: { createdAt: 'desc' }, take: 4, select: { body: true } } },
  })
  const sources = issues.map(issue => ({
    identifier: `${project.team.key}-${issue.number}`, title: issue.title,
    description: issue.description.slice(0, 600), comments: issue.comments.map(c => c.body.slice(0, 350)),
  }))
  if (!sources.length) return response.json({ text: 'This project has no open issues.' })
  const result = await generateJson('Read each open issue. If the issue says work is blocked, waiting on approval, or cannot proceed until a dependency is met, include that issue unless a later comment resolves it. Copy its identifier exactly and describe the stated dependency. Priority or a deadline alone is insufficient. Example: an issue ABC-7 saying "waiting for design approval" gives {"blockers":[{"identifier":"ABC-7","reason":"Waiting for design approval."}]}. For no documented blockers return {"blockers":[]}.', sources)
  if (!Array.isArray(result?.blockers)) throw new HttpError(502, 'The AI returned an incomplete answer. Try again.')
  const blockers = result.blockers.map(item => {
    if (!sources.some(s => s.identifier === item?.identifier)) throw new HttpError(502, 'The AI returned an unknown issue. Try again.')
    return { identifier: item.identifier, reason: answerText(item.reason) }
  })
  response.json({ text: blockers.length ? '' : 'No blocker was documented in the reviewed issue excerpts.', blockers })
})

projectsRouter.post('/', requireAdmin, async (request, response) => {
  const body = readBody(request)
  const team = await findVisibleTeam(request.user, readTeamKey(body.teamKey))
  const fields = readProjectFields(body, { creating: true })
  await checkProjectFields(team.id, fields)
  const project = await prisma.project.create({ data: { ...fields, teamId: team.id }, include: projectInclude })
  const [serialized] = await serializeWithProgress([project])
  response.status(201).json(serialized)
})

projectsRouter.patch('/:id', requireAdmin, async (request, response) => {
  const body = readBody(request)
  const project = await findVisibleProject(request.user, request.params.id)
  const fields = readProjectFields(body, { creating: false })
  await checkProjectFields(project.teamId, {
    ownerId: fields.ownerId === project.ownerId ? null : fields.ownerId,
    startDate: 'startDate' in fields ? fields.startDate : project.startDate,
    targetDate: 'targetDate' in fields ? fields.targetDate : project.targetDate,
  })
  const updated = await prisma.project.update({ where: { id: project.id }, data: fields, include: projectInclude })
  const [serialized] = await serializeWithProgress([updated])
  response.json(serialized)
})
