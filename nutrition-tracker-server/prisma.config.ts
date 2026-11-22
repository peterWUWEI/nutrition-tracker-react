// Prisma CLI configuration (Prisma 7+). The database URL lives here, not in schema.prisma.
// https://www.prisma.io/docs/orm/reference/prisma-config-reference
import 'dotenv/config'
import { defineConfig, env } from 'prisma/config'

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    url: env('DATABASE_URL'),
  },
})
