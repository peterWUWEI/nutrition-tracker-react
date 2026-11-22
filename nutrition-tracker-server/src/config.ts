// Reads configuration from environment variables.
// Locally they come from .env (via dotenv); in Docker, from docker-compose.yml.
import 'dotenv/config'
import path from 'node:path'

function required(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}

export const config = {
  port: Number(process.env.PORT ?? 4000),
  databaseUrl: required('DATABASE_URL'),
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
  // Folder for uploaded pictures, served at /uploads (relative paths are relative to the server folder).
  uploadsDir: path.resolve(process.env.UPLOADS_DIR ?? 'uploads'),
}
