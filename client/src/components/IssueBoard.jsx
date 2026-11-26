import { DndContext, MouseSensor, TouchSensor, useSensor, useSensors } from '@dnd-kit/core'
import BoardColumn from './BoardColumn.jsx'
import { statusLabel, statuses } from '../lib/issueOptions.js'
import { useUpdateIssue } from '../lib/queries.js'

const announcements = {
  onDragStart: ({ active }) => `Picked up ${active.id}.`,
  onDragOver: ({ active, over }) => (over ? `${active.id} is over ${statusLabel(over.id)}.` : `${active.id} is not over a column.`),
  onDragEnd: ({ active, over }) => (over ? `${active.id} moved to ${statusLabel(over.id)}.` : `${active.id} was dropped.`),
  onDragCancel: ({ active }) => `Moving ${active.id} was canceled.`,
}

export default function IssueBoard({ issues, onMenu }) {
  const updateIssue = useUpdateIssue()
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    // Press and hold to pick a card up on touch screens, so a quick swipe still scrolls the board.
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 8 } }),
  )

  function changeStatus(issue, status) {
    if (issue.status !== status) updateIssue.mutate({ identifier: issue.identifier, changes: { status } })
  }

  // On touch screens a long press picks the card up, which stops the browser's own long-press menu. So a long press
  // that ends without moving opens the issue menu instead, at the finger's position.
  function openMenuFromTouch(issue, touchEvent) {
    const card = touchEvent.target instanceof Element ? touchEvent.target.closest('.board-card') : null
    const touch = touchEvent.changedTouches?.[0] ?? touchEvent.touches?.[0]
    if (!card || !touch) return
    onMenu(issue, { preventDefault() {}, currentTarget: card, clientX: touch.clientX, clientY: touch.clientY })
  }

  function dropCard({ active, over, activatorEvent, delta }) {
    const issue = issues.find(item => item.identifier === active.id)
    if (!issue) return
    const heldStill = Math.abs(delta.x) < 8 && Math.abs(delta.y) < 8
    if (activatorEvent?.type === 'touchstart' && heldStill) {
      openMenuFromTouch(issue, activatorEvent)
      return
    }
    if (over) changeStatus(issue, over.id)
  }

  return (
    <>
      {updateIssue.isError && (
        <p className="inline-error" role="alert">
          The change was not saved: {updateIssue.error.message}
        </p>
      )}
      <DndContext sensors={sensors} onDragEnd={dropCard} accessibility={{ announcements }}>
        <div className="board">
          {statuses.map(status => (
            <BoardColumn
              key={status.value}
              status={status}
              issues={issues.filter(issue => issue.status === status.value)}
              onMenu={onMenu}
              onStatusChange={changeStatus}
            />
          ))}
        </div>
      </DndContext>
    </>
  )
}
