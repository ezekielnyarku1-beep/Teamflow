import IssueRow from './IssueRow.jsx'
import StatusIcon from './StatusIcon.jsx'
import { statuses } from '../lib/issueOptions.js'

function moveFocusWithArrows(event) {
  if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return
  const rows = [...event.currentTarget.querySelectorAll('[data-issue-row]')]
  const index = rows.indexOf(document.activeElement)
  const next = index === -1 ? rows[0] : rows[index + (event.key === 'ArrowDown' ? 1 : -1)]
  if (next) {
    event.preventDefault()
    next.focus()
  }
}

export default function IssueList({ issues, onMenu }) {
  const groups = statuses
    .map(status => ({ ...status, issues: issues.filter(issue => issue.status === status.value) }))
    .filter(group => group.issues.length)

  return (
    <div className="issue-list" onKeyDown={moveFocusWithArrows}>
      {groups.map(group => (
        <section key={group.value} aria-labelledby={`group-${group.value}`}>
          <h2 className="issue-group-heading" id={`group-${group.value}`}>
            <StatusIcon status={group.value} />
            {group.label}
            <span className="muted">{group.issues.length}</span>
          </h2>
          <ul className="issue-rows">
            {group.issues.map(issue => (
              <IssueRow key={issue.id} issue={issue} onMenu={onMenu} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
