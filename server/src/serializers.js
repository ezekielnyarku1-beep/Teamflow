export const toDateString = date => (date ? date.toISOString().slice(0, 10) : null)

export const personSelect = { select: { id: true, name: true } }
export const teamSelect = { select: { id: true, key: true, name: true } }
export const cycleSelect = { select: { id: true, number: true, startDate: true, endDate: true } }

export const serializeCycleRef = cycle => cycle && ({
  id: cycle.id,
  number: cycle.number,
  startDate: toDateString(cycle.startDate),
  endDate: toDateString(cycle.endDate),
})

export const creationActivity = { where: { field: null }, orderBy: { createdAt: 'asc' }, take: 1, select: { actorId: true, field: true } }

const closedStatuses = ['DONE']
const issueRefSelect = { id: true, number: true, title: true, status: true, team: { select: { key: true } } }
const serializeIssueRef = issue => ({ id: issue.id, identifier: `${issue.team.key}-${issue.number}`, title: issue.title, status: issue.status })

export const issueInclude = {
  team: teamSelect,
  assignee: personSelect,
  project: { select: { id: true, name: true } },
  cycle: cycleSelect,
  activities: creationActivity,
  labels: { select: { id: true, name: true, color: true }, orderBy: { name: 'asc' } },
  parent: { select: issueRefSelect },
  children: { select: { status: true } },
  blockedBy: { select: { blocker: { select: { status: true } } } },
}

export const issueDetailInclude = {
  ...issueInclude,
  children: { select: issueRefSelect, orderBy: { number: 'asc' } },
  blockedBy: { select: { blocker: { select: issueRefSelect } }, orderBy: { createdAt: 'asc' } },
  blocking: { select: { blocked: { select: issueRefSelect } }, orderBy: { createdAt: 'asc' } },
  comments: { include: { author: personSelect }, orderBy: { createdAt: 'asc' } },
  activities: { include: { actor: personSelect }, orderBy: { createdAt: 'asc' } },
}

export function serializeUser(user) {
  return { id: user.id, name: user.name, email: user.email, role: user.role }
}

export function serializeIssue(issue) {
  return {
    id: issue.id,
    identifier: `${issue.team.key}-${issue.number}`,
    number: issue.number,
    title: issue.title,
    description: issue.description,
    status: issue.status,
    priority: issue.priority,
    dueDate: toDateString(issue.dueDate),
    createdAt: issue.createdAt,
    updatedAt: issue.updatedAt,
    team: issue.team,
    assignee: issue.assignee,
    project: issue.project,
    cycle: serializeCycleRef(issue.cycle),
    creatorId: issue.activities.find(activity => activity.field === null)?.actorId ?? null,
    labels: issue.labels,
    parent: issue.parent ? serializeIssueRef(issue.parent) : null,
    subIssues: countSubIssues(issue.children),
    blocked: Boolean(issue.blockedBy?.some(({ blocker }) => !closedStatuses.includes(blocker.status))),
  }
}

// "3 of 5 done" for an issue's sub-issues.
function countSubIssues(children = []) {
  return children.length ? { total: children.length, done: children.filter(child => child.status === 'DONE').length } : null
}

export function serializeIssueDetail(issue) {
  return {
    ...serializeIssue(issue),
    comments: issue.comments.map(serializeComment),
    children: issue.children.map(serializeIssueRef),
    blockedBy: issue.blockedBy.map(({ blocker }) => serializeIssueRef(blocker)),
    blocking: issue.blocking.map(({ blocked }) => serializeIssueRef(blocked)),
    activity: issue.activities.map(activity => ({
      id: activity.id,
      field: activity.field,
      fromValue: activity.fromValue,
      toValue: activity.toValue,
      createdAt: activity.createdAt,
      actor: activity.actor,
    })),
  }
}

export function serializeComment(comment) {
  return { id: comment.id, body: comment.body, createdAt: comment.createdAt, author: comment.author }
}

export function serializeProject(project, progress) {
  return {
    id: project.id,
    name: project.name,
    description: project.description,
    startDate: toDateString(project.startDate),
    targetDate: toDateString(project.targetDate),
    team: project.team,
    owner: project.owner,
    progress,
  }
}
