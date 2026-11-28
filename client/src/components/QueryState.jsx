import EmptyState from './EmptyState.jsx'
import { Cloud } from './EmptyPictures.jsx'
import NotFoundPage from '../pages/NotFoundPage.jsx'

export default function QueryState({ query, label, children }) {
  if (query.isPending) return null

  if (query.isError) {
    if (query.error.status === 404) return <NotFoundPage />
    return (
      <EmptyState illustration={Cloud} title={`Could not load ${label}`} description={query.error.message.replace(/[.!?]?$/, ".")} role="alert">
        <button type="button" className="button" onClick={() => query.refetch()} disabled={query.isFetching}>
          {query.isFetching ? 'Trying again…' : 'Try again'}
        </button>
      </EmptyState>
    )
  }

  return children(query.data)
}
