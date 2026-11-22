import { defineConfig, mergeConfig } from 'vitest/config'

import viteConfig from './vite.config.ts'

// Run tests in a fixed timezone so dates and times are predictable.
process.env.TZ = 'UTC'

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: 'jsdom',
      include: ['src/**/*.test.{ts,tsx}'],
      setupFiles: ['./src/test/setup.ts'],
      env: { TZ: 'UTC' },
    },
  }),
)
