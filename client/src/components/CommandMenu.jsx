import EmptyState from './EmptyState.jsx'
import { Search } from './EmptyPictures.jsx'
import { useEffect, useId, useState } from 'react'
import { useNavigate } from 'react-router'
import Dialog from './Dialog.jsx'
import Skeleton from './Skeleton.jsx'
import { useIssues, useProjects, useTeams } from '../lib/queries.js'
import { useShell } from '../lib/shellContext.js'

export default function CommandMenu({ onClose }) {
  const listId = useId()
  const navigate = useNavigate()
  const { openCreateIssue } = useShell()
  const [text, setText] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const teams = useTeams()
  const projects = useProjects()
  const issues = useIssues()
  const queries = [teams, projects, issues]
  const isLoading = queries.some(query => query.isPending)

  const commands = [
    { id: 'create', group: 'Action', label: 'Create issue', run: () => openCreateIssue() },
    { id: 'my-issues', group: 'Go to', label: 'My issues', run: () => navigate('/my-issues') },
    { id: 'projects', group: 'Go to', label: 'Projects', run: () => navigate('/projects') },
    ...(teams.data ?? []).map(team => ({
      id: `team-${team.key}`, group: 'Team', label: team.name, hint: team.key, run: () => navigate(`/team/${team.key}`),
    })),
    ...(projects.data ?? []).map(project => ({
      id: `project-${project.id}`, group: 'Project', label: project.name, hint: project.team.key, run: () => navigate(`/projects/${project.id}`),
    })),
    ...(issues.data ?? []).map(issue => ({
      id: `issue-${issue.id}`, group: 'Issue', label: issue.title, hint: issue.identifier, run: () => navigate(`/issue/${issue.identifier}`),
    })),
  ]
  const search = text.trim().toLowerCase()
  const matches = commands.filter(command => `${command.label} ${command.hint ?? ''}`.toLowerCase().includes(search)).slice(0, 50)
  const active = Math.min(activeIndex, Math.max(matches.length - 1, 0))

  useEffect(() => {
    document.getElementById(`${listId}-${active}`)?.scrollIntoView({ block: 'nearest' })
  }, [listId, active])

  function run(command) {
    onClose()
    command.run()
  }

  function moveWithKeys(event) {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      if (!matches.length) return
      const step = event.key === 'ArrowDown' ? 1 : -1
      setActiveIndex(Math.min(Math.max(active + step, 0), matches.length - 1))
    } else if (event.key === 'Enter' && matches[active]) {
      event.preventDefault()
      run(matches[active])
    }
  }

  return (
    <Dialog label="Command menu" className="is-command" onClose={onClose}>
      <input
        className="command-input"
        role="combobox"
        aria-label="Search or run a command"
        aria-expanded="true"
        aria-controls={listId}
        aria-activedescendant={matches.length ? `${listId}-${active}` : undefined}
        placeholder="Search teams, projects and issues, or run a command…"
        value={text}
        data-autofocus
        onChange={event => {
          setText(event.target.value)
          setActiveIndex(0)
        }}
        onKeyDown={moveWithKeys}
      />
      <ul id={listId} className="command-list" role="listbox" aria-label="Results">
        {matches.map((command, index) => (
          <li
            key={command.id}
            id={`${listId}-${index}`}
            role="option"
            aria-selected={index === active}
            className={index === active ? 'is-active' : undefined}
            onPointerMove={event => {
              if (event.pointerType === 'mouse') setActiveIndex(index)
            }}
            onClick={() => run(command)}
          >
            <span className="command-label">{command.label}</span>
            {command.hint && <span className="command-hint">{command.hint}</span>}
            <span className="command-group">{command.group}</span>
          </li>
        ))}
      </ul>
      {isLoading && <Skeleton label="search results" layout="menu" />}
      {queries.some(query => query.isError) && (
        <p className="command-note" role="alert">
          Some results could not load.{' '}
          <button
            type="button"
            className="link-button"
            onClick={() => queries.filter(query => query.isError).forEach(query => query.refetch())}
          >
            Try again
          </button>
        </p>
      )}
      {!matches.length && !isLoading && <EmptyState illustration={Search} title="No search results" description="Try a different name or issue identifier." compact />}
    </Dialog>
  )
}
