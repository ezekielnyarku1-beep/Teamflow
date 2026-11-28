import { useParams } from 'react-router'
import CycleSummary from '../components/CycleSummary.jsx'
import IssuesView from '../components/IssuesView.jsx'
import QueryState from '../components/QueryState.jsx'
import SaveViewButton from '../components/SaveViewButton.jsx'
import { useCycles, useTeam } from '../lib/queries.js'

function TeamCycle({ team }) {
  const cycles = useCycles(team.key, Boolean(team.cycleWeeks))
  const cycle = cycles.data?.find(item => item.state === 'current') ?? cycles.data?.findLast(item => item.state === 'upcoming')
  return team.cycleWeeks && cycle ? <CycleSummary teamKey={team.key} cycle={cycle} showLinks /> : null
}

export default function TeamIssuesPage() {
  const { teamKey } = useParams()
  const team = useTeam(teamKey)

  return (
    <QueryState query={team} label="the team">
      {data => (
        <IssuesView
          key={data.key}
          title={data.name}
          filters={{ team: data.key }}
          teamKey={data.key}
          summary={<TeamCycle team={data} />}
          actions={filter => <SaveViewButton teamKey={data.key} filter={filter} />}
        />
      )}
    </QueryState>
  )
}
