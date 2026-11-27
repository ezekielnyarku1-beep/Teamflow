import EmptyState from '../components/EmptyState.jsx'
import { Signpost } from '../components/EmptyPictures.jsx'
import { Link } from 'react-router'

export default function NotFoundPage() {
  return (
    <EmptyState illustration={Signpost} title="Page not found" description="This page does not exist, or you do not have access to it." heading="h1">
      <Link to="/my-issues" className="button">
        Go to My issues
      </Link>
    </EmptyState>
  )
}
