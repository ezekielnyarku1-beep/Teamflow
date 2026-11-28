import { Navigate, Outlet, useSearchParams } from 'react-router'
import { authClient, needsEmailCode, safeRedirectPath, verifyEmailPath } from '../lib/auth.js'

export default function GuestOnly() {
  const session = authClient.useSession()
  const [searchParams] = useSearchParams()

  const user = session.data?.user
  if (user) return <Navigate to={needsEmailCode(user) ? verifyEmailPath(user.email) : safeRedirectPath(searchParams.get('redirectTo'))} replace />
  return <Outlet />
}
