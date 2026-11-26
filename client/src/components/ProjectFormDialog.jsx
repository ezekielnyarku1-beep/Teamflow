import { useState } from 'react'
import Dialog from './Dialog.jsx'
import QueryState from './QueryState.jsx'
import { useSaveProject, useTeam, useTeams } from '../lib/queries.js'

function OwnerSelect({ teamKey, value, onChange }) {
  const team = useTeam(teamKey)
  return (
    <label>
      Owner
      <select className="input" value={value} onChange={event => onChange(event.target.value)} disabled={!team.data}>
        <option value="">No owner</option>
        {(team.data?.members ?? []).map(member => (
          <option key={member.id} value={member.id}>
            {member.name}
          </option>
        ))}
      </select>
    </label>
  )
}

function ProjectForm({ project, teams, teamKey, onClose }) {
  const save = useSaveProject()
  const [fields, setFields] = useState({
    teamKey: project?.team.key ?? teams.find(team => team.key === teamKey)?.key ?? teams[0].key,
    name: project?.name ?? '',
    description: project?.description ?? '',
    ownerId: project?.owner?.id ?? '',
    startDate: project?.startDate ?? '',
    targetDate: project?.targetDate ?? '',
  })
  const set = name => value => setFields(current => ({ ...current, [name]: value, ...(name === 'teamKey' && { ownerId: '' }) }))

  function submit(event) {
    event.preventDefault()
    if (!fields.name.trim() || save.isPending) return
    const payload = {
      name: fields.name.trim(),
      description: fields.description,
      ownerId: fields.ownerId || null,
      startDate: fields.startDate || null,
      targetDate: fields.targetDate || null,
      ...(!project && { teamKey: fields.teamKey }),
    }
    save.mutate({ id: project?.id, fields: payload }, { onSuccess: onClose })
  }

  return (
    <form className="dialog-form" onSubmit={submit}>
      <h2>{project ? 'Edit project' : 'New project'}</h2>
      <label>
        Name
        <input className="input" value={fields.name} maxLength={80} required data-autofocus onChange={event => set('name')(event.target.value)} />
      </label>
      <div className="dialog-form-row">
        <label>
          Team
          <select className="input" value={fields.teamKey} disabled={Boolean(project)} onChange={event => set('teamKey')(event.target.value)}>
            {teams.map(team => (
              <option key={team.key} value={team.key}>
                {team.name}
              </option>
            ))}
          </select>
        </label>
        <OwnerSelect teamKey={fields.teamKey} value={fields.ownerId} onChange={set('ownerId')} />
      </div>
      <div className="dialog-form-row">
        <label>
          Start date
          <input type="date" className="input" value={fields.startDate} onChange={event => set('startDate')(event.target.value)} />
        </label>
        <label>
          Target date
          <input type="date" className="input" value={fields.targetDate} onChange={event => set('targetDate')(event.target.value)} />
        </label>
      </div>
      <label>
        Description
        <textarea className="input" rows={4} maxLength={5000} value={fields.description} onChange={event => set('description')(event.target.value)} />
      </label>
      {save.isError && (
        <p className="inline-error" role="alert">
          The project was not saved: {save.error.message}
        </p>
      )}
      <div className="dialog-actions">
        <button type="button" className="button" onClick={onClose}>
          Cancel
        </button>
        <button type="submit" className="button is-primary" disabled={!fields.name.trim() || save.isPending}>
          {save.isPending ? 'Saving…' : project ? 'Save project' : 'Create project'}
        </button>
      </div>
    </form>
  )
}

export default function ProjectFormDialog({ project, teamKey, onClose }) {
  const teams = useTeams()
  return (
    <Dialog label={project ? 'Edit project' : 'New project'} className="is-form" onClose={onClose}>
      <QueryState query={teams} label="teams" skeleton="form">
        {data =>
          data.length ? (
            <ProjectForm project={project} teamKey={teamKey} teams={data} onClose={onClose} />
          ) : (
            <p className="empty-state">Create a team first in Settings.</p>
          )}
      </QueryState>
    </Dialog>
  )
}
