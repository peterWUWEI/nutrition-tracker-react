import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Where the dev server forwards /api requests.
// - Running locally: the server on localhost:4000 (default)
// - Running in Docker: set by docker-compose to http://nutrition-tracker-server:4000
const apiProxyTarget = process.env.API_PROXY_TARGET ?? 'http://localhost:4000'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: apiProxyTarget,
        changeOrigin: true,
      },
    },
  },
})
