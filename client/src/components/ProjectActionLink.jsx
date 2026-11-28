import { useState } from 'react'
import { Pencil } from 'lucide-react'
import ContextLink from './ContextLink.jsx'
import ProjectFormDialog from './ProjectFormDialog.jsx'

export default function ProjectActionLink({ project, canEdit, children, ...props }) {
  const [editing, setEditing] = useState(false)
  const actions = canEdit ? [{ label: 'Edit project', icon: Pencil, run: () => setEditing(true) }] : []

  return (
    <>
      <ContextLink to={`/projects/${project.id}`} name={project.name} openLabel="Open project" actions={actions} {...props}>
        {children}
      </ContextLink>
      {editing && canEdit && <ProjectFormDialog project={project} onClose={() => setEditing(false)} />}
    </>
  )
}
