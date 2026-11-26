import { Navigate, Outlet, useLocation } from 'react-router'
import Skeleton from './Skeleton.jsx'
import { authClient, needsEmailCode, verifyEmailPath } from '../lib/auth.js'

export default function RequireSession() {
  const session = authClient.useSession()
  const location = useLocation()

  if (session.isPending) return <Skeleton label="your workspace" layout="shell" />
  if (!session.data?.user) {
    const redirectTo = encodeURIComponent(location.pathname + location.search)
    return <Navigate to={`/login?redirectTo=${redirectTo}`} replace />
  }
  if (needsEmailCode(session.data.user)) return <Navigate to={verifyEmailPath(session.data.user.email, true)} replace />
  return <Outlet />
}
