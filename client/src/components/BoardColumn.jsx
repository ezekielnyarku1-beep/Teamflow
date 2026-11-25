import { useDroppable } from '@dnd-kit/core'
import BoardCard from './BoardCard.jsx'
import StatusIcon from './StatusIcon.jsx'

export default function BoardColumn({ status, issues, onOpen, onMenu, onStatusChange }) {
  const { setNodeRef, isOver } = useDroppable({ id: status.value })

  return (
    <section ref={setNodeRef} className={`board-column${isOver ? ' is-over' : ''}`} aria-labelledby={`column-${status.value}`}>
      <h2 className="issue-group-heading" id={`column-${status.value}`}>
        <StatusIcon status={status.value} />
        {status.label}
        <span className="muted">{issues.length}</span>
      </h2>
      <ul className="board-cards">
        {issues.map(issue => (
          <BoardCard key={issue.id} issue={issue} onOpen={onOpen} onMenu={onMenu} onStatusChange={onStatusChange} />
        ))}
      </ul>
    </section>
  )
}
