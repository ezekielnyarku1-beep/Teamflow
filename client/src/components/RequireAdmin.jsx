import { Outlet } from 'react-router'
import QueryState from './QueryState.jsx'
import NoAccessPage from '../pages/NoAccessPage.jsx'
import { useMe } from '../lib/queries.js'

export default function RequireAdmin() {
  const me = useMe()
  return (
    <QueryState query={me} label="your account">
      {user => (user.role === 'ADMIN' ? <Outlet /> : <NoAccessPage />)}
    </QueryState>
  )
}
