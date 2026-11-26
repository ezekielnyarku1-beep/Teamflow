import { createRemoteJWKSet } from 'jose'
import { createApp } from './app.js'
import { createAuthenticate } from './authenticate.js'

export function createProductionApp() {
  const clientOrigins = (process.env.CLIENT_ORIGIN ?? '').split(',').map(origin => origin.trim()).filter(Boolean)
  const neonAuthUrl = process.env.NEON_AUTH_URL

  if (!clientOrigins.length || !neonAuthUrl) {
    throw new Error('CLIENT_ORIGIN and NEON_AUTH_URL must be set. Copy server/.env.example to server/.env and fill it in.')
  }

  const authenticate = createAuthenticate({
    keySet: createRemoteJWKSet(new URL(`${neonAuthUrl}/.well-known/jwks.json`)),
    issuer: new URL(neonAuthUrl).origin,
  })

  return createApp({ clientOrigin: clientOrigins, authenticate })
}
