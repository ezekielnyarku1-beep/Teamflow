import { prisma } from './db.js'
import { IssueStatus } from './generated/prisma/enums.ts'

const dayInMs = 86400000
export const cycleLengths = [1, 2]
export const openStatuses = [IssueStatus.TODO, IssueStatus.IN_PROGRESS]

export const addDays = (date, days) => new Date(date.getTime() + days * dayInMs)

export function startOfTodayUtc() {
  return new Date(`${new Date().toISOString().slice(0, 10)}T00:00:00Z`)
}

export function cycleState(cycle, today) {
  if (cycle.endDate < today) return 'past'
  return cycle.startDate > today ? 'upcoming' : 'current'
}

function plannedCycles(team, last, today) {
  if (last && last.startDate > today) return []
  const length = team.cycleWeeks * 7
  let start = last && addDays(last.endDate, 1) > team.cycleStartDate ? addDays(last.endDate, 1) : team.cycleStartDate
  const periodsBehind = Math.floor((today - start) / (length * dayInMs))
  if (periodsBehind > 0) start = addDays(start, periodsBehind * length)

  const cycles = []
  let number = (last?.number ?? 0) + 1
  do {
    cycles.push({ teamId: team.id, number: number++, startDate: start, endDate: addDays(start, length - 1) })
    start = addDays(start, length)
  } while (cycles.at(-1).startDate <= today)
  return cycles
}

const lastCycle = (db, teamId) => db.cycle.findFirst({ where: { teamId }, orderBy: { number: 'desc' } })
const leftBehindWhere = (teamId, today) => ({ teamId, status: { in: openStatuses }, cycle: { endDate: { lt: today } } })

const currentCycle = (db, teamId, today) =>
  db.cycle.findFirst({ where: { teamId, startDate: { lte: today }, endDate: { gte: today } } })

async function needsSync(team, today) {
  if (plannedCycles(team, await lastCycle(prisma, team.id), today).length) return true
  if (!await currentCycle(prisma, team.id, today)) return false
  return (await prisma.issue.count({ where: leftBehindWhere(team.id, today) })) > 0
}

async function syncTeamCycles(teamId, today) {
  await prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM "Team" WHERE id = ${teamId} FOR NO KEY UPDATE`
    const team = await tx.team.findUnique({ where: { id: teamId } })
    if (!team?.cycleWeeks) return

    const planned = plannedCycles(team, await lastCycle(tx, teamId), today)
    if (planned.length) await tx.cycle.createMany({ data: planned, skipDuplicates: true })

    const current = await currentCycle(tx, teamId, today)
    if (current) await tx.issue.updateMany({ where: leftBehindWhere(teamId, today), data: { cycleId: current.id } })
  }, { maxWait: 10000, timeout: 20000 })
}

export async function syncCycles(teamWhere = {}) {
  const today = startOfTodayUtc()
  const teams = await prisma.team.findMany({ where: { ...teamWhere, cycleWeeks: { not: null } } })
  for (const team of teams) {
    if (await needsSync(team, today)) await syncTeamCycles(team.id, today)
  }
}
