import EmptyState from './EmptyState.jsx'
import { Card } from './EmptyPictures.jsx'
import { useDroppable } from '@dnd-kit/core'
import BoardCard from './BoardCard.jsx'
import StatusIcon from './StatusIcon.jsx'

export default function BoardColumn({ status, issues, onMenu, onStatusChange }) {
  const { setNodeRef, isOver } = useDroppable({ id: status.value })

  return (
    <section ref={setNodeRef} className={`board-column${isOver ? ' is-over' : ''}`} aria-labelledby={`column-${status.value}`}>
      <h2 className="issue-group-heading" id={`column-${status.value}`}>
        <StatusIcon status={status.value} />
        {status.label}
        <span className="muted">{issues.length}</span>
      </h2>
      {issues.length === 0 && <EmptyState illustration={Card} title="No issues" description="Issues with this status appear here." compact />}
      <ul className="board-cards">
        {issues.map(issue => (
          <BoardCard key={issue.id} issue={issue} onMenu={onMenu} onStatusChange={onStatusChange} />
        ))}
      </ul>
    </section>
  )
}
