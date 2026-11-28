import { formatShortDate } from './format.js'
import { priorityLabel, statusLabel } from './issueOptions.js'

// Plain-language description of one recorded change, shared by an issue's history and a member's activity feed.
const fieldNames = { title: 'title', assignee: 'assignee', project: 'project', cycle: 'cycle', dueDate: 'due date', labels: 'labels', parent: 'parent issue' }
const valueFormatters = { status: statusLabel, priority: priorityLabel, dueDate: formatShortDate }

export function describeChange({ field, fromValue, toValue }, target = 'this') {
  if (field === null) return target === 'this' ? 'created the issue' : `created ${target}`
  const on = target === 'this' ? '' : ` on ${target}`
  if (field === 'description') return `edited the description${on}`
  if (field === 'blockedBy') return toValue ? `marked ${target} as blocked by ${toValue}` : `removed ${fromValue} as a blocker${on}`
  const show = value => (valueFormatters[field] ?? String)(value)
  if (field === 'status' && toValue === 'DONE' && target !== 'this') return `completed ${target}`
  if (field === 'status' || field === 'priority') return `changed ${field}${on} from ${show(fromValue)} to ${show(toValue)}`
  const name = fieldNames[field] ?? field
  if (toValue === null) return `removed the ${name}${on}`
  if (fromValue === null) return `set the ${name}${on} to ${show(toValue)}`
  return `changed the ${name}${on} from ${show(fromValue)} to ${show(toValue)}`
}

// "Today", "Yesterday", or a date, for a local YYYY-MM-DD day.
export function dayHeading(day) {
  const local = date => date.toLocaleDateString('en-CA')
  const now = new Date()
  if (day === local(now)) return 'Today'
  if (day === local(new Date(now.getTime() - 86400000))) return 'Yesterday'
  return new Date(`${day}T00:00:00`).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })
}

export const startOfToday = () => {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
}

// "just now", "3h ago", "2d ago".
export function timeAgo(iso) {
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.round(hours / 24)}d ago`
}
