import EmptyState from './EmptyState.jsx'
import { Checklist, Issue, Filter, Cycle, Folder, Layers } from './EmptyPictures.jsx'
import { useCallback, useEffect, useState } from 'react'
import { useLocation, useSearchParams } from 'react-router'
import IssueBoard from './IssueBoard.jsx'
import IssueContextMenu from './IssueContextMenu.jsx'
import IssueFilters from './IssueFilters.jsx'
import IssueList from './IssueList.jsx'
import PageHeader from './PageHeader.jsx'
import QueryState from './QueryState.jsx'
import { Download } from 'lucide-react'
import { csvFileName, downloadCsv, issuesToCsv } from '../lib/csv.js'
import { countOf } from '../lib/format.js'
import { iconProps } from '../lib/icons.js'
import { applyFilter, emptyFilter } from '../lib/issueFilter.js'
import { recall, remember } from '../lib/pageMemory.js'
import { useIssues, useTeams } from '../lib/queries.js'
import { useShell } from '../lib/shellContext.js'
import { useIssueMenu } from '../lib/useIssueMenu.js'

const views = [
  { value: 'list', label: 'List' },
  { value: 'board', label: 'Board' },
]

export default function IssuesView({ title, filters, teamKey, cycleId, summary, initialFilter = emptyFilter, actions }) {
  const [searchParams, setSearchParams] = useSearchParams()
  const location = useLocation()
  const [filter, setFilter] = useState(() => recall('filter', location.key) ?? initialFilter)
  const { openCreateIssue } = useShell()
  const issues = useIssues(filters)
  const { issue: menuIssue, anchor, openIssueMenu, closeIssueMenu } = useIssueMenu(issues.data)
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
          <button type="button" className="button" disabled={!visible.length}
            title={visible.length ? `Download the ${countOf(visible.length, 'issue')} shown as a spreadsheet file` : 'No issues to export'}
            onClick={() => downloadCsv(csvFileName(title), issuesToCsv(visible))}>
            <Download {...iconProps} />
            Export CSV
          </button>
        </PageHeader>
        {summary}
        <QueryState query={issues} label="issues">
          {data => {
            if (!data.length && view === 'board') return <IssueBoard issues={data} onMenu={openIssueMenu} />
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
              ? <IssueBoard issues={visible} onMenu={openIssueMenu} />
              : <IssueList issues={visible} onMenu={openIssueMenu} />
          }}
        </QueryState>
      </div>
      {menuIssue && (
        <IssueContextMenu
          key={`${menuIssue.identifier}-${anchor.x}-${anchor.y}`}
          issue={menuIssue}
          x={anchor.x}
          y={anchor.y}
          trigger={anchor.trigger}
          onClose={closeIssueMenu}
        />
      )}
    </div>
  )
}
