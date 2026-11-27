import EmptyState from '../components/EmptyState.jsx'
import { Checklist, Folder } from '../components/EmptyPictures.jsx'
import { useCallback } from 'react'
import { Link, useSearchParams } from 'react-router'
import IssueLink from '../components/IssueLink.jsx'
import PriorityIcon from '../components/PriorityIcon.jsx'
import ProgressBar from '../components/ProgressBar.jsx'
import QueryState from '../components/QueryState.jsx'
import StatusIcon from '../components/StatusIcon.jsx'
import { closedStatuses, priorities, priorityLabel, statusLabel } from '../lib/issueOptions.js'
import { formatShortDate } from '../lib/format.js'
import { useIssues, useProjects } from '../lib/queries.js'
import { useShell } from '../lib/shellContext.js'
import './overview.css'

const shownPriorities = 5

const priorityOrder = Object.fromEntries(priorities.map((priority, index) => [
  priority.value, index === 0 ? priorities.length : index,
]))

export default function OverviewPage() {
  const [params, setParams] = useSearchParams()
  const teamView = params.get('scope') === 'team'
  const issues = useIssues(teamView ? {} : { assignee: 'me' })
  const projects = useProjects()
  const { openCreateIssue } = useShell()
  const today = new Date().toLocaleDateString('en-CA')
  const overdue = issue => Boolean(issue.dueDate && issue.dueDate < today)

  const setParam = useCallback((key, value) => {
    setParams(current => {
      const next = new URLSearchParams(current)
      if (value) next.set(key, value)
      else next.delete(key)
      return next
    })
  }, [setParams])


  return (
    <div className="overview">
      <div className="overview-content">
        <header className="overview-header">
          <h1>Overview</h1>
          <div className="segmented" role="group" aria-label="Work scope">
            <button type="button" aria-pressed={!teamView} onClick={() => setParam('scope', null)}>My work</button>
            <button type="button" aria-pressed={teamView} onClick={() => setParam('scope', 'team')}>Team</button>
          </div>
          <button type="button" className="button is-primary" onClick={() => openCreateIssue()}>New issue</button>
        </header>
        <div className="overview-columns">
          <section aria-labelledby="priorities-heading">
            <div className="overview-section-heading">
              <h2 id="priorities-heading">{teamView ? 'Team priorities' : 'My priorities'}</h2>
              {!teamView && <Link to="/my-issues">View all my issues</Link>}
            </div>
            <QueryState query={issues} label="priorities">
              {data => {
                const open = data.filter(issue => !closedStatuses.includes(issue.status))
                const sorted = [...open].sort((a, b) =>
                  Number(overdue(b)) - Number(overdue(a))
                  || priorityOrder[a.priority] - priorityOrder[b.priority]
                  || (a.dueDate ?? '9999').localeCompare(b.dueDate ?? '9999')
                  || a.identifier.localeCompare(b.identifier),
                ).slice(0, shownPriorities)
                const hidden = open.length - sorted.length
                return sorted.length ? (
                  <>
                  <ul className="overview-priorities">
                    {sorted.map(issue => (
                      <li key={issue.id}>
                        <IssueLink identifier={issue.identifier} className="overview-issue">
                          <StatusIcon status={issue.status} />
                          <span className="overview-issue-text">
                            <strong>{issue.title}</strong>
                            <span>
                              <span className={`overview-priority is-${issue.priority}`}>
                                <PriorityIcon priority={issue.priority} /> {priorityLabel(issue.priority)}
                              </span>
                              {' · '}{issue.identifier} · {statusLabel(issue.status)}{issue.project ? ' · ' + issue.project.name : ''}
                            </span>
                          </span>
                          <span className={overdue(issue) ? 'overview-due is-overdue' : issue.dueDate ? 'overview-due' : 'overview-due is-empty'}>
                            {overdue(issue) && 'Overdue · '}{issue.dueDate ? formatShortDate(issue.dueDate) : 'No due date'}
                          </span>
                        </IssueLink>
                      </li>
                    ))}
                  </ul>
                  {hidden > 0 && (
                    <p className="overview-more">
                      {teamView
                        ? `Showing the top ${sorted.length} of ${open.length} open issues.`
                        : <Link to="/my-issues">{`View ${hidden} more open ${hidden === 1 ? 'issue' : 'issues'}`}</Link>}
                    </p>
                  )}
                  </>
                ) : (
                  <EmptyState illustration={Checklist} title="No open priorities" description={teamView ? 'No open issues across your teams.' : 'You have no open assigned issues.'}>
                    <button type="button" className="button is-primary" onClick={() => openCreateIssue()}>New issue</button>
                    {!teamView && <button type="button" className="button" onClick={() => setParam('scope', 'team')}>See team priorities</button>}
                  </EmptyState>
                )
              }}
            </QueryState>
          </section>
          <section aria-labelledby="progress-heading">
            <div className="overview-section-heading">
              <h2 id="progress-heading">Project progress</h2>
              <Link to="/projects">View all</Link>
            </div>
            <QueryState query={projects} label="projects" skeleton="short">
              {data => {
                // Every project with work left, including new ones with no issues yet (the bar says "No issues yet").
                // Only finished projects, where every issue is done or canceled, are left out.
                const active = data.filter(({ progress }) => progress.issueCount === 0 || progress.doneCount < progress.activeCount)
                return active.length ? (
                  <ul className="overview-projects">
                    {active.map(project => (
                      <li key={project.id}>
                        <Link className="overview-project" to={'/projects/' + project.id}>
                          <strong>{project.name}</strong>
                          <span className="overview-project-team">{project.team.name}</span>
                          <ProgressBar progress={project.progress} />
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : <EmptyState illustration={Folder} title="No active projects" description="Projects with work left show their progress here."><Link className="button" to="/projects">Browse projects</Link></EmptyState>
              }}
            </QueryState>
          </section>
        </div>
      </div>
    </div>
  )
}
