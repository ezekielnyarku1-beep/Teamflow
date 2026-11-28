export const statuses = [
  { value: 'TODO', label: 'Todo' },
  { value: 'IN_PROGRESS', label: 'In progress' },
  { value: 'DONE', label: 'Done' },
]

export const priorities = [
  { value: 'NO_PRIORITY', label: 'No priority' },
  { value: 'URGENT', label: 'Urgent' },
  { value: 'HIGH', label: 'High' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'LOW', label: 'Low' },
]

export const closedStatuses = ['DONE']

// Past its due date and not finished yet. Dates are compared as YYYY-MM-DD strings in local time.
export const isOverdue = issue =>
  Boolean(issue.dueDate && issue.status !== 'DONE' && issue.dueDate < new Date().toLocaleDateString('en-CA'))

// Statuses that were removed still appear in older issue history, so they keep a readable name.
const removedStatusLabels = { BACKLOG: 'Backlog', CANCELED: 'Canceled' }
export const statusLabel = value => statuses.find(status => status.value === value)?.label ?? removedStatusLabels[value] ?? value
export const priorityLabel = value => priorities.find(priority => priority.value === value)?.label ?? value
