import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'
import { ArrowDown, ArrowUp, Folder as FolderIcon } from 'lucide-react'
import Avatar from '../components/Avatar.jsx'
import EmptyState from '../components/EmptyState.jsx'
import { Folder } from '../components/EmptyPictures.jsx'
import PageHeader from '../components/PageHeader.jsx'
import ProjectActionLink from '../components/ProjectActionLink.jsx'
import ProjectFormDialog from '../components/ProjectFormDialog.jsx'
import QueryState from '../components/QueryState.jsx'
import { formatShortDate } from '../lib/format.js'
import { iconProps } from '../lib/icons.js'
import { useIsAdmin, useProjects } from '../lib/queries.js'
import './projects.css'

const filters = [
  { value: 'all', label: 'All projects', keep: () => true },
  { value: 'active', label: 'In progress', keep: project => project.progress.donePercent < 100 },
  { value: 'done', label: 'Completed', keep: project => project.progress.donePercent === 100 },
]

// Each column's sort value. Empty values (no lead, no date) always sort last.
const columns = [
  { key: 'name', label: 'Project', value: project => project.name.toLowerCase() },
  { key: 'lead', label: 'Lead', value: project => project.owner?.name.toLowerCase() ?? null },
  { key: 'target', label: 'Target date', value: project => project.targetDate ?? null },
  { key: 'progress', label: 'Progress', value: project => project.progress.donePercent },
  { key: 'issues', label: 'Issues', value: project => project.progress.issueCount },
]

const dayMs = 86400000
const todayString = () => new Date().toLocaleDateString('en-CA')
const daysBetween = (from, to) => Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / dayMs)
const plural = (count, word) => `${count} ${count === 1 ? word : `${word}s`}`

function dueNote(targetDate, done) {
  const days = daysBetween(todayString(), targetDate)
  if (days === 0) return { text: 'Due today', overdue: false }
  if (days > 0) return { text: `In ${plural(days, 'day')}`, overdue: false }
  return done ? { text: `${plural(-days, 'day')} ago`, overdue: false } : { text: `Overdue by ${plural(-days, 'day')}`, overdue: true }
}

function sortProjects(list, { key, direction }) {
  const { value } = columns.find(column => column.key === key)
  const sign = direction === 'asc' ? 1 : -1
  return [...list].sort((a, b) => {
    const [x, y] = [value(a), value(b)]
    if (x === y) return a.name.localeCompare(b.name)
    if (x === null) return 1
    if (y === null) return -1
    return (x < y ? -1 : 1) * sign
  })
}

function ProgressCell({ progress, compact = false }) {
  const { donePercent, inProgressPercent } = progress
  return (
    <span className={compact ? 'projects-progress is-compact' : 'projects-progress'}>
      <span className="projects-progress-track" aria-hidden="true">
        {donePercent > 0 && <span className="projects-progress-done" style={{ width: `${donePercent}%` }} />}
        {inProgressPercent > 0 && <span className="projects-progress-active" style={{ width: `${inProgressPercent}%` }} />}
      </span>
      {!compact && <span className="projects-progress-percent">{donePercent}%</span>}
    </span>
  )
}

function ProjectRow({ project, canEdit }) {
  const { progress } = project
  const done = progress.issueCount > 0 && progress.donePercent === 100
  const due = project.targetDate && dueNote(project.targetDate, done)
  const lead = project.owner?.name
  const spoken = [
    lead ? `lead ${lead}` : 'no lead',
    project.targetDate ? `target ${formatShortDate(project.targetDate)}, ${due.text}` : 'no target date',
    `${progress.donePercent}% done`,
    plural(progress.issueCount, 'issue'),
  ].join(', ')

  return (
    <li>
      <ProjectActionLink project={project} canEdit={canEdit} className="projects-row">
        <span className="projects-cell projects-name-cell">
          <span className="projects-tile" aria-hidden="true"><FolderIcon {...iconProps} /></span>
          <span className="projects-name-text">
            <span className="projects-name">{project.name}</span>
            <span className="projects-team">{project.team.name}</span>
            <ProgressCell progress={progress} compact />
          </span>
        </span>
        <span className="visually-hidden">, {spoken}</span>
        <span className="projects-cell projects-lead" aria-hidden="true">
          {lead ? <><Avatar name={lead} /><span className="projects-lead-name">{lead.split(/\s+/)[0]}</span></> : <span className="muted">No lead</span>}
        </span>
        <span className="projects-cell projects-target is-wide" aria-hidden="true">
          {project.targetDate ? (
            <>
              <span className="projects-date">{formatShortDate(project.targetDate)}</span>
              <span className={due.overdue ? 'projects-due is-overdue' : 'projects-due'}>{due.text}</span>
            </>
          ) : <span className="muted">No date</span>}
        </span>
        <span className="projects-cell is-wide" aria-hidden="true"><ProgressCell progress={progress} /></span>
        <span className="projects-cell projects-issues is-wide" aria-hidden="true">{progress.issueCount}</span>
      </ProjectActionLink>
    </li>
  )
}

function SkeletonRows() {
  return (
    <ul className="projects-rows" aria-hidden="true">
      {[0, 1, 2, 3].map(row => (
        <li key={row} className="projects-row is-skeleton">
          <span className="projects-cell projects-name-cell">
            <span className="projects-tile skeleton" />
            <span className="projects-name-text">
              <span className="skeleton skeleton-line" style={{ width: `${60 - row * 8}%` }} />
              <span className="skeleton skeleton-line is-short" />
            </span>
          </span>
          <span className="projects-cell"><span className="skeleton skeleton-line is-short" /></span>
          <span className="projects-cell is-wide"><span className="skeleton skeleton-line is-short" /></span>
          <span className="projects-cell is-wide"><span className="skeleton skeleton-line" /></span>
          <span className="projects-cell is-wide" />
        </li>
      ))}
    </ul>
  )
}

export default function ProjectsPage() {
  const projects = useProjects()
  const teamKey = useSearchParams()[0].get('team')
  const isAdmin = useIsAdmin()
  const [creating, setCreating] = useState(false)
  const [filter, setFilter] = useState('all')
  const [sort, setSort] = useState({ key: 'name', direction: 'asc' })

  const inScope = useMemo(
    () => (teamKey ? projects.data?.filter(project => project.team.key === teamKey) : projects.data),
    [projects.data, teamKey],
  )
  const shown = useMemo(() => {
    if (!inScope) return []
    return sortProjects(inScope.filter(filters.find(option => option.value === filter).keep), sort)
  }, [inScope, filter, sort])

  const changeSort = key =>
    setSort(current => ({ key, direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc' }))

  const newProject = isAdmin && (
    <button type="button" className="button is-primary" onClick={() => setCreating(true)}>New project</button>
  )

  return (
    <div className="projects-page">
      <PageHeader title="Projects" meta={teamKey && `in ${teamKey}`}>
        {inScope?.length !== 0 && newProject}
      </PageHeader>
      {creating && <ProjectFormDialog teamKey={teamKey} onClose={() => setCreating(false)} />}
      {projects.isPending && <SkeletonRows />}
      <QueryState query={projects} label="projects">
        {() =>
          inScope.length === 0 ? (
            <EmptyState illustration={Folder} title={teamKey ? `No projects in ${teamKey} yet` : 'No projects yet'} description="Admins can create projects for their teams.">
              {newProject}
            </EmptyState>
          ) : (
            <>
              <div className="projects-bar">
                <div className="projects-chips" role="group" aria-label="Show">
                  {filters.map(option => (
                    <button key={option.value} type="button" className="projects-chip" aria-pressed={filter === option.value}
                      onClick={() => setFilter(option.value)}>
                      {option.label}
                    </button>
                  ))}
                </div>
                <span className="projects-count" role="status">{shown.length} of {plural(inScope.length, 'project')}</span>
              </div>

              <div className="projects-head projects-row" role="group" aria-label="Sort projects">
                {columns.map(column => {
                  const active = sort.key === column.key
                  const Arrow = sort.direction === 'asc' ? ArrowUp : ArrowDown
                  return (
                    <span key={column.key} className={`projects-cell${['target', 'progress', 'issues'].includes(column.key) ? ' is-wide' : ''}${column.key === 'issues' ? ' projects-issues' : ''}`}>
                      <button type="button" className={active ? 'projects-sort is-active' : 'projects-sort'} onClick={() => changeSort(column.key)}
                        aria-label={`Sort by ${column.label}${active ? `, ${sort.direction === 'asc' ? 'ascending' : 'descending'}` : ''}`}>
                        {column.label}
                        {active && <Arrow size={11} strokeWidth={2} aria-hidden="true" />}
                      </button>
                    </span>
                  )
                })}
              </div>

              {shown.length === 0 ? (
                <p className="projects-none muted">
                  {filter === 'done' ? 'No completed projects yet.' : 'Every project is complete.'}
                </p>
              ) : (
                <ul className="projects-rows">
                  {shown.map(project => <ProjectRow key={project.id} project={project} canEdit={isAdmin} />)}
                </ul>
              )}
            </>
          )}
      </QueryState>
    </div>
  )
}
