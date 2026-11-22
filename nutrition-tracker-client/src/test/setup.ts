// Runs before every client test file.
import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

// Tests never talk to a real server: each test file mocks the api/ modules it needs.
// Any request that slips through fails fast instead of hanging.
vi.stubGlobal(
  'fetch',
  vi.fn(() => Promise.reject(new Error('Network access is disabled in tests'))),
)
