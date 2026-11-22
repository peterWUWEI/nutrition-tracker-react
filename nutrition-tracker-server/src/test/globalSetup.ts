import { execSync } from 'node:child_process'

import pg from 'pg'

import { getTestDatabaseUrl } from './testDatabaseUrl.js'

// Runs once before the whole test run:
// 1. creates the test database if it doesn't exist yet
// 2. applies all Prisma migrations to it
export default async function globalSetup() {
  const testDatabaseUrl = getTestDatabaseUrl()
  await createDatabaseIfMissing(testDatabaseUrl)

  execSync('npx prisma migrate deploy', {
    env: { ...process.env, DATABASE_URL: testDatabaseUrl },
    stdio: 'inherit',
  })
}

async function createDatabaseIfMissing(databaseUrl: string) {
  const url = new URL(databaseUrl)
  const databaseName = decodeURIComponent(url.pathname.slice(1))

  // Connect to the built-in "postgres" database to check for / create the test database.
  url.pathname = '/postgres'
  const client = new pg.Client({ connectionString: url.toString() })
  await client.connect()
  try {
    const result = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [databaseName])
    if (result.rowCount === 0) {
      await client.query(`CREATE DATABASE "${databaseName.replaceAll('"', '""')}"`)
    }
  } finally {
    await client.end()
  }
}
