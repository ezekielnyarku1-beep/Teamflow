import { Link, useParams } from 'react-router'
import PageHeader from '../components/PageHeader.jsx'
import ProgressBar from '../components/ProgressBar.jsx'
import QueryState from '../components/QueryState.jsx'
import { formatDateRange, countOf } from '../lib/format.js'
import { useCycles, useTeam } from '../lib/queries.js'

const stateLabels = { current: 'Current', upcoming: 'Upcoming', past: 'Finished' }

export default function TeamCyclesPage() {
  const { teamKey } = useParams()
  const team = useTeam(teamKey)
  const cycles = useCycles(teamKey)

  return (
    <QueryState query={team} label="the team" skeleton="page">
      {teamData => (
        <div className="cycles-page">
          <PageHeader title={`${teamData.name} cycles`} meta={cycles.data && countOf(cycles.data.length, 'cycle')}>
            <Link to={`/team/${teamKey}`} className="button">
              Team issues
            </Link>
          </PageHeader>
          <QueryState query={cycles} label="cycles">
            {data =>
              data.length === 0 ? (
                <p className="empty-state">This team has no cycles yet. An admin can turn them on in Settings, under Teams.</p>
              ) : (
                <ul className="simple-rows">
                  {data.map(cycle => (
                    <li key={cycle.id}>
                      <Link to={`/team/${teamKey}/cycles/${cycle.number}`} className="simple-row is-cycle">
                        <span className="simple-row-name">Cycle {cycle.number}</span>
                        <span className={`cycle-state is-${cycle.state}`}>{stateLabels[cycle.state]}</span>
                        <span className="simple-row-meta">{formatDateRange(cycle.startDate, cycle.endDate)}</span>
                        <ProgressBar progress={cycle.progress} />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
          </QueryState>
        </div>
      )}
    </QueryState>
  )
}
