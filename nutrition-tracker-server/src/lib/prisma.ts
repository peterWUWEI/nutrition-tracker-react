// A single shared PrismaClient for the whole app.
// Prisma 7 connects through a driver adapter; for PostgreSQL that is @prisma/adapter-pg.
import { PrismaPg } from '@prisma/adapter-pg'

import { config } from '../config.js'
import { PrismaClient } from '../generated/prisma/client.js'

const adapter = new PrismaPg({ connectionString: config.databaseUrl })

export const prisma = new PrismaClient({ adapter })
