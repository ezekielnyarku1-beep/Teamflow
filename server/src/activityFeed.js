import { prisma } from './db.js'
import { HttpError } from './errors.js'

// Everything a member does inside the app, read from what is already recorded:
// issue activity (create and every field change) plus comments.

const issueRefSelect = { select: { id: true, number: true, title: true, status: true, team: { select: { key: true } } } }
const issueRef = issue => ({ identifier: `${issue.team.key}-${issue.number}`, title: issue.title, status: issue.status })
const excerpt = text => (text.length > 140 ? `${text.slice(0, 140)}…` : text)

const dayMs = 86400000
export const maxFeedDays = 30

// Reads an ISO time the browser sends for "start of today" in the viewer's timezone. Falls back to UTC midnight.
export function readSince(value, fallback) {
  if (value === undefined) return fallback
  const date = new Date(String(value))
  if (Number.isNaN(date.getTime())) throw new HttpError(400, 'Start time must be a date.')
  return date
}

export async function loadFeed({ userId, teamWhere, since, limit = 500 }) {
  const issue = { team: teamWhere }
  const [activities, comments] = await Promise.all([
    prisma.issueActivity.findMany({
      where: { actorId: userId, createdAt: { gte: since }, issue },
      include: { issue: issueRefSelect },
      orderBy: { createdAt: 'desc' },
      take: limit,
    }),
    prisma.comment.findMany({
      where: { authorId: userId, createdAt: { gte: since }, issue },
      include: { issue: issueRefSelect },
      orderBy: { createdAt: 'desc' },
      take: limit,
    }),
  ])
  return [
    ...activities.map(entry => ({
      id: entry.id,
      kind: entry.field === null ? 'created' : 'changed',
      at: entry.createdAt.toISOString(),
      field: entry.field,
      fromValue: entry.fromValue,
      toValue: entry.toValue,
      issue: issueRef(entry.issue),
    })),
    ...comments.map(comment => ({
      id: comment.id,
      kind: 'commented',
      at: comment.createdAt.toISOString(),
      body: excerpt(comment.body),
      issue: issueRef(comment.issue),
    })),
  ].sort((a, b) => b.at.localeCompare(a.at)).slice(0, limit)
}

export const daysAgo = (days, from = new Date()) => new Date(from.getTime() - days * dayMs)

// Counts for one member: everything they did, and how many issues they moved to Done.
export function summarize(events, todayStart) {
  const today = todayStart.toISOString()
  return {
    actionsToday: events.filter(event => event.at >= today).length,
    actionsThisWeek: events.length,
    createdThisWeek: events.filter(event => event.kind === 'created').length,
    doneThisWeek: events.filter(event => event.field === 'status' && event.toValue === 'DONE').length,
    commentsThisWeek: events.filter(event => event.kind === 'commented').length,
  }
}
