import FieldPicker from './FieldPicker.jsx'
import EmptyState from './EmptyState.jsx'
import { People } from './EmptyPictures.jsx'
import { useState } from 'react'
import Dialog from './Dialog.jsx'
import PriorityIcon from './PriorityIcon.jsx'
import StatusIcon from './StatusIcon.jsx'
import QueryState from './QueryState.jsx'
import { priorities, statuses } from '../lib/issueOptions.js'
import { useCreateIssue, useTeams } from '../lib/queries.js'

function CreateIssueForm({ teams, defaultTeamKey, cycleId, onClose }) {
  const createIssue = useCreateIssue()
  const [fields, setFields] = useState({
    teamKey: teams.some(team => team.key === defaultTeamKey) ? defaultTeamKey : teams[0].key,
    title: '',
    description: '',
    status: 'TODO',
    priority: 'NO_PRIORITY',
  })
  const set = name => event => setFields(current => ({ ...current, [name]: event.target.value }))

  function submit(event) {
    event.preventDefault()
    if (!fields.title.trim() || createIssue.isPending) return
    const inCycle = cycleId && fields.teamKey === defaultTeamKey
    createIssue.mutate({ ...fields, ...(inCycle && { cycleId }) }, { onSuccess: onClose })
  }

  return (
    <form className="dialog-form" onSubmit={submit}>
      <h2>New issue</h2>
      <div className="dialog-form-row">
        <label>
          Team
          <FieldPicker label="Team" className="input" value={fields.teamKey} onChange={set('teamKey')}>
            {teams.map(team => (
              <option key={team.key} value={team.key}>
                {team.name}
              </option>
            ))}
          </FieldPicker>
        </label>
        <label>
          <span className="issue-field-label"><StatusIcon status={fields.status} />Status</span>
          <FieldPicker label="Status" className="input" value={fields.status} onChange={set('status')}>
            {statuses.map(status => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </FieldPicker>
        </label>
        <label>
          <span className="issue-field-label"><PriorityIcon priority={fields.priority} />Priority</span>
          <FieldPicker label="Priority" className="input" value={fields.priority} onChange={set('priority')}>
            {priorities.map(priority => (
              <option key={priority.value} value={priority.value}>
                {priority.label}
              </option>
            ))}
          </FieldPicker>
        </label>
      </div>
      <label>
        Title
        <input className="input" value={fields.title} onChange={set('title')} maxLength={200} required autoFocus data-autofocus />
      </label>
      <label>
        Description
        <textarea className="input" rows={4} maxLength={10000} value={fields.description} onChange={set('description')} />
      </label>
      {createIssue.isError && (
        <p className="inline-error" role="alert">
          The issue was not created: {createIssue.error.message}
        </p>
      )}
      <div className="dialog-actions">
        <button type="button" className="button" onClick={onClose}>
          Cancel
        </button>
        <button type="submit" className="button is-primary" disabled={!fields.title.trim() || createIssue.isPending}>
          {createIssue.isPending ? 'Creating…' : 'Create issue'}
        </button>
      </div>
    </form>
  )
}

export default function CreateIssueDialog({ defaultTeamKey, cycleId, onClose }) {
  const teams = useTeams()
  return (
    <Dialog label="New issue" className="is-form" onClose={onClose}>
      <QueryState query={teams} label="teams" skeleton="form">
        {data =>
          data.length ? (
            <CreateIssueForm teams={data} defaultTeamKey={defaultTeamKey} cycleId={cycleId} onClose={onClose} />
          ) : (
            <EmptyState illustration={People} title="No teams available" description="Join a team before creating an issue." />
          )}
      </QueryState>
    </Dialog>
  )
}
