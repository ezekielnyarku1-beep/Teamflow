import { createProductionApp } from './production.js'

const port = Number(process.env.PORT) || 4000

createProductionApp().listen(port, error => {
  if (error) throw error
  console.log(`Overview Teams server running on http://localhost:${port}`)
})
