import EmptyState from '../components/EmptyState.jsx'
import { Cycle } from '../components/EmptyPictures.jsx'
import { Link, useParams } from 'react-router'
import ContextLink from '../components/ContextLink.jsx'
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
    <QueryState query={team} label="the team">
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
                <EmptyState illustration={Cycle} title="No cycles yet" description="An admin can turn on cycles in team settings." />
              ) : (
                <ul className="simple-rows">
                  {data.map(cycle => (
                    <li key={cycle.id}>
                      <ContextLink to={`/team/${teamKey}/cycles/${cycle.number}`} className="simple-row is-cycle"
                        name={`Cycle ${cycle.number}`} openLabel="Open cycle" showActions>
                        <span className="simple-row-name">Cycle {cycle.number}</span>
                        <span className={`cycle-state is-${cycle.state}`}>{stateLabels[cycle.state]}</span>
                        <span className="simple-row-meta">{formatDateRange(cycle.startDate, cycle.endDate)}</span>
                        <ProgressBar progress={cycle.progress} />
                      </ContextLink>
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
