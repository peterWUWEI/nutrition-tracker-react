import pg from 'pg'

const databaseUrl = process.env.DATABASE_URL ?? ''

// Safety net: never wipe a database that isn't a test database.
if (!decodeURIComponent(new URL(databaseUrl).pathname).endsWith('_test')) {
  throw new Error(`Refusing to run tests against a non-test database: ${databaseUrl}`)
}

const pool = new pg.Pool({ connectionString: databaseUrl })

// Empties every table (except Prisma's migration history) and resets id counters,
// so each test starts from a clean database.
export async function resetDatabase() {
  const { rows } = await pool.query<{ tablename: string }>(
    `SELECT tablename FROM pg_tables
     WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`,
  )
  if (rows.length === 0) return

  const tables = rows.map((row) => `"${row.tablename}"`).join(', ')
  await pool.query(`TRUNCATE TABLE ${tables} RESTART IDENTITY CASCADE`)
}

export async function closeTestDatabase() {
  await pool.end()
}
