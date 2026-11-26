import { Navigate, Outlet, useSearchParams } from 'react-router'
import Skeleton from './Skeleton.jsx'
import { authClient, needsEmailCode, safeRedirectPath, verifyEmailPath } from '../lib/auth.js'

export default function GuestOnly() {
  const session = authClient.useSession()
  const [searchParams] = useSearchParams()

  if (session.isPending) return <Skeleton label="the sign-in page" layout="form" />
  const user = session.data?.user
  if (user) return <Navigate to={needsEmailCode(user) ? verifyEmailPath(user.email, true) : safeRedirectPath(searchParams.get('redirectTo'))} replace />
  return <Outlet />
}
