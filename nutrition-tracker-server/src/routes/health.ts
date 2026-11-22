import { Router } from 'express'

import { prisma } from '../lib/prisma.js'

export const healthRouter = Router()

// GET /api/health – reports whether the API and the database are reachable.
healthRouter.get('/', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`
    res.json({ status: 'ok', database: 'up' })
  } catch {
    res.status(503).json({ status: 'error', database: 'down' })
  }
})
