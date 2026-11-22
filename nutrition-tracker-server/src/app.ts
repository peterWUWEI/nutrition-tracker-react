import cors from 'cors'
import express from 'express'

import { config } from './config.js'
import { errorHandler, notFound } from './middleware/errorHandler.js'
import { foodsRouter } from './routes/foods.js'
import { healthRouter } from './routes/health.js'

// Builds the Express app. Kept separate from index.ts so it can be tested without opening a port.
export function createApp() {
  const app = express()

  app.use(cors({ origin: config.corsOrigin }))
  app.use(express.json())

  app.use('/api/health', healthRouter)
  app.use('/api/foods', foodsRouter)

  app.use(notFound)
  app.use(errorHandler)

  return app
}
