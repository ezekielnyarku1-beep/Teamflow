import EmptyState from './EmptyState.jsx'
import { Checklist, Issue, Filter, Cycle, Folder, Layers } from './EmptyPictures.jsx'
import { useCallback, useEffect, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router'
import IssueBoard from './IssueBoard.jsx'
import IssueContextMenu from './IssueContextMenu.jsx'
import IssueFilters from './IssueFilters.jsx'
import IssueList from './IssueList.jsx'
import PageHeader from './PageHeader.jsx'
import QueryState from './QueryState.jsx'
import { countOf } from '../lib/format.js'
import { applyFilter, emptyFilter } from '../lib/issueFilter.js'
import { recall, remember } from '../lib/pageMemory.js'
import { useDeleteIssue, useIssues, useTeams, useUpdateIssue } from '../lib/queries.js'
import { useShell } from '../lib/shellContext.js'

const views = [
  { value: 'list', label: 'List' },
  { value: 'board', label: 'Board' },
]

export default function IssuesView({ title, filters, teamKey, cycleId, summary, initialFilter = emptyFilter, actions }) {
  const [searchParams, setSearchParams] = useSearchParams()
  const location = useLocation()
  const navigate = useNavigate()
  const [filter, setFilter] = useState(() => recall('filter', location.key) ?? initialFilter)
  const [menu, setMenu] = useState(null)
  const { openCreateIssue, showToast } = useShell()
  const issues = useIssues(filters)
  const updateIssue = useUpdateIssue()
  const deleteIssue = useDeleteIssue()
  const menuIssue = menu && issues.data?.find(issue => issue.identifier === menu.identifier)
  const closeMenu = useCallback(() => setMenu(null), [])
  const view = searchParams.get('view') === 'board' ? 'board' : 'list'

  const setParam = useCallback((name, value) => {
    setSearchParams(params => {
      const next = new URLSearchParams(params)
      if (value) next.set(name, value)
      else next.delete(name)
      return next
    })
  }, [setSearchParams])

  useEffect(() => {
    remember('filter', location.key, filter)
  }, [location.key, filter])

  function openMenu(issue, event) {
    event.preventDefault()
    const box = event.currentTarget.getBoundingClientRect()
    setMenu({ identifier: issue.identifier, x: event.clientX || box.left + 16, y: event.clientY || box.bottom })
  }

  function changeIssue(changes, message, close) {
    const { identifier } = menuIssue
    if (close) closeMenu()
    showToast(message)
    updateIssue.mutateAsync({ identifier, changes }).catch(error => showToast(`${identifier} was not changed: ${error.message}`))
  }

  function copyIssue(kind) {
    const { identifier } = menuIssue
    closeMenu()
    navigator.clipboard.writeText(kind === 'id' ? identifier : `${window.location.origin}/issue/${identifier}`).then(
      () => showToast(kind === 'id' ? `Copied ${identifier}` : 'Link copied'),
      () => showToast('Your browser did not allow copying.'),
    )
  }

  function openFromMenu(identifier) {
    closeMenu()
    navigate(`/issue/${identifier}`)
  }

  function removeIssue(identifier) {
    closeMenu()
    deleteIssue.mutateAsync(identifier).then(
      () => showToast(`Deleted ${identifier}`),
      error => showToast(`${identifier} was not deleted: ${error.message}`),
    )
  }

  const teams = useTeams()
  const visible = issues.data ? applyFilter(issues.data, filter) : []
  const meta = issues.data && (visible.length === issues.data.length
    ? countOf(issues.data.length, 'issue')
    : `${visible.length} of ${countOf(issues.data.length, 'issue')}`)

  return (
    <div className="issues-view">
      <div className="issues-view-main">
        <PageHeader title={title} meta={meta}>
          <IssueFilters issues={issues.data ?? []} filter={filter} onChange={setFilter} />
          <div className="segmented" role="group" aria-label="View">
            {views.map(option => (
              <button
                key={option.value}
                type="button"
                aria-pressed={view === option.value}
                onClick={() => setParam('view', option.value === 'list' ? null : option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
          {actions?.(filter)}
        </PageHeader>
        {summary}
        <QueryState query={issues} label="issues">
          {data => {
            if (!data.length && view === 'board') return <IssueBoard issues={data} onMenu={openMenu} />
            if (!data.length) {
              return (
                <EmptyState illustration={filters?.assignee ? Checklist : filters?.project ? Folder : filters?.cycle ? Cycle : initialFilter !== emptyFilter ? Layers : Issue} title="No issues here yet" description="Issues in this list will appear here.">
                  {teams.data?.length > 0 && <button type="button" className="button is-primary" onClick={() => openCreateIssue(teamKey, cycleId)}>
                    Create an issue
                  </button>}
                </EmptyState>
              )
            }
            if (!visible.length) {
              return (
                <EmptyState illustration={Filter} title="No matching issues" description="Clear the filters to see more issues.">
                  <button type="button" className="button" onClick={() => setFilter(emptyFilter)}>
                    Clear filters
                  </button>
                </EmptyState>
              )
            }
            return view === 'board'
              ? <IssueBoard issues={visible} onMenu={openMenu} />
              : <IssueList issues={visible} onMenu={openMenu} />
          }}
        </QueryState>
      </div>
      {menuIssue && (
        <IssueContextMenu
          key={menuIssue.identifier + menu.x + menu.y}
          issue={menuIssue}
          x={menu.x}
          y={menu.y}
          onChange={changeIssue}
          onCopy={copyIssue}
          onOpen={openFromMenu}
          onDelete={removeIssue}
          onClose={closeMenu}
        />
      )}
    </div>
  )
}
