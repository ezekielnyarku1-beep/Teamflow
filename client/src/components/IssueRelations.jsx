import { useEffect, useId, useState } from 'react'
import { X } from 'lucide-react'
import IssueLink from './IssueLink.jsx'
import StatusIcon from './StatusIcon.jsx'
import { iconProps } from '../lib/icons.js'
import { closedStatuses } from '../lib/issueOptions.js'
import { useBlocker, useCreateIssue, useIssues } from '../lib/queries.js'

function IssueRef({ issue, children }) {
  return (
    <li className="relation-row">
      <StatusIcon status={issue.status} />
      <IssueLink identifier={issue.identifier} className="relation-link" contextActions>
        <span className="relation-id">{issue.identifier}</span>
        <span className="relation-title">{issue.title}</span>
      </IssueLink>
      {children}
    </li>
  )
}

function SubIssues({ issue }) {
  const [title, setTitle] = useState('')
  const createIssue = useCreateIssue()
  const inputId = useId()
  const children = issue.children ?? []

  function submit(event) {
    event.preventDefault()
    const text = title.trim()
    if (!text || createIssue.isPending) return
    createIssue.mutate(
      { teamKey: issue.team.key, title: text, status: 'TODO', parentId: issue.id },
      { onSuccess: () => setTitle('') },
    )
  }

  return (
    <section className="issue-section" aria-labelledby={`sub-issues-${issue.id}`}>
      <h3 id={`sub-issues-${issue.id}`}>
        Sub-issues
        {issue.subIssues && <span className="relation-count">{issue.subIssues.done} of {issue.subIssues.total} done</span>}
      </h3>
      {children.length > 0 && (
        <ul className="relation-list">
          {children.map(child => <IssueRef key={child.id} issue={child} />)}
        </ul>
      )}
      <form className="relation-form" onSubmit={submit}>
        <label htmlFor={inputId} className="visually-hidden">New sub-issue title</label>
        <input id={inputId} className="input" value={title} onChange={event => setTitle(event.target.value)}
          placeholder="Add a sub-issue…" maxLength={200} />
        <button type="submit" className="button" disabled={!title.trim() || createIssue.isPending}>
          {createIssue.isPending ? 'Adding…' : 'Add'}
        </button>
      </form>
      {createIssue.isError && <p className="inline-error" role="alert">The sub-issue was not added: {createIssue.error.message}</p>}
    </section>
  )
}

function BlockerInput({ teamKey, identifier, suggestions, onChange }) {
  const inputId = useId()
  const listId = useId()
  const [expanded, setExpanded] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const term = identifier.trim().toLowerCase()
  const matches = suggestions.filter(item => `${item.identifier} ${item.title}`.toLowerCase().includes(term)).slice(0, 12)
  const open = expanded && matches.length > 0
  const active = open ? Math.min(activeIndex, matches.length - 1) : -1

  useEffect(() => {
    if (active >= 0) document.getElementById(`${listId}-${active}`)?.scrollIntoView({ block: 'nearest' })
  }, [active, listId])

  function close() {
    setExpanded(false)
    setActiveIndex(-1)
  }

  function choose(item) {
    onChange(item.identifier)
    close()
  }

  function handleKey(event) {
    if (event.key === 'Escape' && open) {
      event.preventDefault()
      event.stopPropagation()
      close()
    } else if (event.key === 'Enter' && active >= 0) {
      event.preventDefault()
      choose(matches[active])
    } else if (matches.length && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
      event.preventDefault()
      setExpanded(true)
      if (event.key === 'ArrowDown') setActiveIndex(Math.min(active + 1, matches.length - 1))
      else setActiveIndex(active < 0 ? matches.length - 1 : Math.max(active - 1, 0))
    }
  }

  return (
    <div className="blocker-input">
      <label htmlFor={inputId} className="visually-hidden">Issue ID that blocks this one</label>
      <input id={inputId} className="input" value={identifier}
        role="combobox" aria-autocomplete="list" aria-expanded={open}
        aria-controls={open ? listId : undefined} aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
        placeholder={`Add a blocker, like ${teamKey}-1`} maxLength={30} autoComplete="off"
        onFocus={() => setExpanded(true)} onClick={() => setExpanded(true)} onBlur={close}
        onChange={event => {
          onChange(event.target.value)
          setExpanded(true)
          setActiveIndex(-1)
        }}
        onKeyDown={handleKey}
      />
      {open && (
        <ul id={listId} className="suggestion-panel picker" role="listbox" aria-label="Possible blockers">
          {matches.map((item, index) => (
            <li key={item.id} id={`${listId}-${index}`} role="option" aria-selected={index === active}
              className={index === active ? 'is-active' : undefined}
              onMouseDown={event => event.preventDefault()} onClick={() => choose(item)}
            >
              <StatusIcon status={item.status} />
              <span className="relation-id">{item.identifier}</span>
              <span className="picker-label">{item.title}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function Blockers({ issue }) {
  const [identifier, setIdentifier] = useState('')
  const blocker = useBlocker(issue.identifier)
  const teamIssues = useIssues({ team: issue.team.key })
  const blockedBy = issue.blockedBy ?? []
  const blocking = issue.blocking ?? []
  const taken = new Set([issue.identifier, ...blockedBy.map(item => item.identifier), ...blocking.map(item => item.identifier)])
  const suggestions = (teamIssues.data ?? []).filter(item => !taken.has(item.identifier) && !closedStatuses.includes(item.status))

  function submit(event) {
    event.preventDefault()
    const value = identifier.trim().toUpperCase()
    if (!value || blocker.isPending) return
    blocker.mutate({ blocker: value }, { onSuccess: () => setIdentifier('') })
  }

  return (
    <section className="issue-section" aria-labelledby={`blockers-${issue.id}`}>
      <h3 id={`blockers-${issue.id}`}>Blocked by</h3>
      {blockedBy.length > 0 && (
        <ul className="relation-list">
          {blockedBy.map(item => (
            <IssueRef key={item.id} issue={item}>
              <button type="button" className="icon-button" aria-label={`Remove ${item.identifier} as a blocker`}
                disabled={blocker.isPending} onClick={() => blocker.mutate({ blocker: item.identifier, remove: true })}>
                <X {...iconProps} />
              </button>
            </IssueRef>
          ))}
        </ul>
      )}
      <form className="relation-form" onSubmit={submit}>
        <BlockerInput teamKey={issue.team.key} identifier={identifier} suggestions={suggestions} onChange={setIdentifier} />
        <button type="submit" className="button" disabled={!identifier.trim() || blocker.isPending}>
          {blocker.isPending ? 'Adding…' : 'Add'}
        </button>
      </form>
      {blocker.isError && <p className="inline-error" role="alert">{blocker.error.message}</p>}
      {blocking.length > 0 && (
        <>
          <h4 className="relation-subheading">Blocks</h4>
          <ul className="relation-list">
            {blocking.map(item => <IssueRef key={item.id} issue={item} />)}
          </ul>
        </>
      )}
    </section>
  )
}

export default function IssueRelations({ issue }) {
  return (
    <>
      <SubIssues issue={issue} />
      <Blockers issue={issue} />
    </>
  )
}
