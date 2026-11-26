// Vercel function: same-origin route for Neon Auth (see proxy/neonAuthProxy.js for why). vercel.json rewrites every
// /api/neon-auth/<path> here and passes <path> in the __neon_auth_path query value, because a catch-all filename only
// matches one path segment on Vercel outside Next.js.
import { authBaseUrlFromEnvironment, proxyToNeonAuth, proxyPrefix } from '../proxy/neonAuthProxy.js'

export async function originalRequest(request) {
  const url = new URL(request.url)
  const path = url.searchParams.get('__neon_auth_path')
  if (path === null) return request
  url.searchParams.delete('__neon_auth_path')
  url.pathname = `${proxyPrefix}/${path}`
  const hasBody = !['GET', 'HEAD'].includes(request.method)
  return new Request(url, {
    method: request.method,
    headers: request.headers,
    body: hasBody ? await request.arrayBuffer() : undefined,
  })
}

export default {
  fetch: async request => proxyToNeonAuth(await originalRequest(request), authBaseUrlFromEnvironment(process.env)),
}
