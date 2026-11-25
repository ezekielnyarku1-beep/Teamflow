export const statuses = [
  { value: 'BACKLOG', label: 'Backlog' },
  { value: 'TODO', label: 'Todo' },
  { value: 'IN_PROGRESS', label: 'In progress' },
  { value: 'DONE', label: 'Done' },
  { value: 'CANCELED', label: 'Canceled' },
]

export const priorities = [
  { value: 'NO_PRIORITY', label: 'No priority' },
  { value: 'URGENT', label: 'Urgent' },
  { value: 'HIGH', label: 'High' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'LOW', label: 'Low' },
]

export const closedStatuses = ['DONE', 'CANCELED']

export const statusLabel = value => statuses.find(status => status.value === value)?.label ?? value
export const priorityLabel = value => priorities.find(priority => priority.value === value)?.label ?? value
