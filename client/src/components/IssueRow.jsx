import Avatar from './Avatar.jsx'
import IssueLink from './IssueLink.jsx'
import LabelList from './LabelList.jsx'
import PriorityIcon from './PriorityIcon.jsx'
import StatusIcon from './StatusIcon.jsx'
import { formatShortDate } from '../lib/format.js'
import { priorityLabel, statusLabel } from '../lib/issueOptions.js'

export default function IssueRow({ issue, onMenu }) {
  return (
    <li>
      <IssueLink
        identifier={issue.identifier}
        onContextMenu={event => onMenu(issue, event)}
        className="issue-row"
        data-issue-row
      >
        <StatusIcon status={issue.status} />
        <span className="issue-row-id">{issue.identifier}</span>
        <span className="issue-row-title">{issue.title}</span>
        <span className="visually-hidden">
          , {statusLabel(issue.status)}, {priorityLabel(issue.priority)}
          {issue.assignee && `, assigned to ${issue.assignee.name}`}
          {issue.dueDate && `, due ${formatShortDate(issue.dueDate)}`}
        </span>
        <span className="issue-row-meta">
          <PriorityIcon priority={issue.priority} />
          <LabelList labels={issue.labels} />
          {issue.assignee ? <Avatar name={issue.assignee.name} /> : <span className="avatar is-empty" aria-hidden="true" />}
          <span className="issue-row-date" aria-hidden="true">
            {issue.dueDate && formatShortDate(issue.dueDate)}
          </span>
        </span>
      </IssueLink>
    </li>
  )
}
