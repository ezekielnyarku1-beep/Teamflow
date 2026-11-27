import FieldPicker from './FieldPicker.jsx'
import { useState } from 'react'
import { useNavigate } from 'react-router'
import Dialog from './Dialog.jsx'
import { useSaveView, useTeams } from '../lib/queries.js'

export default function ViewFormDialog({ view, teamKey = '', filter, onClose }) {
  const navigate = useNavigate()
  const teams = useTeams()
  const save = useSaveView()
  const [name, setName] = useState(view?.name ?? '')
  const [scope, setScope] = useState(view ? view.team?.key ?? '' : teamKey)
  const title = view ? 'Edit view' : 'Save view'

  function submit(event) {
    event.preventDefault()
    if (!name.trim() || save.isPending) return
    const narrowedToTeam = view && scope && scope !== view.team?.key
    const fields = {
      name: name.trim(),
      teamKey: scope || null,
      ...(!view && { filter }),
      ...(narrowedToTeam && { filter: { ...view.filter, assigneeIds: [] } }),
    }
    save.mutate({ id: view?.id, fields }, {
      onSuccess: saved => {
        onClose()
        if (!view) navigate(`/views/${saved.id}`)
      },
    })
  }

  return (
    <Dialog label={title} className="is-form" onClose={onClose}>
      <form className="dialog-form" onSubmit={submit}>
        <h2>{title}</h2>
        <label>
          Name
          <input className="input" value={name} maxLength={60} required data-autofocus onChange={event => setName(event.target.value)} />
        </label>
        <label>
          Issues from
          <FieldPicker label="Scope" className="input" value={scope} onChange={event => setScope(event.target.value)}>
            <option value="">All my teams</option>
            {(teams.data ?? []).map(team => (
              <option key={team.key} value={team.key}>
                {team.name}
              </option>
            ))}
          </FieldPicker>
        </label>
        {!view && <p className="muted">The filters you have chosen are saved with the view. Only you can see it.</p>}
        {save.isError && (
          <p className="inline-error" role="alert">
            The view was not saved: {save.error.message}
          </p>
        )}
        <div className="dialog-actions">
          <button type="button" className="button" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="button is-primary" disabled={!name.trim() || save.isPending}>
            {save.isPending ? 'Saving…' : view ? 'Save' : 'Save view'}
          </button>
        </div>
      </form>
    </Dialog>
  )
}
