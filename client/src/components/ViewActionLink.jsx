import { useState } from 'react'
import { matchPath, useLocation, useNavigate } from 'react-router'
import { Pencil, Trash2 } from 'lucide-react'
import { useDeleteView } from '../lib/queries.js'
import ContextLink from './ContextLink.jsx'
import Dialog from './Dialog.jsx'
import ViewFormDialog from './ViewFormDialog.jsx'

function DeleteViewDialog({ view, onClose }) {
  const remove = useDeleteView()
  const navigate = useNavigate()

  function close() {
    if (!remove.isPending) onClose()
  }

  async function confirm() {
    try {
      await remove.mutateAsync(view.id)
      onClose()
      if (matchPath('/views/:viewId', window.location.pathname)?.params.viewId === view.id) {
        navigate('/views', { replace: true })
      }
    } catch {
      // The mutation error is shown in the dialog.
    }
  }

  return (
    <Dialog label="Delete view" className="is-form" onClose={close}>
      <div className="dialog-form">
        <h2>Delete this view?</h2>
        <p className="muted">This will remove the saved view “{view.name}”. Its issues will still be available.</p>
        {remove.isError && <p className="inline-error" role="alert">{remove.error.message}</p>}
        <div className="dialog-actions">
          <button type="button" className="button" data-autofocus disabled={remove.isPending} onClick={close}>Cancel</button>
          <button type="button" className="button is-danger" disabled={remove.isPending} onClick={confirm}>
            {remove.isPending ? 'Deleting…' : 'Delete view'}
          </button>
        </div>
      </div>
    </Dialog>
  )
}

export default function ViewActionLink({ view, children, ...props }) {
  const locationKey = useLocation().key
  const [dialog, setDialog] = useState(null)
  if (dialog && dialog.locationKey !== locationKey) setDialog(null)
  const actions = [
    { label: 'Edit view', icon: Pencil, run: () => setDialog({ type: 'edit', locationKey }) },
    { label: 'Delete view…', icon: Trash2, danger: true, run: () => setDialog({ type: 'delete', locationKey }) },
  ]
  const close = () => setDialog(null)

  return (
    <>
      <ContextLink to={`/views/${view.id}`} name={view.name} openLabel="Open view" actions={actions} {...props}>
        {children}
      </ContextLink>
      {dialog?.type === 'edit' && <ViewFormDialog view={view} onClose={close} />}
      {dialog?.type === 'delete' && <DeleteViewDialog view={view} onClose={close} />}
    </>
  )
}
