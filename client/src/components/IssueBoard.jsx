import { DndContext, MouseSensor, useSensor, useSensors } from '@dnd-kit/core'
import BoardColumn from './BoardColumn.jsx'
import { statusLabel, statuses } from '../lib/issueOptions.js'
import { useUpdateIssue } from '../lib/queries.js'

const announcements = {
  onDragStart: ({ active }) => `Picked up ${active.id}.`,
  onDragOver: ({ active, over }) => (over ? `${active.id} is over ${statusLabel(over.id)}.` : `${active.id} is not over a column.`),
  onDragEnd: ({ active, over }) => (over ? `${active.id} moved to ${statusLabel(over.id)}.` : `${active.id} was dropped.`),
  onDragCancel: ({ active }) => `Moving ${active.id} was canceled.`,
}

export default function IssueBoard({ issues, onOpen, onMenu }) {
  const updateIssue = useUpdateIssue()
  const sensors = useSensors(useSensor(MouseSensor, { activationConstraint: { distance: 5 } }))

  function changeStatus(issue, status) {
    if (issue.status !== status) updateIssue.mutate({ identifier: issue.identifier, changes: { status } })
  }

  function dropCard({ active, over }) {
    const issue = issues.find(item => item.identifier === active.id)
    if (issue && over) changeStatus(issue, over.id)
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
              onOpen={onOpen}
              onMenu={onMenu}
              onStatusChange={changeStatus}
            />
          ))}
        </div>
      </DndContext>
    </>
  )
}
