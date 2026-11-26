import { test } from 'node:test'
import assert from 'node:assert/strict'
import { safeRedirectPath, signUpSentCode, verifyEmailPath } from '../src/lib/authPaths.js'

test('sign-up only counts as having sent a code when Neon Auth held back the session', () => {
  assert.equal(signUpSentCode({ token: null, user: {} }), true)
  assert.equal(signUpSentCode({ token: 'abc', user: {} }), false)
  assert.equal(signUpSentCode(undefined), true)
})

test('the code page link only claims a code was sent when asked to', () => {
  assert.equal(verifyEmailPath('a+b@example.com'), '/verify-email?email=a%2Bb%40example.com')
  assert.equal(verifyEmailPath('a@example.com', true), '/verify-email?email=a%40example.com&sent=1')
})

test('redirects stay inside the app', () => {
  assert.equal(safeRedirectPath('/team/ENG'), '/team/ENG')
  assert.equal(safeRedirectPath(null), '/overview')
  assert.equal(safeRedirectPath('https://evil.example'), '/overview')
  assert.equal(safeRedirectPath('//evil.example'), '/overview')
  assert.equal(safeRedirectPath('/\\evil.example'), '/overview')
})
