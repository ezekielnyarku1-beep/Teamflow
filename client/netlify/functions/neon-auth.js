// Netlify function: same-origin route for Neon Auth (see proxy/neonAuthProxy.js for why).
import { authBaseUrlFromEnvironment, proxyToNeonAuth } from '../../proxy/neonAuthProxy.js'

export default request => proxyToNeonAuth(request, authBaseUrlFromEnvironment(process.env))

export const config = { path: '/api/neon-auth/*' }
