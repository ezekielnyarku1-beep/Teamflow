import { useParams } from 'react-router'
import IssuesView from '../components/IssuesView.jsx'
import ProjectSummary from '../components/ProjectSummary.jsx'
import QueryState from '../components/QueryState.jsx'
import { useProject } from '../lib/queries.js'

export default function ProjectPage() {
  const { projectId } = useParams()
  const project = useProject(projectId)

  return (
    <QueryState query={project} label="the project">
      {data => (
        <IssuesView
          key={data.id}
          title={data.name}
          filters={{ project: data.id }}
          teamKey={data.team.key}
          summary={<ProjectSummary project={data} />}
        />
      )}
    </QueryState>
  )
}
