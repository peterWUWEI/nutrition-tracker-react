import { createApp } from './app.js'
import { config } from './config.js'
import { prisma } from './lib/prisma.js'

const app = createApp()

const server = app.listen(config.port, (error?: Error) => {
  if (error) {
    throw error
  }
  console.log(`nutrition-tracker-server listening on http://localhost:${config.port}`)
})

// Close the HTTP server and database connections cleanly when Docker or Ctrl+C stops the process.
function shutdown(signal: NodeJS.Signals) {
  console.log(`${signal} received, shutting down…`)
  server.close(async () => {
    await prisma.$disconnect()
    process.exit(0)
  })
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
