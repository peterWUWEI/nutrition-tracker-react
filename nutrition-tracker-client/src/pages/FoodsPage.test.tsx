// Spec: Food management page (uses the Foods API in nutrition-tracker-server/docs/api-spec.md).
// - Paginated, searchable list of foods with their picture and nutrition per serving
// - Add a food with every field from the design and a picture (JPEG, PNG or WebP, max 5 MB)
// - Delete a food after confirming
import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import type { UserEvent } from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ApiError } from '../api/client.ts'
import { createFood, deleteFood, listFoods } from '../api/foods.ts'
import { renderApp } from '../test/renderApp.tsx'
import type { Food } from '../types/food.ts'
import type { Page } from '../types/page.ts'

vi.mock('../api/foods.ts')

const apple: Food = {
  id: 1,
  name: 'Apple',
  type: 'food',
  servingSize: 100,
  servingUnit: 'gram',
  servingsPerPackage: null,
  energyInKcal: 52,
  proteinInGram: 0.3,
  carbsInGram: 14,
  fatInGram: 0.2,
  sodiumInMg: 1,
  cholesterolInMg: null,
  dietaryFibreInGram: 2.4,
  brand: 'Fresh Farms',
  pictureUrl: '/uploads/foods/apple.png',
  createdAt: '2026-11-22T08:00:00.000Z',
  updatedAt: '2026-11-22T08:00:00.000Z',
}
const juice: Food = {
  ...apple,
  id: 2,
  name: 'Orange juice',
  type: 'beverage',
  servingSize: 250,
  servingUnit: 'ml',
  energyInKcal: 112,
  proteinInGram: 1.7,
  carbsInGram: 26,
  fatInGram: 0.5,
  brand: null,
  pictureUrl: '/uploads/foods/juice.png',
}

function pageOf(data: Food[], pagination: Partial<Page<Food>['pagination']> = {}): Page<Food> {
  return { data, pagination: { page: 1, pageSize: 10, totalItems: data.length, totalPages: 1, ...pagination } }
}

const pngFile = () => new File(['fake png bytes'], 'banana.png', { type: 'image/png' })

async function openAddDialog(user: UserEvent) {
  await screen.findByRole('rowheader', { name: /Apple/ })
  await user.click(screen.getByRole('button', { name: 'Add food' }))
  return screen.getByRole('dialog', { name: 'Add food' })
}

const field = (dialog: HTMLElement, label: string) => within(dialog).getByLabelText(label, { exact: false })

async function fillRequiredFields(user: UserEvent, dialog: HTMLElement) {
  await user.type(field(dialog, 'Name'), 'Banana')
  await user.type(field(dialog, 'Serving size'), '118')
  await user.type(field(dialog, 'Energy (kcal)'), '105')
  await user.type(field(dialog, 'Protein (g)'), '1.3')
  await user.type(field(dialog, 'Carbs (g)'), '27')
  await user.type(field(dialog, 'Fat (g)'), '0.4')
  await user.upload(within(dialog).getByLabelText('Picture'), pngFile())
}

const save = (user: UserEvent, dialog: HTMLElement) => user.click(within(dialog).getByRole('button', { name: 'Save' }))

describe('Food management page', () => {
  beforeEach(() => {
    vi.mocked(listFoods).mockResolvedValue(pageOf([apple, juice]))
  })

  describe('listing foods', () => {
    it('shows each food with its picture, brand, serving and nutrition', async () => {
      renderApp('/foods')

      expect(await screen.findByRole('heading', { level: 1, name: 'Food management' })).toBeInTheDocument()
      const appleRow = (await screen.findByRole('rowheader', { name: /Apple/ })).closest('tr')!
      expect(within(appleRow).getByRole('img', { name: 'Apple' })).toHaveAttribute('src', '/uploads/foods/apple.png')
      expect(appleRow).toHaveTextContent('Fresh Farms')
      expect(appleRow).toHaveTextContent('100 g')
      expect(appleRow).toHaveTextContent('52 kcal')

      const juiceRow = screen.getByRole('rowheader', { name: /Orange juice/ }).closest('tr')!
      expect(juiceRow).toHaveTextContent('Beverage')
      expect(juiceRow).toHaveTextContent('250 ml')

      expect(listFoods).toHaveBeenCalledWith({ page: 1, pageSize: 10, search: '' }, expect.any(AbortSignal))
    })

    it('shows how many foods there are and moves between pages', async () => {
      vi.mocked(listFoods).mockResolvedValue(pageOf([apple], { totalItems: 12, totalPages: 2 }))
      const { user } = renderApp('/foods')
      await screen.findByRole('rowheader', { name: /Apple/ })
      expect(screen.getByText('1–10 of 12')).toBeInTheDocument()

      await user.click(screen.getByRole('button', { name: 'Go to next page' }))

      await waitFor(() =>
        expect(listFoods).toHaveBeenLastCalledWith({ page: 2, pageSize: 10, search: '' }, expect.any(AbortSignal)),
      )
    })

    it('changes how many foods are shown per page', async () => {
      const { user } = renderApp('/foods')
      await screen.findByRole('rowheader', { name: /Apple/ })

      await user.click(screen.getByRole('combobox', { name: /Rows per page/ }))
      await user.click(screen.getByRole('option', { name: '25' }))

      await waitFor(() =>
        expect(listFoods).toHaveBeenLastCalledWith({ page: 1, pageSize: 25, search: '' }, expect.any(AbortSignal)),
      )
    })

    it('searches foods by name', async () => {
      const { user } = renderApp('/foods')
      await screen.findByRole('rowheader', { name: /Apple/ })

      await user.type(screen.getByRole('searchbox', { name: 'Search foods' }), 'yog')

      await waitFor(() =>
        expect(listFoods).toHaveBeenLastCalledWith({ page: 1, pageSize: 10, search: 'yog' }, expect.any(AbortSignal)),
      )
    })

    it('says so when there are no foods yet', async () => {
      vi.mocked(listFoods).mockResolvedValue(pageOf([]))

      renderApp('/foods')

      expect(await screen.findByText('No foods yet. Add your first one.')).toBeInTheDocument()
    })

    it('shows an error when the foods cannot be loaded', async () => {
      vi.mocked(listFoods).mockRejectedValue(new ApiError('Server unavailable', 500))

      renderApp('/foods')

      expect(await screen.findByText('Server unavailable')).toBeInTheDocument()
    })
  })

  describe('adding a food', () => {
    it('adds a food with every field and a picture', async () => {
      vi.mocked(createFood).mockResolvedValue({ ...apple, id: 3, name: 'Banana' })
      const { user } = renderApp('/foods')
      const dialog = await openAddDialog(user)

      await fillRequiredFields(user, dialog)
      await user.type(field(dialog, 'Brand'), 'Fresh Farms')
      await user.type(field(dialog, 'Servings per package'), '6')
      await user.type(field(dialog, 'Sodium (mg)'), '1')
      await user.type(field(dialog, 'Cholesterol (mg)'), '0')
      await user.type(field(dialog, 'Dietary fibre (g)'), '3.1')
      expect(within(dialog).getByRole('img', { name: 'Picture preview' })).toBeInTheDocument()
      const callsBefore = vi.mocked(listFoods).mock.calls.length

      await save(user, dialog)

      expect(createFood).toHaveBeenCalledWith(
        {
          name: 'Banana',
          type: 'food',
          servingSize: 118,
          servingUnit: 'gram',
          servingsPerPackage: 6,
          energyInKcal: 105,
          proteinInGram: 1.3,
          carbsInGram: 27,
          fatInGram: 0.4,
          sodiumInMg: 1,
          cholesterolInMg: 0,
          dietaryFibreInGram: 3.1,
          brand: 'Fresh Farms',
        },
        expect.any(File),
      )
      expect(vi.mocked(createFood).mock.calls[0][1].name).toBe('banana.png')
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
      // The list is reloaded so the new food appears in its sorted place.
      await waitFor(() => expect(vi.mocked(listFoods).mock.calls.length).toBeGreaterThan(callsBefore))
    })

    it('leaves out optional fields that are empty', async () => {
      vi.mocked(createFood).mockResolvedValue({ ...apple, id: 3, name: 'Banana' })
      const { user } = renderApp('/foods')
      const dialog = await openAddDialog(user)

      await fillRequiredFields(user, dialog)
      await save(user, dialog)

      expect(vi.mocked(createFood).mock.calls[0][0]).toEqual({
        name: 'Banana',
        type: 'food',
        servingSize: 118,
        servingUnit: 'gram',
        energyInKcal: 105,
        proteinInGram: 1.3,
        carbsInGram: 27,
        fatInGram: 0.4,
      })
    })

    it('measures beverages in ml', async () => {
      vi.mocked(createFood).mockResolvedValue(juice)
      const { user } = renderApp('/foods')
      const dialog = await openAddDialog(user)
      expect(within(dialog).getByText('g')).toBeInTheDocument()

      await user.click(within(dialog).getByRole('combobox', { name: 'Type' }))
      await user.click(screen.getByRole('option', { name: 'Beverage' }))
      expect(within(dialog).getByText('ml')).toBeInTheDocument()

      await fillRequiredFields(user, dialog)
      await save(user, dialog)

      expect(createFood).toHaveBeenCalledWith(expect.objectContaining({ type: 'beverage', servingUnit: 'ml' }), expect.any(File))
    })

    it('checks the form before saving', async () => {
      const { user } = renderApp('/foods')
      const dialog = await openAddDialog(user)
      const alert = () => within(dialog).getByRole('alert')

      await save(user, dialog)
      expect(alert()).toHaveTextContent('Enter a name.')

      await user.type(field(dialog, 'Name'), 'Banana')
      await save(user, dialog)
      expect(alert()).toHaveTextContent('Serving size must be more than 0.')

      await user.type(field(dialog, 'Serving size'), '118')
      await save(user, dialog)
      expect(alert()).toHaveTextContent('Enter energy, protein, carbs and fat.')

      await user.type(field(dialog, 'Energy (kcal)'), '105')
      await user.type(field(dialog, 'Protein (g)'), '1.3')
      await user.type(field(dialog, 'Carbs (g)'), '27')
      await user.type(field(dialog, 'Fat (g)'), '-1')
      await save(user, dialog)
      expect(alert()).toHaveTextContent("Nutrition values can't be negative.")

      await user.clear(field(dialog, 'Fat (g)'))
      await user.type(field(dialog, 'Fat (g)'), '0.4')
      await user.type(field(dialog, 'Servings per package'), '0')
      await save(user, dialog)
      expect(alert()).toHaveTextContent('Servings per package must be more than 0.')

      await user.clear(field(dialog, 'Servings per package'))
      await save(user, dialog)
      expect(alert()).toHaveTextContent('Choose a picture.')

      expect(createFood).not.toHaveBeenCalled()
    })

    it('only accepts JPEG, PNG or WebP pictures up to 5 MB', async () => {
      const { user } = renderApp('/foods')
      const dialog = await openAddDialog(user)
      await fillRequiredFields(user, dialog)
      const pictureInput = within(dialog).getByLabelText('Picture')
      expect(pictureInput).toHaveAttribute('accept', 'image/jpeg,image/png,image/webp')

      fireEvent.change(pictureInput, { target: { files: [new File(['gif'], 'anim.gif', { type: 'image/gif' })] } })
      expect(within(dialog).getByRole('alert')).toHaveTextContent('The picture must be a JPEG, PNG or WebP image.')

      const tooBig = new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'huge.png', { type: 'image/png' })
      fireEvent.change(pictureInput, { target: { files: [tooBig] } })
      expect(within(dialog).getByRole('alert')).toHaveTextContent('The picture must be 5 MB or smaller.')
    })

    it('shows the server error and keeps the dialog open', async () => {
      vi.mocked(createFood).mockRejectedValue(new ApiError('A food named "Banana" already exists', 409))
      const { user } = renderApp('/foods')
      const dialog = await openAddDialog(user)

      await fillRequiredFields(user, dialog)
      await save(user, dialog)

      expect(await within(dialog).findByRole('alert')).toHaveTextContent('A food named "Banana" already exists')
      expect(screen.getByRole('dialog', { name: 'Add food' })).toBeInTheDocument()
    })
  })

  describe('deleting a food', () => {
    it('deletes a food after confirming', async () => {
      vi.mocked(deleteFood).mockResolvedValue(undefined)
      const { user } = renderApp('/foods')
      await screen.findByRole('rowheader', { name: /Apple/ })
      const callsBefore = vi.mocked(listFoods).mock.calls.length

      await user.click(screen.getByRole('button', { name: 'Delete Apple' }))
      await user.click(within(screen.getByRole('dialog', { name: 'Delete Apple?' })).getByRole('button', { name: 'Delete' }))

      expect(deleteFood).toHaveBeenCalledWith(1)
      await waitFor(() => expect(vi.mocked(listFoods).mock.calls.length).toBeGreaterThan(callsBefore))
    })

    it('explains why a food could not be deleted', async () => {
      vi.mocked(deleteFood).mockRejectedValue(new ApiError('This food is part of a meal', 409))
      const { user } = renderApp('/foods')
      await screen.findByRole('rowheader', { name: /Apple/ })

      await user.click(screen.getByRole('button', { name: 'Delete Apple' }))
      await user.click(within(screen.getByRole('dialog', { name: 'Delete Apple?' })).getByRole('button', { name: 'Delete' }))

      expect(await screen.findByText('This food is part of a meal')).toBeInTheDocument()
    })
  })
})
