import EmptyState from '../../components/EmptyState.jsx'
import { Tag } from '../../components/EmptyPictures.jsx'
import { useState } from 'react'
import LabelSettingsRow from '../../components/LabelSettingsRow.jsx'
import QueryState from '../../components/QueryState.jsx'
import { useCreateLabel, useLabels } from '../../lib/queries.js'

const startingColor = '#6b7385'

export default function LabelsSettingsPage() {
  const labels = useLabels()
  const createLabel = useCreateLabel()
  const [name, setName] = useState('')
  const [color, setColor] = useState(startingColor)

  function submit(event) {
    event.preventDefault()
    if (!name.trim()) return
    createLabel.mutate({ name: name.trim(), color }, {
      onSuccess: () => {
        setName('')
        setColor(startingColor)
      },
    })
  }

  return (
    <>
      <h1>Labels</h1>
      <section className="settings-section" aria-labelledby="new-label-heading">
        <h2 id="new-label-heading">New label</h2>
        <form className="settings-card settings-form" onSubmit={submit}>
          <div className="settings-row settings-pair">
            <div className="settings-row-main">
              <strong>Label details</strong>
              <span className="settings-description">Labels are shared by every team.</span>
            </div>
            <div className="settings-inline">
              <label htmlFor="new-label-color" className="visually-hidden">
                Color of the new label
              </label>
              <input id="new-label-color" type="color" className="color-input" value={color} onChange={event => setColor(event.target.value)} />
              <label htmlFor="new-label-name" className="visually-hidden">
                Name of the new label
              </label>
              <input
                id="new-label-name"
                className="input settings-grow"
                value={name}
                maxLength={40}
                placeholder="New label name"
                onChange={event => setName(event.target.value)}
              />
              <button type="submit" className="button is-primary" disabled={!name.trim() || createLabel.isPending}>
                {createLabel.isPending ? 'Creating…' : 'Create label'}
              </button>
            </div>
          </div>
          {createLabel.isError && <p className="settings-feedback inline-error" role="alert">{createLabel.error.message}</p>}
        </form>
      </section>
      <section className="settings-section" aria-labelledby="labels-heading">
        <h2 id="labels-heading">Workspace labels</h2>
        <QueryState query={labels} label="labels">
          {data =>
            data.length === 0 ? (
              <EmptyState illustration={Tag} title="No labels yet" description="Use labels to organize issues across teams." />
            ) : (
              <ul className="settings-card settings-list">
                {data.map(label => (
                  <LabelSettingsRow key={`${label.id}-${label.name}-${label.color}`} label={label} />
                ))}
              </ul>
            )}
        </QueryState>
      </section>
    </>
  )
}
