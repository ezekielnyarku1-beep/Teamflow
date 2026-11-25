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

export const issueInclude = {
  team: teamSelect,
  assignee: personSelect,
  project: { select: { id: true, name: true } },
  cycle: cycleSelect,
  activities: creationActivity,
  labels: { select: { id: true, name: true, color: true }, orderBy: { name: 'asc' } },
}

export const issueDetailInclude = {
  ...issueInclude,
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
  }
}

export function serializeIssueDetail(issue) {
  return {
    ...serializeIssue(issue),
    comments: issue.comments.map(serializeComment),
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
