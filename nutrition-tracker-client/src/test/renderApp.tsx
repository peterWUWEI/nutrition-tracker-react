import CssBaseline from '@mui/material/CssBaseline'
import { ThemeProvider } from '@mui/material/styles'
import { render } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter } from 'react-router'
import { RouterProvider } from 'react-router/dom'

import { routes } from '../routes.tsx'
import { theme } from '../theme.ts'

// Renders the whole app (layout + pages) at a URL, the way the browser would.
// Returns a user-event instance for clicking/typing and the router to inspect the URL.
export function renderApp(initialPath = '/') {
  const router = createMemoryRouter(routes, { initialEntries: [initialPath] })
  const user = userEvent.setup()
  const utils = render(
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <RouterProvider router={router} />
    </ThemeProvider>,
  )
  return { user, router, ...utils }
}
