import { useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import PageHeader from '../components/PageHeader.jsx'
import ProgressBar from '../components/ProgressBar.jsx'
import ProjectFormDialog from '../components/ProjectFormDialog.jsx'
import QueryState from '../components/QueryState.jsx'
import { formatDateWithYear, countOf } from '../lib/format.js'
import { useIsAdmin, useProjects } from '../lib/queries.js'

export default function ProjectsPage() {
  const projects = useProjects()
  const teamKey = useSearchParams()[0].get('team')
  const shown = teamKey ? projects.data?.filter(project => project.team.key === teamKey) : projects.data
  const isAdmin = useIsAdmin()
  const [creating, setCreating] = useState(false)

  return (
    <div className="projects-page">
      <PageHeader title="Projects" meta={shown && `${countOf(shown.length, 'project')}${teamKey ? ` in ${teamKey}` : ''}`}>
        {isAdmin && (
          <button type="button" className="button is-primary" onClick={() => setCreating(true)}>
            New project
          </button>
        )}
      </PageHeader>
      {creating && <ProjectFormDialog teamKey={teamKey} onClose={() => setCreating(false)} />}
      <QueryState query={projects} label="projects">
        {() =>
          shown.length === 0 ? (
            <p className="empty-state">{teamKey ? `No projects in ${teamKey} yet.` : 'No projects yet. Admins can create projects.'}</p>
          ) : (
            <ul className="project-rows">
              {shown.map(project => (
                <li key={project.id}>
                  <Link to={`/projects/${project.id}`} className="project-row">
                    <span className="project-row-name">{project.name}</span>
                    <span className="project-row-team">{project.team.key}</span>
                    <span className="project-row-owner muted">{project.owner?.name ?? 'No owner'}</span>
                    <span className="project-row-date muted">
                      {project.targetDate ? formatDateWithYear(project.targetDate) : 'No target date'}
                    </span>
                    <ProgressBar progress={project.progress} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
      </QueryState>
    </div>
  )
}
