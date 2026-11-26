import { createAuthClient } from '@neon/auth'
import { BetterAuthReactAdapter } from '@neon/auth/react/adapters'
import { queryClient } from './queryClient.js'

export const authClient = createAuthClient(import.meta.env.VITE_NEON_AUTH_URL, {
  adapter: BetterAuthReactAdapter(),
})

const tooManyAttempts = 'Too many attempts. Wait a few seconds and try again.'
const codeProblems = [
  ['INVALID_OTP', 'Invalid OTP', 'That code is not right. Check the email and try again.'],
  ['OTP_EXPIRED', 'OTP expired', 'That code has expired. Send a new one.'],
  ['TOO_MANY_ATTEMPTS', 'Too many attempts', 'Too many wrong codes. Send a new one.'],
]
const codeMessage = error => codeProblems.find(([code, text]) => error.code === code || error.message === text)?.[2]
const messageFor = (error, fallback) => (error.status === 429 ? tooManyAttempts : codeMessage(error) ?? fallback)
const pendingKey = 'overview-teams-verify-email'

let cachedToken = null

function expiresAt(token) {
  try {
    const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    return JSON.parse(atob(payload)).exp * 1000
  } catch {
    return 0
  }
}

export async function getAccessToken() {
  if (cachedToken && expiresAt(cachedToken) - Date.now() > 60000) return cachedToken
  const { data } = await authClient.token()
  cachedToken = data?.token ?? data?.session?.token ?? null
  return cachedToken
}

export function forgetAccessToken() {
  cachedToken = null
}

async function callAuth(action, fallback) {
  let result
  try {
    result = await action()
  } catch (error) {
    throw Object.assign(new Error(messageFor(error, fallback), { cause: error }), { code: error?.code })
  }
  if (result?.error) throw Object.assign(new Error(messageFor(result.error, fallback)), { code: result.error.code })
}

async function startFreshSession(action, fallback) {
  await callAuth(action, fallback)
  forgetAccessToken()
  queryClient.clear()
}

export function signIn(email, password) {
  return startFreshSession(() => authClient.signIn.email({ email, password }), 'Email or password is incorrect.')
}

export function signInWithGoogle(redirectTo) {
  const target = safeRedirectPath(redirectTo)
  const errorCallbackURL = new URL(window.location.pathname, window.location.origin)
  if (redirectTo) errorCallbackURL.searchParams.set('redirectTo', target)
  return callAuth(
    () => authClient.signIn.social({
      provider: 'google',
      callbackURL: new URL(target, window.location.origin).href,
      errorCallbackURL: errorCallbackURL.href,
    }),
    'Google sign-in could not start. Try again.',
  )
}

export function markPendingVerification(email) {
  try {
    window.sessionStorage.setItem(pendingKey, email.trim().toLowerCase())
  } catch {
    return false
  }
  return true
}

export function clearPendingVerification() {
  try {
    window.sessionStorage.removeItem(pendingKey)
  } catch {
    return false
  }
  return true
}

export function needsEmailCode(user) {
  try {
    return Boolean(user && !user.emailVerified && window.sessionStorage.getItem(pendingKey) === user.email.toLowerCase())
  } catch {
    return false
  }
}

export const verifyEmailPath = (email, codeSent = false) =>
  `/verify-email?${new URLSearchParams({ email, ...(codeSent && { sent: '1' }) })}`

export function sendEmailCode(email) {
  return callAuth(
    () => authClient.emailOtp.sendVerificationOtp({ email, type: 'email-verification' }),
    'The code could not be sent. Try again in a moment.',
  )
}

export async function verifyEmailCode(email, otp) {
  await startFreshSession(() => authClient.emailOtp.verifyEmail({ email, otp }), 'The code could not be checked. Try again.')
  clearPendingVerification()
}

export function signUp({ name, email, password }) {
  return startFreshSession(
    () => authClient.signUp.email({ name, email, password }),
    'The account could not be created. If you already have one, log in or reset your password.',
  )
}

export async function signOut() {
  await authClient.signOut()
  forgetAccessToken()
  queryClient.clear()
}

export function requestPasswordReset(email) {
  return callAuth(
    () => authClient.requestPasswordReset({ email, redirectTo: `${window.location.origin}/reset-password` }),
    'The reset email could not be sent. Try again.',
  )
}

export function resetPassword(token, newPassword) {
  return callAuth(
    () => authClient.resetPassword({ token, newPassword }),
    'This reset link has expired or was already used. Ask for a new one.',
  )
}

export function safeRedirectPath(value) {
  return value && value.startsWith('/') && !value.startsWith('//') && !value.startsWith('/\\') ? value : '/overview'
}
