import express from 'express'
import { chatRouter } from './routes/chat.js'
import cors from 'cors'
import helmet from 'helmet'
import { errorHandler, notFoundHandler } from './errors.js'
import { issuesRouter } from './routes/issues.js'
import { labelsRouter } from './routes/labels.js'
import { meRouter } from './routes/me.js'
import { notificationsRouter } from './routes/notifications.js'
import { projectsRouter } from './routes/projects.js'
import { teamsRouter } from './routes/teams.js'
import { usersRouter } from './routes/users.js'
import { viewsRouter } from './routes/views.js'
import { workspaceRouter } from './routes/workspace.js'

export function createApp({ clientOrigin, authenticate }) {
  const app = express()

  app.use(helmet())
  app.use(cors({ origin: clientOrigin }))

  app.get('/api/health', (request, response) => {
    response.json({ status: 'ok' })
  })

  app.use('/api', express.json({ limit: '100kb' }), authenticate)
  app.use('/api/me', meRouter)
  app.use('/api/agents/chat', chatRouter)
  app.use('/api/teams', teamsRouter)
  app.use('/api/projects', projectsRouter)
  app.use('/api/issues', issuesRouter)
  app.use('/api/labels', labelsRouter)
  app.use('/api/users', usersRouter)
  app.use('/api/workspace', workspaceRouter)
  app.use('/api/views', viewsRouter)
  app.use('/api/notifications', notificationsRouter)

  app.use(notFoundHandler)
  app.use(errorHandler)

  return app
}
