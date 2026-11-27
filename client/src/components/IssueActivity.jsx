import EmptyState from './EmptyState.jsx'
import { Activity } from './EmptyPictures.jsx'
import Skeleton from './Skeleton.jsx'
import { formatDateTime, formatShortDate } from '../lib/format.js'
import { priorityLabel, statusLabel } from '../lib/issueOptions.js'

const fieldNames = { title: 'title', assignee: 'assignee', project: 'project', cycle: 'cycle', dueDate: 'due date', labels: 'labels' }
const valueFormatters = { status: statusLabel, priority: priorityLabel, dueDate: formatShortDate }

function describe({ field, fromValue, toValue }) {
  if (field === null) return 'created the issue'
  if (field === 'description') return 'edited the description'
  const show = value => (valueFormatters[field] ?? String)(value)
  if (field === 'status' || field === 'priority') return `changed ${field} from ${show(fromValue)} to ${show(toValue)}`
  const name = fieldNames[field]
  if (toValue === null) return `removed the ${name}`
  if (fromValue === null) return `set the ${name} to ${show(toValue)}`
  return `changed the ${name} from ${show(fromValue)} to ${show(toValue)}`
}

export default function IssueActivity({ issue }) {
  return (
    <section className="issue-section" aria-labelledby={`activity-${issue.id}`}>
      <h3 id={`activity-${issue.id}`}>Activity</h3>
      {!issue.activity && <Skeleton label="activity" layout="short" />}
      {issue.activity?.length === 0 && <EmptyState illustration={Activity} title="No activity yet" description="Changes to this issue appear here." compact />}
      <ol className="activity-list">
        {issue.activity?.map(entry => (
          <li key={entry.id}>
            <span className="activity-actor">{entry.actor.name}</span> {describe(entry)}
            <time className="muted" dateTime={entry.createdAt}>
              {' · '}
              {formatDateTime(entry.createdAt)}
            </time>
          </li>
        ))}
      </ol>
    </section>
  )
}
