/// <reference types="vite/client" />

// Typed environment variables exposed to the browser.
// Only variables prefixed with VITE_ are available via import.meta.env.
interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
