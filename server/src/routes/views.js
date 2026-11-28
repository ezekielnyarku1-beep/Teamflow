import { Router } from 'express'
import { prisma } from '../db.js'
import { findVisibleTeam, visibleTeamsWhere } from '../access.js'
import { HttpError } from '../errors.js'
import { IssuePriority } from '../generated/prisma/enums.ts'
import { teamSelect } from '../serializers.js'
import { isId, readBody, readBoolean, readChoiceList, readIdList, readTeamKey, readText } from '../validation.js'

export const viewsRouter = Router()

const maxViews = 50
const maxFilterIds = 500
const priorities = Object.values(IssuePriority)
const viewInclude = { team: teamSelect }
const serializeView = view => ({ id: view.id, name: view.name, team: view.team, filter: view.filter })
const ownVisibleViews = user => ({
  ownerId: user.id,
  OR: [{ teamId: null }, { team: { is: visibleTeamsWhere(user) } }],
})

function readViewFilter(value) {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new HttpError(400, 'Filter must be an object.')
  }
  return {
    priorities: readChoiceList(value.priorities, 'Priorities', priorities),
    assigneeIds: readIdList(value.assigneeIds, 'Assignees', { max: maxFilterIds }),
    labelIds: readIdList(value.labelIds, 'Labels', { max: maxFilterIds }),
    showClosed: readBoolean(value.showClosed, 'Show done issues'),
  }
}

async function readViewFields(user, body, { creating }) {
  const fields = {}
  if (creating || 'name' in body) fields.name = readText(body.name, 'View name', { max: 60 })
  if (creating || 'filter' in body) fields.filter = readViewFilter(body.filter)
  if (creating || 'teamKey' in body) {
    fields.teamId = body.teamKey == null ? null : (await findVisibleTeam(user, readTeamKey(body.teamKey))).id
  }
  return fields
}

async function findOwnView(user, id) {
  const view = isId(id) && await prisma.savedView.findFirst({ where: { id, ...ownVisibleViews(user) }, include: viewInclude })
  if (!view) throw new HttpError(404, 'View not found.')
  return view
}

viewsRouter.get('/', async (request, response) => {
  const views = await prisma.savedView.findMany({
    where: ownVisibleViews(request.user),
    include: viewInclude,
    orderBy: { name: 'asc' },
  })
  response.json(views.map(serializeView))
})

viewsRouter.get('/:id', async (request, response) => {
  response.json(serializeView(await findOwnView(request.user, request.params.id)))
})

viewsRouter.post('/', async (request, response) => {
  const fields = await readViewFields(request.user, readBody(request), { creating: true })
  if (await prisma.savedView.count({ where: ownVisibleViews(request.user) }) >= maxViews) {
    throw new HttpError(400, `You can save up to ${maxViews} views. Delete one first.`)
  }
  const view = await prisma.savedView.create({ data: { ...fields, ownerId: request.user.id }, include: viewInclude })
  response.status(201).json(serializeView(view))
})

viewsRouter.patch('/:id', async (request, response) => {
  const body = readBody(request)
  const view = await findOwnView(request.user, request.params.id)
  const fields = await readViewFields(request.user, body, { creating: false })
  if (!Object.keys(fields).length) throw new HttpError(400, 'There is nothing to change.')
  const updated = await prisma.savedView.update({ where: { id: view.id }, data: fields, include: viewInclude })
  response.json(serializeView(updated))
})

viewsRouter.delete('/:id', async (request, response) => {
  const view = await findOwnView(request.user, request.params.id)
  await prisma.savedView.delete({ where: { id: view.id } })
  response.status(204).end()
})
