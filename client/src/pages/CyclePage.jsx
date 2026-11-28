import { useParams } from 'react-router'
import CycleSummary from '../components/CycleSummary.jsx'
import IssuesView from '../components/IssuesView.jsx'
import QueryState from '../components/QueryState.jsx'
import NotFoundPage from './NotFoundPage.jsx'
import { useCycles, useTeam } from '../lib/queries.js'

export default function CyclePage() {
  const { teamKey, cycleNumber } = useParams()
  const team = useTeam(teamKey)
  const cycles = useCycles(teamKey)

  return (
    <QueryState query={team} label="the team">
      {teamData => (
        <QueryState query={cycles} label="the cycle">
          {data => {
            const cycle = data.find(item => String(item.number) === cycleNumber)
            if (!cycle) return <NotFoundPage />
            return (
              <IssuesView
                key={cycle.id}
                title={`${teamKey} · Cycle ${cycle.number}`}
                filters={{ team: teamKey, cycle: cycle.id }}
                teamKey={teamKey}
                cycleId={teamData.cycleWeeks && cycle.state !== 'past' ? cycle.id : null}
                summary={<CycleSummary teamKey={teamKey} cycle={cycle} />}
              />
            )
          }}
        </QueryState>
      )}
    </QueryState>
  )
}
