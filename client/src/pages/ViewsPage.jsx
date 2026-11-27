import EmptyState from '../components/EmptyState.jsx'
import { Layers } from '../components/EmptyPictures.jsx'
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

  const newView = <SaveViewButton teamKey={teamKey ?? ''} filter={emptyFilter} label="New view" primary />

  return (
    <div className="views-page">
      <PageHeader title="Views" meta={shown && `${shown.length} saved${teamKey ? ` in ${teamKey}` : ''}`}>
        {shown?.length !== 0 && newView}
      </PageHeader>
      <QueryState query={views} label="views">
        {() =>
          shown.length === 0 ? (
            <EmptyState illustration={Layers} title={teamKey ? `No saved views for ${teamKey} yet` : "No saved views yet"} description="Choose filters on a team's issues and save them as a view.">{newView}</EmptyState>
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
