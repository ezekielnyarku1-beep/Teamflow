import { Router } from 'express'
import { prisma } from '../db.js'
import { findVisibleTeam, requireAdmin, visibleTeamsWhere } from '../access.js'
import { cycleLengths, cycleState, startOfTodayUtc, syncCycles } from '../cycles.js'
import { HttpError } from '../errors.js'
import { daysAgo, loadFeed, readSince, summarize } from '../activityFeed.js'
import { calculateProgress } from '../progress.js'
import { loadProgress } from '../progressQueries.js'
import { personSelect, serializeCycleRef, toDateString } from '../serializers.js'
import { isId, readBody, readChoice, readId, readOptionalDate, readTeamKey, readText } from '../validation.js'

export const teamsRouter = Router()

const serializeTeam = (team, progress) => ({
  id: team.id,
  key: team.key,
  name: team.name,
  cycleWeeks: team.cycleWeeks,
  cycleStartDate: toDateString(team.cycleStartDate),
  progress,
})
const readTeamName = value => readText(value, 'Team name', { max: 60 })
async function readCycleChange(team, body) {
  if (body.cycleWeeks === null) return { cycleWeeks: null, cycleStartDate: null }
  if (team.cycleWeeks) throw new HttpError(400, 'Turn cycles off before changing the length or start date.')
  const cycleWeeks = readChoice(body.cycleWeeks, 'Cycle length', cycleLengths)
  const cycleStartDate = readOptionalDate(body.cycleStartDate ?? '', 'Start date')
  const last = await prisma.cycle.findFirst({ where: { teamId: team.id }, orderBy: { number: 'desc' } })
  if (last && cycleStartDate <= last.endDate) {
    throw new HttpError(400, `The first cycle must start after ${toDateString(last.endDate)}, when the last cycle ends.`)
  }
  return { cycleWeeks, cycleStartDate }
}

const loadMembers = teamId =>
  prisma.user.findMany({ where: { memberships: { some: { teamId } } }, ...personSelect, orderBy: { name: 'asc' } })

teamsRouter.get('/', async (request, response) => {
  const teams = await prisma.team.findMany({ where: visibleTeamsWhere(request.user), orderBy: { name: 'asc' } })
  const progress = await loadProgress('teamId', teams.map(team => team.id))
  response.json(teams.map(team => serializeTeam(team, progress.get(team.id))))
})

teamsRouter.get('/:key', async (request, response) => {
  const team = await findVisibleTeam(request.user, request.params.key)
  const [members, progress] = await Promise.all([loadMembers(team.id), loadProgress('teamId', [team.id])])
  response.json({ ...serializeTeam(team, progress.get(team.id)), members })
})

// Team momentum for managers: what each member did in this team today and over the last 7 days,
// and when they were last active. `today` is the start of today in the viewer's timezone. Admins only.
teamsRouter.get('/:key/momentum', requireAdmin, async (request, response) => {
  const team = await findVisibleTeam(request.user, request.params.key)
  const todayStart = readSince(request.query.today, startOfTodayUtc())
  const weekStart = daysAgo(6, todayStart)
  const members = await loadMembers(team.id)
  const teamWhere = { id: team.id }
  const rows = await Promise.all(members.map(async member => {
    const [events, lastActivity, lastComment] = await Promise.all([
      loadFeed({ userId: member.id, teamWhere, since: weekStart, limit: 1000 }),
      prisma.issueActivity.findFirst({ where: { actorId: member.id, issue: { teamId: team.id } }, orderBy: { createdAt: 'desc' }, select: { createdAt: true } }),
      prisma.comment.findFirst({ where: { authorId: member.id, issue: { teamId: team.id } }, orderBy: { createdAt: 'desc' }, select: { createdAt: true } }),
    ])
    const last = [lastActivity?.createdAt, lastComment?.createdAt].filter(Boolean).sort((a, b) => b - a)[0]
    return { ...member, ...summarize(events, todayStart), lastActiveAt: last ? last.toISOString() : null, recent: events.slice(0, 3) }
  }))
  response.json({ team: { key: team.key, name: team.name }, since: weekStart.toISOString(), members: rows })
})

teamsRouter.get('/:key/cycles', async (request, response) => {
  const team = await findVisibleTeam(request.user, request.params.key)
  await syncCycles({ id: team.id })
  const cycles = await prisma.cycle.findMany({ where: { teamId: team.id }, orderBy: { number: 'desc' } })
  const progress = await loadProgress('cycleId', cycles.map(cycle => cycle.id))
  const today = startOfTodayUtc()
  response.json(cycles.map(cycle => ({
    ...serializeCycleRef(cycle),
    state: cycleState(cycle, today),
    progress: progress.get(cycle.id),
  })))
})

teamsRouter.post('/', requireAdmin, async (request, response) => {
  const body = readBody(request)
  const team = await prisma.team.create({ data: { key: readTeamKey(body.key), name: readTeamName(body.name) } })
  response.status(201).json({ ...serializeTeam(team, calculateProgress({})), members: [] })
})

teamsRouter.patch('/:key', requireAdmin, async (request, response) => {
  const body = readBody(request)
  const team = await findVisibleTeam(request.user, request.params.key)
  const data = {
    ...('name' in body && { name: readTeamName(body.name) }),
    ...('cycleWeeks' in body && await readCycleChange(team, body)),
  }
  if (!Object.keys(data).length) throw new HttpError(400, 'There is nothing to change.')
  const updated = await prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM "Team" WHERE id = ${team.id} FOR NO KEY UPDATE`
    if (data.cycleWeeks === null) {
      await tx.cycle.deleteMany({ where: { teamId: team.id, startDate: { gt: startOfTodayUtc() } } })
    }
    return tx.team.update({ where: { id: team.id }, data })
  }, { maxWait: 10000, timeout: 20000 })
  const progress = await loadProgress('teamId', [team.id])
  response.json(serializeTeam(updated, progress.get(team.id)))
})

teamsRouter.post('/:key/members', requireAdmin, async (request, response) => {
  const userId = readId(readBody(request).userId, 'User')
  const team = await findVisibleTeam(request.user, request.params.key)
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) throw new HttpError(404, 'User not found.')
  const existing = await prisma.teamMember.findUnique({ where: { teamId_userId: { teamId: team.id, userId } } })
  if (existing) throw new HttpError(409, `${user.name} is already in this team.`)
  await prisma.teamMember.create({ data: { teamId: team.id, userId } })
  response.status(201).json(await loadMembers(team.id))
})

teamsRouter.delete('/:key/members/:userId', requireAdmin, async (request, response) => {
  const team = await findVisibleTeam(request.user, request.params.key)
  const userId = request.params.userId
  const notMember = new HttpError(404, 'That person is not in this team.')
  if (!isId(userId)) throw notMember
  await prisma.$transaction(async tx => {
    const { count } = await tx.teamMember.deleteMany({ where: { teamId: team.id, userId } })
    if (!count) throw notMember
    await tx.savedView.deleteMany({ where: { teamId: team.id, ownerId: userId, owner: { role: 'MEMBER' } } })
  }, { maxWait: 10000, timeout: 20000 })
  response.json(await loadMembers(team.id))
})
