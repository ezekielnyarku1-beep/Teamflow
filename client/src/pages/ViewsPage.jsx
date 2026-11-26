import { Link, useSearchParams } from 'react-router'
import PageHeader from '../components/PageHeader.jsx'
import QueryState from '../components/QueryState.jsx'
import SaveViewButton from '../components/SaveViewButton.jsx'
import { countActiveFilters, emptyFilter } from '../lib/issueFilter.js'
import { useViews } from '../lib/queries.js'

const describeFilters = filter => {
  const count = countActiveFilters(filter)
  return count === 0 ? 'No filters' : count === 1 ? '1 filter' : `${count} filters`
}

export default function ViewsPage() {
  const views = useViews()
  const teamKey = useSearchParams()[0].get('team')
  const shown = teamKey ? views.data?.filter(view => view.team?.key === teamKey) : views.data

  return (
    <div className="views-page">
      <PageHeader title="Views" meta={shown && `${shown.length} saved${teamKey ? ` in ${teamKey}` : ''}`}>
        <SaveViewButton filter={emptyFilter} label="New view" primary />
      </PageHeader>
      <QueryState query={views} label="views">
        {() =>
          shown.length === 0 ? (
            <p className="empty-state">
              {teamKey ? `No saved views for ${teamKey} yet.` : "No saved views yet. Choose filters on a team's issues and press Save view, or start a new view here."}
            </p>
          ) : (
            <ul className="simple-rows">
              {shown.map(view => (
                <li key={view.id}>
                  <Link to={`/views/${view.id}`} className="simple-row is-view">
                    <span className="simple-row-name">{view.name}</span>
                    <span className="simple-row-meta">{view.team?.name ?? 'All my teams'}</span>
                    <span className="simple-row-meta">{describeFilters(view.filter)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
      </QueryState>
    </div>
  )
}
