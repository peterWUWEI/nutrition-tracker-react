import 'dotenv/config'

// Tests never touch the development database. They use a separate database whose
// name ends in "_test" (e.g. nutrition_tracker_test), derived from DATABASE_URL,
// unless TEST_DATABASE_URL is set explicitly.
export function getTestDatabaseUrl(): string {
  const explicit = process.env.TEST_DATABASE_URL
  const base = explicit ?? process.env.DATABASE_URL
  if (!base) {
    throw new Error('Set DATABASE_URL (or TEST_DATABASE_URL) before running the tests')
  }

  const url = new URL(base)
  const databaseName = decodeURIComponent(url.pathname.slice(1))
  if (!databaseName.endsWith('_test')) {
    if (explicit) {
      throw new Error('TEST_DATABASE_URL must point to a database whose name ends in "_test"')
    }
    url.pathname = `/${databaseName}_test`
  }
  return url.toString()
}
