// Runs as Vercel's build step for the server. Production deploys apply any pending database migrations before the
// new code goes live; if a migration fails, the build fails and the current version keeps running. Preview deploys
// skip this so a branch can never change the production database.
import { execFileSync } from 'node:child_process'

if (process.env.VERCEL_ENV === 'production') {
  execFileSync(process.execPath, ['node_modules/prisma/build/index.js', 'migrate', 'deploy'], { stdio: 'inherit' })
} else {
  console.log(`Skipping database migrations (VERCEL_ENV is "${process.env.VERCEL_ENV ?? 'not set'}").`)
}
