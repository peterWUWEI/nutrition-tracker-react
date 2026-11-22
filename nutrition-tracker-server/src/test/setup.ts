// Runs inside each test file before its tests.
import { afterAll, beforeEach } from 'vitest'

import { prisma } from '../lib/prisma.js'
import { closeTestDatabase, resetDatabase } from './db.js'

beforeEach(async () => {
  await resetDatabase()
})

afterAll(async () => {
  await prisma.$disconnect()
  await closeTestDatabase()
})
