import { useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import IssuesView from '../components/IssuesView.jsx'
import QueryState from '../components/QueryState.jsx'
import ViewFormDialog from '../components/ViewFormDialog.jsx'
import { sameFilter } from '../lib/issueFilter.js'
import { useDeleteView, useSaveView, useView } from '../lib/queries.js'

function ViewActions({ view, filter }) {
  const navigate = useNavigate()
  const save = useSaveView()
  const remove = useDeleteView()
  const [editing, setEditing] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const changed = !sameFilter(filter, view.filter)
  const error = save.error ?? remove.error

  return (
    <>
      {changed && (
        <button
          type="button"
          className="button is-primary"
          disabled={save.isPending}
          onClick={() => save.mutate({ id: view.id, fields: { filter } })}
        >
          {save.isPending ? 'Saving…' : 'Save filters'}
        </button>
      )}
      <button type="button" className="button" onClick={() => setEditing(true)}>
        Edit
      </button>
      <button
        type="button"
        className="button"
        disabled={remove.isPending}
        onBlur={() => setConfirmingDelete(false)}
        onClick={() => (confirmingDelete
          ? remove.mutate(view.id, { onSuccess: () => navigate('/views', { replace: true }) })
          : setConfirmingDelete(true))}
      >
        {confirmingDelete ? 'Confirm delete' : 'Delete'}
      </button>
      {error && <p className="inline-error page-header-error" role="alert">{error.message}</p>}
      {editing && <ViewFormDialog view={view} onClose={() => setEditing(false)} />}
    </>
  )
}

export default function ViewPage() {
  const { viewId } = useParams()
  const view = useView(viewId)

  return (
    <QueryState query={view} label="the view">
      {data => (
        <IssuesView
          key={`${data.id}-${data.team?.key ?? 'all'}`}
          title={data.name}
          filters={data.team ? { team: data.team.key } : {}}
          teamKey={data.team?.key}
          initialFilter={data.filter}
          actions={filter => <ViewActions view={data} filter={filter} />}
        />
      )}
    </QueryState>
  )
}
