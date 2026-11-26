import { startOfTodayUtc } from './cycles.js'
import { HttpError } from './errors.js'
import { toDateString } from './serializers.js'

export async function createIssue(tx, { teamId, actorId, labelIds = [], ...fields }, include) {
  const team = await tx.team.update({
    where: { id: teamId },
    data: { nextIssueNumber: { increment: 1 } },
  })
  return tx.issue.create({
    data: {
      ...fields,
      teamId,
      number: team.nextIssueNumber - 1,
      labels: { connect: labelIds.map(id => ({ id })) },
      activities: { create: { actorId } },
    },
    include,
  })
}

export async function checkIssueReferences(tx, teamId, { assigneeId, projectId, cycleId, labelIds }) {
  if (assigneeId) {
    const membership = await tx.teamMember.findUnique({ where: { teamId_userId: { teamId, userId: assigneeId } } })
    if (!membership) throw new HttpError(400, 'The assignee must be a member of the team.')
  }
  if (projectId) {
    const project = await tx.project.findFirst({ where: { id: projectId, teamId } })
    if (!project) throw new HttpError(400, 'The project must belong to the same team.')
  }
  if (cycleId) {
    const cycle = await tx.cycle.findFirst({
      where: { id: cycleId, teamId, endDate: { gte: startOfTodayUtc() }, team: { cycleWeeks: { not: null } } },
    })
    if (!cycle) throw new HttpError(400, 'Pick a current or upcoming cycle from the same team, with cycles turned on.')
  }
  if (labelIds?.length) {
    const found = await tx.label.count({ where: { id: { in: labelIds } } })
    if (found !== labelIds.length) throw new HttpError(400, 'One or more labels do not exist.')
  }
}

const joinNames = labels => labels.map(label => label.name).sort().join(', ') || null
const cycleName = cycle => (cycle ? `Cycle ${cycle.number}` : null)

export async function notifyAssignee(tx, { issueId, assigneeId, actorId }) {
  if (assigneeId && assigneeId !== actorId) {
    await tx.notification.create({ data: { userId: assigneeId, actorId, issueId, type: 'ASSIGNED' } })
  }
}

// Comment and status notifications are extras: if they cannot be saved (for example before the database migration
// that adds their types has run), the comment or change itself still goes through and the problem is only logged.
export async function notifyPeople(db, { issueId, actorId, type, userIds }) {
  const recipients = [...new Set(userIds.filter(id => id && id !== actorId))]
  if (!recipients.length) return
  try {
    await db.notification.createMany({ data: recipients.map(userId => ({ userId, actorId, issueId, type })) })
  } catch (error) {
    console.error(`Could not save ${type} notifications:`, error)
  }
}

// Tells the assignee and everyone who commented earlier. Never throws, so a saved comment is never reported as failed.
export async function notifyAboutComment(db, { issueId, commentId, actorId, assigneeId }) {
  try {
    const earlier = await db.comment.findMany({
      where: { issueId, id: { not: commentId } },
      select: { authorId: true },
      distinct: ['authorId'],
    })
    await notifyPeople(db, { issueId, actorId, type: 'COMMENTED', userIds: [assigneeId, ...earlier.map(comment => comment.authorId)] })
  } catch (error) {
    console.error('Could not work out who to tell about a comment:', error)
  }
}

export function describeChanges(before, after) {
  const comparisons = [
    ['title', before.title, after.title],
    ['status', before.status, after.status],
    ['priority', before.priority, after.priority],
    ['assignee', before.assignee?.name ?? null, after.assignee?.name ?? null],
    ['project', before.project?.name ?? null, after.project?.name ?? null],
    ['cycle', cycleName(before.cycle), cycleName(after.cycle)],
    ['dueDate', toDateString(before.dueDate), toDateString(after.dueDate)],
    ['labels', joinNames(before.labels), joinNames(after.labels)],
  ]
  const changes = comparisons
    .filter(([, fromValue, toValue]) => fromValue !== toValue)
    .map(([field, fromValue, toValue]) => ({ field, fromValue, toValue }))
  if (before.description !== after.description) changes.push({ field: 'description', fromValue: null, toValue: null })
  return changes
}
