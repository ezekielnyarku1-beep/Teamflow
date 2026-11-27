import { useState } from 'react'
import ProgressBar from './ProgressBar.jsx'
import AssistantAnswer from './AssistantAnswer.jsx'
import { reviewBlockers } from '../lib/api.js'
import ProjectFormDialog from './ProjectFormDialog.jsx'
import { formatDateWithYear } from '../lib/format.js'
import { useIsAdmin } from '../lib/queries.js'

export default function ProjectSummary({ project }) {
  const isAdmin = useIsAdmin()
  const [editing, setEditing] = useState(false)
  const [start, target] = [project.startDate, project.targetDate].map(date => (date ? formatDateWithYear(date) : 'Not set'))
  return (
    <section className="project-summary" aria-label="Project details">
      {project.description && <p className="project-summary-description">{project.description}</p>}
      <dl>
        <dt>Team</dt>
        <dd>{project.team.name}</dd>
        <dt>Owner</dt>
        <dd>{project.owner?.name ?? 'No owner'}</dd>
        <dt>Dates</dt>
        <dd>
          {start} → {target}
        </dd>
        <dt>Progress</dt>
        <dd>
          <ProgressBar progress={project.progress} />
        </dd>
      </dl>
      <AssistantAnswer key={project.id} label="What’s blocking this project?"
        scope="AI review of up to 40 recently updated open issues and their recent comments."
        load={() => reviewBlockers(project.id)} />
      {isAdmin && (
        <button type="button" className="button project-summary-edit" onClick={() => setEditing(true)}>
          Edit project
        </button>
      )}
      {editing && <ProjectFormDialog project={project} onClose={() => setEditing(false)} />}
    </section>
  )
}
