import { useCallback, useState } from 'react'
import { useSearchParams } from 'react-router'
import IssueBoard from './IssueBoard.jsx'
import IssueContextMenu from './IssueContextMenu.jsx'
import IssueFilters from './IssueFilters.jsx'
import IssueList from './IssueList.jsx'
import IssuePanel from './IssuePanel.jsx'
import PageHeader from './PageHeader.jsx'
import QueryState from './QueryState.jsx'
import { applyFilter, emptyFilter } from '../lib/issueFilter.js'
import { useDeleteIssue, useIssues, useUpdateIssue } from '../lib/queries.js'
import { useShell } from '../lib/shellContext.js'

const views = [
  { value: 'list', label: 'List' },
  { value: 'board', label: 'Board' },
]

export default function IssuesView({ title, filters, teamKey, cycleId, summary, initialFilter = emptyFilter, actions }) {
  const [searchParams, setSearchParams] = useSearchParams()
  const [filter, setFilter] = useState(initialFilter)
  const [menu, setMenu] = useState(null)
  const { openCreateIssue, showToast } = useShell()
  const issues = useIssues(filters)
  const updateIssue = useUpdateIssue()
  const deleteIssue = useDeleteIssue()
  const menuIssue = menu && issues.data?.find(issue => issue.identifier === menu.identifier)
  const closeMenu = useCallback(() => setMenu(null), [])
  const view = searchParams.get('view') === 'board' ? 'board' : 'list'
  const openIdentifier = searchParams.get('issue')

  const setParam = useCallback((name, value) => {
    setSearchParams(params => {
      const next = new URLSearchParams(params)
      if (value) next.set(name, value)
      else next.delete(name)
      return next
    })
  }, [setSearchParams])

  const openIssue = identifier => setParam('issue', identifier)
  const closePanel = useCallback(() => {
    const row = document.querySelector(`.issues-view a[href="/issue/${CSS.escape(openIdentifier)}"]`)
    setParam('issue', null)
    row?.focus()
  }, [openIdentifier, setParam])

  function openMenu(issue, event) {
    event.preventDefault()
    const box = event.currentTarget.getBoundingClientRect()
    setMenu({ identifier: issue.identifier, x: event.clientX || box.left + 16, y: event.clientY || box.bottom })
  }

  function changeIssue(changes, message, close) {
    const { identifier } = menuIssue
    if (close) closeMenu()
    updateIssue.mutateAsync({ identifier, changes }).then(
      () => showToast(message),
      error => showToast(`${identifier} was not changed: ${error.message}`),
    )
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
    openIssue(identifier)
  }

  function removeIssue(identifier) {
    closeMenu()
    deleteIssue.mutateAsync(identifier).then(
      () => {
        if (openIdentifier === identifier) setParam('issue', null)
        showToast(`Deleted ${identifier}`)
      },
      error => showToast(`${identifier} was not deleted: ${error.message}`),
    )
  }

  const visible = issues.data ? applyFilter(issues.data, filter) : []
  const meta = issues.data && (visible.length === issues.data.length
    ? `${issues.data.length} issues`
    : `${visible.length} of ${issues.data.length} issues`)

  return (
    <div className={`issues-view${openIdentifier ? ' has-panel' : ''}`}>
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
            if (!data.length) {
              return (
                <div className="empty-state">
                  <p>No issues here yet.</p>
                  <button type="button" className="button is-primary" onClick={() => openCreateIssue(teamKey, cycleId)}>
                    Create an issue
                  </button>
                </div>
              )
            }
            if (!visible.length) {
              return (
                <div className="empty-state">
                  <p>No issues match these filters.</p>
                  <button type="button" className="button" onClick={() => setFilter(emptyFilter)}>
                    Clear filters
                  </button>
                </div>
              )
            }
            return view === 'board'
              ? <IssueBoard issues={visible} onOpen={openIssue} onMenu={openMenu} />
              : <IssueList issues={visible} onOpen={openIssue} onMenu={openMenu} />
          }}
        </QueryState>
      </div>
      {openIdentifier && <IssuePanel identifier={openIdentifier} onClose={closePanel} />}
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
