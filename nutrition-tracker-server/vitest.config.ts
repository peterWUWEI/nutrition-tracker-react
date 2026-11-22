import os from 'node:os'
import path from 'node:path'

import { defineConfig } from 'vitest/config'

import { getTestDatabaseUrl } from './src/test/testDatabaseUrl.ts'

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
    globalSetup: ['./src/test/globalSetup.ts'],
    setupFiles: ['./src/test/setup.ts'],
    // All test files share one database, so run them one at a time.
    fileParallelism: false,
    env: {
      DATABASE_URL: getTestDatabaseUrl(),
      // Uploaded pictures go to a temporary folder during tests.
      UPLOADS_DIR: path.join(os.tmpdir(), 'nutrition-tracker-test-uploads'),
    },
  },
})
