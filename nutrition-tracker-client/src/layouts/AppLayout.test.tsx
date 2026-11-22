// Spec: the collapsible side menu and the app's routes.
import { screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { renderApp } from '../test/renderApp.tsx'

// [menu label, URL, page heading]
const sections = [
  ['Charts', '/charts', 'Charts'],
  ['Set targets', '/targets', 'Set targets'],
  ['Food management', '/foods', 'Food management'],
  ['Meal management', '/meals', 'Meal management'],
  ['Nutrition report', '/nutrition-report', 'Nutrition report'],
] as const

const menu = () => screen.getByRole('navigation', { name: 'Main menu' })

describe('Side menu', () => {
  it('lists every section in order', () => {
    renderApp('/foods')

    const labels = within(menu())
      .getAllByRole('link')
      .map((link) => link.textContent)

    expect(labels).toEqual(sections.map(([label]) => label))
  })

  it.each(sections)('"%s" opens %s', async (label, path, heading) => {
    const { user, router } = renderApp('/foods')

    await user.click(within(menu()).getByRole('link', { name: label }))

    expect(router.state.location.pathname).toBe(path)
    expect(await screen.findByRole('heading', { level: 1, name: heading })).toBeInTheDocument()
  })

  it('highlights the current section', () => {
    renderApp('/meals')

    expect(within(menu()).getByRole('link', { name: 'Meal management' })).toHaveAttribute('aria-current', 'page')
    expect(within(menu()).getByRole('link', { name: 'Food management' })).not.toHaveAttribute('aria-current')
  })

  it('collapses to icons only and expands again', async () => {
    const { user } = renderApp('/foods')
    expect(within(menu()).getByText('Food management')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Collapse menu' }))

    // Labels are hidden, but every link is still there and still has its name.
    expect(within(menu()).queryByText('Food management')).not.toBeInTheDocument()
    expect(within(menu()).getByRole('link', { name: 'Food management' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Expand menu' }))

    expect(within(menu()).getByText('Food management')).toBeInTheDocument()
  })
})

describe('Routes', () => {
  it('opens Food management at the root URL', async () => {
    const { router } = renderApp('/')

    await waitFor(() => expect(router.state.location.pathname).toBe('/foods'))
    expect(await screen.findByRole('heading', { level: 1, name: 'Food management' })).toBeInTheDocument()
  })

  it.each([
    ['/charts', 'Charts'],
    ['/targets', 'Set targets'],
    ['/nutrition-report', 'Nutrition report'],
  ])('shows an empty placeholder page at %s', async (path, heading) => {
    renderApp(path)

    expect(await screen.findByRole('heading', { level: 1, name: heading })).toBeInTheDocument()
    expect(screen.getByText('Coming soon.')).toBeInTheDocument()
  })

  it('shows a not-found page with a way back for unknown URLs', async () => {
    const { user, router } = renderApp('/does-not-exist')

    expect(await screen.findByRole('heading', { level: 1, name: 'Page not found' })).toBeInTheDocument()

    await user.click(screen.getByRole('link', { name: 'Go to Food management' }))
    expect(router.state.location.pathname).toBe('/foods')
  })
})
