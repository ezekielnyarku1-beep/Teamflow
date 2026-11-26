// Forwards the website's /api/neon-auth/* requests to Neon Auth, so the login cookie belongs to the website's own
// address. Called straight from the browser, Neon Auth's cookie is a third-party cookie, which Safari, iPhones,
// Firefox, Brave and private windows block, so sign-in only worked in browsers that allow them.

export const proxyPrefix = '/api/neon-auth'

// Only these request headers go through. Hosting providers add X-Forwarded-Host, and Neon Auth refuses any request
// whose forwarded host is not its own ("Invalid hostname header"), so forwarding headers are left out on purpose.
const forwardedRequestHeaders = [
  'accept',
  'accept-language',
  'authorization',
  'content-type',
  'cookie',
  'origin',
  'referer',
  'user-agent',
  'x-neon-client-info',
]

// The body arrives already decoded, so these would describe the wrong bytes.
const droppedResponseHeaders = new Set(['content-encoding', 'content-length', 'transfer-encoding', 'connection', 'set-cookie'])

// A cookie scoped to Neon Auth's domain would be rejected on the website, so drop the Domain attribute and let the
// browser scope it to the website.
export const withoutCookieDomain = cookie => cookie.replace(/;\s*domain=[^;]*/gi, '')

export function targetUrl(requestUrl, authBaseUrl) {
  const url = new URL(requestUrl)
  const rest = url.pathname.startsWith(proxyPrefix) ? url.pathname.slice(proxyPrefix.length) : url.pathname
  return `${authBaseUrl.replace(/\/+$/, '')}${rest}${url.search}`
}

export async function proxyToNeonAuth(request, authBaseUrl) {
  if (!authBaseUrl) {
    return Response.json({ message: 'Sign-in is not set up on this website (NEON_AUTH_URL is missing).' }, { status: 500 })
  }

  const headers = new Headers()
  for (const name of forwardedRequestHeaders) {
    const value = request.headers.get(name)
    if (value) headers.set(name, value)
  }

  const hasBody = !['GET', 'HEAD'].includes(request.method)
  let upstream
  try {
    upstream = await fetch(targetUrl(request.url, authBaseUrl), {
      method: request.method,
      headers,
      body: hasBody ? await request.arrayBuffer() : undefined,
      redirect: 'manual',
    })
  } catch {
    return Response.json({ message: 'The sign-in service could not be reached. Try again in a moment.' }, { status: 502 })
  }

  const responseHeaders = new Headers()
  upstream.headers.forEach((value, name) => {
    if (!droppedResponseHeaders.has(name.toLowerCase())) responseHeaders.set(name, value)
  })
  for (const cookie of upstream.headers.getSetCookie()) responseHeaders.append('set-cookie', withoutCookieDomain(cookie))

  return new Response(hasBodyAllowed(upstream.status) ? await upstream.arrayBuffer() : null, {
    status: upstream.status,
    headers: responseHeaders,
  })
}

const hasBodyAllowed = status => ![101, 204, 205, 304].includes(status)

export const authBaseUrlFromEnvironment = environment => environment.NEON_AUTH_URL || environment.VITE_NEON_AUTH_URL
