// Auth helpers with no Neon client, so they can be tested with plain Node.

export function safeRedirectPath(value) {
  return value && value.startsWith('/') && !value.startsWith('//') && !value.startsWith('/\\') ? value : '/overview'
}

export const verifyEmailPath = (email, codeSent = false) =>
  `/verify-email?${new URLSearchParams({ email, ...(codeSent && { sent: '1' }) })}`

// With "Verify email at signup" on, Neon Auth returns no session token from sign-up and emails the code itself.
// With it off, the user is signed in straight away (a token comes back) and no code has been sent yet.
export const signUpSentCode = data => !data?.token
