import { Navigate, Outlet, useSearchParams } from 'react-router'
import { authClient, needsEmailCode, safeRedirectPath, verifyEmailPath } from '../lib/auth.js'

// Shows the sign-in pages straight away. Almost everyone here is signed out, so waiting for the session check
// (about a second) behind a skeleton only slowed them down; someone already signed in is sent on once it answers.
export default function GuestOnly() {
  const session = authClient.useSession()
  const [searchParams] = useSearchParams()

  const user = session.data?.user
  if (user) return <Navigate to={needsEmailCode(user) ? verifyEmailPath(user.email) : safeRedirectPath(searchParams.get('redirectTo'))} replace />
  return <Outlet />
}
