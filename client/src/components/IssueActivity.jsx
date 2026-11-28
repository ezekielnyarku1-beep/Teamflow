import EmptyState from './EmptyState.jsx'
import { Activity } from './EmptyPictures.jsx'
import { formatDateTime } from '../lib/format.js'
import { describeChange } from '../lib/activityText.js'

export default function IssueActivity({ issue }) {
  return (
    <section className="issue-section" aria-labelledby={`activity-${issue.id}`}>
      <h3 id={`activity-${issue.id}`}>Activity</h3>
      {issue.activity?.length === 0 && <EmptyState illustration={Activity} title="No activity yet" description="Changes to this issue appear here." compact />}
      <ol className="activity-list">
        {issue.activity?.map(entry => (
          <li key={entry.id}>
            <span className="activity-actor">{entry.actor.name}</span> {describeChange(entry)}
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
