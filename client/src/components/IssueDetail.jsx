import { useLayoutEffect, useRef, useState } from 'react'
import IssueActivity from './IssueActivity.jsx'
import IssueComments from './IssueComments.jsx'
import IssueProperties from './IssueProperties.jsx'
import QueryState from './QueryState.jsx'
import { useIssue, useUpdateIssue } from '../lib/queries.js'

const trimTitle = value => value.trim()
const titleChanges = value => (value.trim() ? { title: value.trim() } : null)
const descriptionChanges = value => ({ description: value })
const trimDescription = value => value.replace(/^(?:[ \t]*\r?\n)+/, '').trimEnd()

function useDraft(savedValue, normalize, toChanges, saveAsync) {
  const [draft, setDraft] = useState(null)

  const fresh = () => ({ original: savedValue, value: savedValue, focused: false, failed: false })

  function send(value, before) {
    const changes = toChanges(value)
    if (!changes) return setDraft(null)
    setDraft(current => ({ ...current, original: value, value, failed: false }))
    saveAsync(changes).then(
      () => setDraft(current => (current && !current.focused && current.value === value ? null : current)),
      () => setDraft(current => current && { ...current, original: before, failed: true }),
    )
  }

  return {
    failed: Boolean(draft?.failed),
    retry: () => send(draft.value, draft.original),
    discard: () => setDraft(null),
    field: {
      value: draft ? draft.value : savedValue,
      onFocus: () => setDraft(current => ({ ...(current ?? fresh()), focused: true })),
      onChange: event => setDraft({ ...(draft ?? fresh()), value: event.target.value }),
      onBlur: () => {
        if (!draft) return
        if (draft.failed) return setDraft({ ...draft, focused: false })
        if (normalize(draft.value) === normalize(draft.original)) return setDraft(null)
        setDraft({ ...draft, focused: false })
        send(draft.value, draft.original)
      },
    },
  }
}

// A one-line title box that wraps and grows, so long titles stay readable on phones instead of being cut off.
// Enter still saves (by leaving the field) and line breaks are never added to the title.
function TitleField({ id, field }) {
  const ref = useRef(null)

  useLayoutEffect(() => {
    const box = ref.current
    const fit = () => {
      box.style.height = 'auto'
      box.style.height = `${box.scrollHeight}px`
    }
    fit()
    window.addEventListener('resize', fit)
    return () => window.removeEventListener('resize', fit)
  }, [field.value])

  return (
    <textarea
      ref={ref}
      id={id}
      className="issue-title-input"
      rows={1}
      maxLength={200}
      {...field}
      onChange={event => {
        event.target.value = event.target.value.replace(/[\r\n]+/g, ' ')
        field.onChange(event)
      }}
      onKeyDown={event => {
        if (event.key === 'Enter') {
          event.preventDefault()
          event.currentTarget.blur()
        }
      }}
    />
  )
}

function NotSaved({ draft, label }) {
  if (!draft.failed) return null
  return (
    <p className="inline-error" role="alert">
      Your {label} was not saved.{' '}
      <button type="button" className="link-button" onClick={draft.retry}>
        Try again
      </button>{' '}
      <button type="button" className="link-button" onClick={draft.discard}>
        Discard
      </button>
    </p>
  )
}

function IssueEditor({ issue }) {
  const updateProperties = useUpdateIssue()
  const updateText = useUpdateIssue()
  const save = changes => updateProperties.mutate({ identifier: issue.identifier, changes })
  const saveText = changes => updateText.mutateAsync({ identifier: issue.identifier, changes })
  const title = useDraft(issue.title, trimTitle, titleChanges, saveText)
  const description = useDraft(issue.description, trimDescription, descriptionChanges, saveText)

  return (
    <article className="issue-detail">
      <h1 className="issue-detail-id">
        {issue.identifier} <span className="muted">in {issue.team.name}</span>
      </h1>
      {updateProperties.isError && (
        <p className="inline-error" role="alert">
          The change was not saved: {updateProperties.error.message}
        </p>
      )}
      <label htmlFor={`title-${issue.id}`} className="visually-hidden">
        Title
      </label>
      <TitleField id={`title-${issue.id}`} field={title.field} />
      <NotSaved draft={title} label="title" />
      <label htmlFor={`description-${issue.id}`} className="visually-hidden">
        Description
      </label>
      <textarea
        id={`description-${issue.id}`}
        className="issue-description-input"
        placeholder="Add a description…"
        rows={4}
        maxLength={10000}
        {...description.field}
      />
      <NotSaved draft={description} label="description" />
      <IssueProperties issue={issue} onSave={save} />
      <IssueComments issue={issue} />
      <IssueActivity issue={issue} />
    </article>
  )
}

export default function IssueDetail({ identifier }) {
  const issue = useIssue(identifier)
  return (
    <QueryState query={issue} label="the issue" skeleton="detail">
      {data => <IssueEditor key={data.id} issue={data} />}
    </QueryState>
  )
}
