import { useDraggable } from '@dnd-kit/core'
import Avatar from './Avatar.jsx'
import IssueLink from './IssueLink.jsx'
import IssueMarkers from './IssueMarkers.jsx'
import LabelList from './LabelList.jsx'
import PriorityIcon from './PriorityIcon.jsx'
import StatusPicker from './StatusPicker.jsx'
import { formatShortDate } from '../lib/format.js'
import { isOverdue, priorityLabel } from '../lib/issueOptions.js'

export default function BoardCard({ issue, onMenu, onStatusChange }) {
  const { setNodeRef, listeners, transform, isDragging } = useDraggable({ id: issue.identifier })
  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined

  return (
    <li ref={setNodeRef} style={style} className={`board-card${isDragging ? ' is-dragging' : ''}`}
      onContextMenu={event => onMenu(issue, event)}
      {...listeners}
    >
      <div className="board-card-top">
        <span className="issue-row-id">{issue.identifier}</span>
        <PriorityIcon priority={issue.priority} />
        <span className="visually-hidden">{priorityLabel(issue.priority)}</span>
      </div>
      <IssueLink identifier={issue.identifier} className="board-card-title">
        {issue.title}
      </IssueLink>
      <div className="board-card-bottom">
        <StatusPicker issue={issue} onChange={status => onStatusChange(issue, status)} />
        <IssueMarkers issue={issue} />
        <LabelList labels={issue.labels} />
        {issue.dueDate && (
          <span className={isOverdue(issue) ? 'issue-row-date is-overdue' : 'issue-row-date'}>
            {isOverdue(issue) && 'Overdue · '}{formatShortDate(issue.dueDate)}
          </span>
        )}
        {issue.assignee && <Avatar name={issue.assignee.name} />}
      </div>
    </li>
  )
}
