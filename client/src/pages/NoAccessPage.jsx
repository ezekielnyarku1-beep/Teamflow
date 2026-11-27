import { Link } from 'react-router'
import EmptyState from '../components/EmptyState.jsx'
import { Access } from '../components/EmptyPictures.jsx'
import './auth/auth.css'

export default function NoAccessPage() {
  return (
    <EmptyState illustration={Access} title="You do not have access to this page" description="Ask an admin if you need access." heading="h1">
      <Link to="/my-issues" className="button">
        Go to My issues
      </Link>
    </EmptyState>
  )
}
