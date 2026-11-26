import { afterEach, test } from 'node:test'
import assert from 'node:assert/strict'
import { proxyToNeonAuth, targetUrl, withoutCookieDomain } from '../proxy/neonAuthProxy.js'

const base = 'https://auth.example.neon.tech/neondb/auth'
const realFetch = globalThis.fetch

afterEach(() => {
  globalThis.fetch = realFetch
})

test('maps the website route onto the Neon Auth address, keeping the query', () => {
  assert.equal(targetUrl('https://site.example/api/neon-auth/get-session?x=1', base), `${base}/get-session?x=1`)
  assert.equal(targetUrl('https://site.example/api/neon-auth/email-otp/verify-email', `${base}/`), `${base}/email-otp/verify-email`)
})

test('drops only the Domain attribute from cookies', () => {
  assert.equal(
    withoutCookieDomain('__Secure-neon-auth.session_token=abc; Domain=auth.example.neon.tech; Path=/; HttpOnly; Secure; SameSite=None'),
    '__Secure-neon-auth.session_token=abc; Path=/; HttpOnly; Secure; SameSite=None',
  )
  assert.equal(withoutCookieDomain('a=1; Path=/'), 'a=1; Path=/')
})

test('forwards the browser origin and cookies, leaves out forwarded-host headers, and keeps every cookie it gets back', async () => {
  let sent
  globalThis.fetch = async (url, init) => {
    sent = { url, init }
    const headers = new Headers({ 'content-type': 'application/json', 'content-encoding': 'gzip' })
    headers.append('set-cookie', 'one=1; Domain=auth.example.neon.tech; Path=/')
    headers.append('set-cookie', 'two=2; Path=/')
    return new Response('{"ok":true}', { status: 200, headers })
  }

  const response = await proxyToNeonAuth(new Request('https://site.example/api/neon-auth/sign-in/email', {
    method: 'POST',
    headers: {
      origin: 'https://site.example',
      cookie: 'old=1',
      'content-type': 'application/json',
      'x-forwarded-host': 'site.example',
      'x-forwarded-proto': 'https',
    },
    body: '{"email":"a@b.c"}',
  }), base)

  assert.equal(sent.url, `${base}/sign-in/email`)
  assert.equal(sent.init.headers.get('origin'), 'https://site.example')
  assert.equal(sent.init.headers.get('cookie'), 'old=1')
  assert.equal(sent.init.headers.get('x-forwarded-host'), null)
  assert.equal(sent.init.headers.get('x-forwarded-proto'), null)
  assert.equal(new TextDecoder().decode(sent.init.body), '{"email":"a@b.c"}')

  assert.equal(response.status, 200)
  assert.equal(response.headers.get('content-encoding'), null)
  assert.deepEqual(response.headers.getSetCookie(), ['one=1; Path=/', 'two=2; Path=/'])
  assert.deepEqual(await response.json(), { ok: true })
})

test('explains a missing setting or an unreachable service instead of crashing', async () => {
  assert.equal((await proxyToNeonAuth(new Request('https://site.example/api/neon-auth/get-session'), undefined)).status, 500)
  globalThis.fetch = async () => {
    throw new TypeError('fetch failed')
  }
  assert.equal((await proxyToNeonAuth(new Request('https://site.example/api/neon-auth/get-session'), base)).status, 502)
})

test('the Vercel entry rebuilds the original path from the rewrite and keeps other query values and the body', async () => {
  const { originalRequest } = await import('../api/neon-auth.js')
  const rewritten = new Request('https://site.example/api/neon-auth?__neon_auth_path=email-otp/verify-email&neon_auth_session_verifier=v1', {
    method: 'POST',
    headers: { origin: 'https://site.example', 'content-type': 'application/json' },
    body: '{"otp":"123456"}',
  })
  const request = await originalRequest(rewritten)
  assert.equal(request.url, 'https://site.example/api/neon-auth/email-otp/verify-email?neon_auth_session_verifier=v1')
  assert.equal(request.headers.get('origin'), 'https://site.example')
  assert.equal(await request.text(), '{"otp":"123456"}')

  const untouched = new Request('https://site.example/api/neon-auth/get-session')
  assert.equal(await originalRequest(untouched), untouched)
})
