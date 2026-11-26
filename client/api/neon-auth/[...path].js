// Vercel function: same-origin route for Neon Auth (see proxy/neonAuthProxy.js for why).
import { authBaseUrlFromEnvironment, proxyToNeonAuth } from '../../proxy/neonAuthProxy.js'

export default {
  fetch: request => proxyToNeonAuth(request, authBaseUrlFromEnvironment(process.env)),
}
