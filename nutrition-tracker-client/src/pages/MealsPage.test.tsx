// Spec: Meal management page.
// - View the meals of any day (today by default), with foods, servings and energy
// - Add, edit and delete meals for today only; other days are read-only
// The api/ modules are mocked; the real requests follow nutrition-tracker-server/docs/api-spec.md.
import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import type { UserEvent } from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { ApiError } from '../api/client.ts'
import { searchFoods } from '../api/foods.ts'
import { createMeal, deleteMeal, listMeals, updateMeal } from '../api/meals.ts'
import { renderApp } from '../test/renderApp.tsx'
import type { FoodSummary } from '../types/food.ts'
import type { Meal } from '../types/meal.ts'

vi.mock('../api/foods.ts')
vi.mock('../api/meals.ts')

const apple: FoodSummary = {
  id: 1,
  name: 'Apple',
  type: 'food',
  servingSize: 100,
  servingUnit: 'gram',
  energyInKcal: 52,
  proteinInGram: 0.3,
  carbsInGram: 14,
  fatInGram: 0.2,
}
const juice: FoodSummary = {
  id: 2,
  name: 'Orange juice',
  type: 'beverage',
  servingSize: 250,
  servingUnit: 'ml',
  energyInKcal: 112,
  proteinInGram: 1.7,
  carbsInGram: 26,
  fatInGram: 0.5,
}
const oatmeal: FoodSummary = {
  id: 3,
  name: 'Oatmeal',
  type: 'food',
  servingSize: 40,
  servingUnit: 'gram',
  energyInKcal: 150,
  proteinInGram: 5,
  carbsInGram: 27,
  fatInGram: 2.5,
}

function makeMeal(overrides: Partial<Meal>): Meal {
  return {
    id: 1,
    title: 'breakfast',
    eatenAt: '2026-11-22T07:30:00.000Z',
    editable: true,
    items: [],
    createdAt: '2026-11-22T07:30:00.000Z',
    updatedAt: '2026-11-22T07:30:00.000Z',
    ...overrides,
  }
}

// 2 × 52 + 1 × 112 = 216 kcal
const breakfast = makeMeal({
  id: 1,
  title: 'breakfast',
  eatenAt: '2026-11-22T07:30:00.000Z',
  items: [
    { foodId: 1, quantityConsumed: 2, food: apple },
    { foodId: 2, quantityConsumed: 1, food: juice },
  ],
})
// 1.5 × 150 + 1 × 52 = 277 kcal
const lunch = makeMeal({
  id: 2,
  title: 'lunch',
  eatenAt: '2026-11-22T09:00:00.000Z',
  items: [
    { foodId: 3, quantityConsumed: 1.5, food: oatmeal },
    { foodId: 1, quantityConsumed: 1, food: apple },
  ],
})

const mealCard = (title: string) => screen.getByRole('region', { name: title })
const cellTexts = (row: HTMLElement) =>
  within(row)
    .getAllByRole('cell')
    .map((cell) => cell.textContent)

// Picks a food in the n-th "Food" search box of the meal dialog.
async function chooseFood(user: UserEvent, index: number, name: string) {
  const input = screen.getAllByRole('combobox', { name: 'Food' })[index]
  await user.click(input)
  await user.type(input, name.slice(0, 3))
  await user.click(await screen.findByRole('option', { name: new RegExp(name) }))
}

async function chooseMealType(user: UserEvent, label: string) {
  await user.click(screen.getByRole('combobox', { name: 'Meal' }))
  await user.click(await screen.findByRole('option', { name: label }))
}

async function setServings(user: UserEvent, index: number, value: string) {
  const input = screen.getAllByRole('spinbutton', { name: 'Servings' })[index]
  await user.clear(input)
  await user.type(input, value)
}

beforeEach(() => {
  // "Now" is 10:00 on 22 Nov 2026 (tests run in UTC). Only Date is faked; timers stay real.
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-11-22T10:00:00.000Z'))

  vi.mocked(listMeals).mockResolvedValue([])
  vi.mocked(searchFoods).mockResolvedValue([apple, juice, oatmeal])
})

afterEach(() => {
  vi.useRealTimers()
})

describe('Meal management page', () => {
  describe('viewing meals', () => {
    it("shows today's meals with their foods, servings and energy", async () => {
      vi.mocked(listMeals).mockResolvedValue([breakfast, lunch])

      renderApp('/meals')

      expect(await screen.findByRole('heading', { level: 2, name: 'Breakfast' })).toBeInTheDocument()
      expect(listMeals).toHaveBeenCalledWith('2026-11-22', 'UTC', expect.any(AbortSignal))

      const card = mealCard('Breakfast')
      expect(within(card).getByText('07:30')).toBeInTheDocument()
      expect(within(card).getByText('216 kcal')).toBeInTheDocument()
      expect(cellTexts(within(card).getByRole('row', { name: /Apple/ }))).toEqual(['Apple', '2', '200 g', '104 kcal'])
      expect(cellTexts(within(card).getByRole('row', { name: /Orange juice/ }))).toEqual([
        'Orange juice',
        '1',
        '250 ml',
        '112 kcal',
      ])

      expect(within(mealCard('Lunch')).getByText('277 kcal')).toBeInTheDocument()
      // Day total: 216 + 277
      expect(screen.getByText('493 kcal')).toBeInTheDocument()
    })

    it('shows the meals in the order they were eaten', async () => {
      vi.mocked(listMeals).mockResolvedValue([lunch, breakfast])

      renderApp('/meals')

      await screen.findByRole('heading', { level: 2, name: 'Breakfast' })
      const titles = screen.getAllByRole('heading', { level: 2 }).map((heading) => heading.textContent)
      expect(titles).toEqual(['Breakfast', 'Lunch'])
    })

    it('says so when no meals were logged', async () => {
      renderApp('/meals')

      expect(await screen.findByText('No meals logged for this day.')).toBeInTheDocument()
    })

    it('shows an error when the meals cannot be loaded', async () => {
      vi.mocked(listMeals).mockRejectedValue(new ApiError('Server unavailable', 500))

      renderApp('/meals')

      expect(await screen.findByText('Server unavailable')).toBeInTheDocument()
    })

    it('shows the day given in the URL', async () => {
      renderApp('/meals?date=2026-11-20')

      await waitFor(() => expect(listMeals).toHaveBeenCalledWith('2026-11-20', 'UTC', expect.any(AbortSignal)))
      expect(screen.getByLabelText('Date')).toHaveValue('2026-11-20')
    })

    it('moves to the previous and next day, but not into the future', async () => {
      const { user, router } = renderApp('/meals')
      await screen.findByText('No meals logged for this day.')
      expect(screen.getByRole('button', { name: 'Next day' })).toBeDisabled()

      await user.click(screen.getByRole('button', { name: 'Previous day' }))

      await waitFor(() => expect(listMeals).toHaveBeenLastCalledWith('2026-11-21', 'UTC', expect.any(AbortSignal)))
      expect(router.state.location.search).toBe('?date=2026-11-21')

      await user.click(screen.getByRole('button', { name: 'Next day' }))

      await waitFor(() => expect(listMeals).toHaveBeenLastCalledWith('2026-11-22', 'UTC', expect.any(AbortSignal)))
    })

    it('picks a day with the date field', async () => {
      renderApp('/meals')
      await screen.findByText('No meals logged for this day.')

      fireEvent.change(screen.getByLabelText('Date'), { target: { value: '2026-11-15' } })

      await waitFor(() => expect(listMeals).toHaveBeenLastCalledWith('2026-11-15', 'UTC', expect.any(AbortSignal)))
    })

    it('jumps back to today', async () => {
      const { user } = renderApp('/meals?date=2026-11-20')
      await screen.findByText('No meals logged for this day.')

      await user.click(screen.getByRole('button', { name: 'Today' }))

      await waitFor(() => expect(listMeals).toHaveBeenLastCalledWith('2026-11-22', 'UTC', expect.any(AbortSignal)))
    })

    it('lets you change only the meals of today', async () => {
      vi.mocked(listMeals).mockResolvedValue([breakfast])
      const { user } = renderApp('/meals')
      await screen.findByRole('heading', { level: 2, name: 'Breakfast' })

      expect(screen.getByRole('button', { name: 'Add meal' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Edit Breakfast at 07:30' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Delete Breakfast at 07:30' })).toBeInTheDocument()

      vi.mocked(listMeals).mockResolvedValue([makeMeal({ ...breakfast, eatenAt: '2026-11-21T07:30:00.000Z' })])
      await user.click(screen.getByRole('button', { name: 'Previous day' }))
      await waitFor(() => expect(listMeals).toHaveBeenLastCalledWith('2026-11-21', 'UTC', expect.any(AbortSignal)))
      await screen.findByRole('heading', { level: 2, name: 'Breakfast' })

      expect(screen.getByText("Only today's meals can be changed.")).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Add meal' })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /^Edit / })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /^Delete / })).not.toBeInTheDocument()
    })
  })

  describe('adding a meal', () => {
    it('adds a meal with several foods for today', async () => {
      vi.mocked(createMeal).mockResolvedValue(
        makeMeal({
          id: 3,
          title: 'lunch',
          eatenAt: '2026-11-22T09:15:00.000Z',
          items: [
            { foodId: 1, quantityConsumed: 1.5, food: apple },
            { foodId: 2, quantityConsumed: 1, food: juice },
          ],
        }),
      )
      const { user } = renderApp('/meals')
      await screen.findByText('No meals logged for this day.')

      await user.click(screen.getByRole('button', { name: 'Add meal' }))
      const dialog = screen.getByRole('dialog', { name: 'Add meal' })
      expect(within(dialog).getByLabelText('Time')).toHaveValue('10:00') // defaults to now

      await chooseMealType(user, 'Lunch')
      fireEvent.change(within(dialog).getByLabelText('Time'), { target: { value: '09:15' } })
      await chooseFood(user, 0, 'Apple')
      await setServings(user, 0, '1.5')
      await user.click(within(dialog).getByRole('button', { name: 'Add another food' }))
      await chooseFood(user, 1, 'Orange juice')
      await user.click(within(dialog).getByRole('button', { name: 'Save' }))

      expect(createMeal).toHaveBeenCalledWith({
        title: 'lunch',
        eatenAt: '2026-11-22T09:15:00.000Z',
        items: [
          { foodId: 1, quantityConsumed: 1.5 },
          { foodId: 2, quantityConsumed: 1 },
        ],
      })
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
      expect(screen.getByRole('heading', { level: 2, name: 'Lunch' })).toBeInTheDocument()
    })

    it('searches foods by what you type', async () => {
      const { user } = renderApp('/meals')
      await screen.findByText('No meals logged for this day.')
      await user.click(screen.getByRole('button', { name: 'Add meal' }))

      await chooseFood(user, 0, 'Oatmeal')

      expect(searchFoods).toHaveBeenCalledWith('Oat', expect.any(AbortSignal))
      expect(screen.getByRole('combobox', { name: 'Food' })).toHaveValue('Oatmeal')
    })

    it('removes a food row', async () => {
      const { user } = renderApp('/meals')
      await screen.findByText('No meals logged for this day.')
      await user.click(screen.getByRole('button', { name: 'Add meal' }))
      await user.click(screen.getByRole('button', { name: 'Add another food' }))
      expect(screen.getAllByRole('combobox', { name: 'Food' })).toHaveLength(2)

      await user.click(screen.getByRole('button', { name: 'Remove food 2' }))

      expect(screen.getAllByRole('combobox', { name: 'Food' })).toHaveLength(1)
    })

    it('checks the meal before saving', async () => {
      const { user } = renderApp('/meals')
      await screen.findByText('No meals logged for this day.')
      await user.click(screen.getByRole('button', { name: 'Add meal' }))
      const dialog = screen.getByRole('dialog', { name: 'Add meal' })
      const save = () => user.click(within(dialog).getByRole('button', { name: 'Save' }))

      await save()
      expect(within(dialog).getByRole('alert')).toHaveTextContent('Choose a meal type.')

      await chooseMealType(user, 'Lunch')
      await save()
      expect(within(dialog).getByRole('alert')).toHaveTextContent('Choose a food for every row.')

      await chooseFood(user, 0, 'Apple')
      await setServings(user, 0, '0')
      await save()
      expect(within(dialog).getByRole('alert')).toHaveTextContent('Servings must be more than 0.')

      await setServings(user, 0, '1')
      await user.click(within(dialog).getByRole('button', { name: 'Add another food' }))
      await chooseFood(user, 1, 'Apple')
      await save()
      expect(within(dialog).getByRole('alert')).toHaveTextContent('Each food can only be added once.')

      await user.click(within(dialog).getByRole('button', { name: 'Remove food 2' }))
      fireEvent.change(within(dialog).getByLabelText('Time'), { target: { value: '23:00' } })
      await save()
      expect(within(dialog).getByRole('alert')).toHaveTextContent("The time can't be in the future.")

      expect(createMeal).not.toHaveBeenCalled()
    })

    it('shows the server error and keeps the dialog open', async () => {
      vi.mocked(createMeal).mockRejectedValue(new ApiError('items.0.foodId: Food 1 not found', 400))
      const { user } = renderApp('/meals')
      await screen.findByText('No meals logged for this day.')
      await user.click(screen.getByRole('button', { name: 'Add meal' }))
      const dialog = screen.getByRole('dialog', { name: 'Add meal' })

      await chooseMealType(user, 'Snacks')
      await chooseFood(user, 0, 'Apple')
      await user.click(within(dialog).getByRole('button', { name: 'Save' }))

      expect(await within(dialog).findByRole('alert')).toHaveTextContent('Food 1 not found')
      expect(screen.getByRole('dialog', { name: 'Add meal' })).toBeInTheDocument()
    })
  })

  describe('editing a meal', () => {
    it('edits a meal from today', async () => {
      vi.mocked(listMeals).mockResolvedValue([breakfast])
      vi.mocked(updateMeal).mockResolvedValue(
        makeMeal({
          ...breakfast,
          items: [
            { foodId: 1, quantityConsumed: 3, food: apple },
            { foodId: 2, quantityConsumed: 1, food: juice },
          ],
        }),
      )
      const { user } = renderApp('/meals')
      await screen.findByRole('heading', { level: 2, name: 'Breakfast' })

      await user.click(screen.getByRole('button', { name: 'Edit Breakfast at 07:30' }))

      const dialog = screen.getByRole('dialog', { name: 'Edit meal' })
      expect(within(dialog).getByRole('combobox', { name: 'Meal' })).toHaveTextContent('Breakfast')
      expect(within(dialog).getByLabelText('Time')).toHaveValue('07:30')
      expect(within(dialog).getAllByRole('combobox', { name: 'Food' }).map((input) => (input as HTMLInputElement).value)).toEqual([
        'Apple',
        'Orange juice',
      ])
      expect(within(dialog).getAllByRole('spinbutton', { name: 'Servings' }).map((input) => (input as HTMLInputElement).value)).toEqual([
        '2',
        '1',
      ])

      await setServings(user, 0, '3')
      await user.click(within(dialog).getByRole('button', { name: 'Save' }))

      expect(updateMeal).toHaveBeenCalledWith(1, {
        title: 'breakfast',
        eatenAt: '2026-11-22T07:30:00.000Z',
        items: [
          { foodId: 1, quantityConsumed: 3 },
          { foodId: 2, quantityConsumed: 1 },
        ],
      })
      // 3 × 52 + 112 = 268 kcal
      expect(await within(mealCard('Breakfast')).findByText('268 kcal')).toBeInTheDocument()
    })
  })

  describe('deleting a meal', () => {
    it('deletes a meal from today after confirming', async () => {
      vi.mocked(listMeals).mockResolvedValue([breakfast, lunch])
      vi.mocked(deleteMeal).mockResolvedValue(undefined)
      const { user } = renderApp('/meals')
      await screen.findByRole('heading', { level: 2, name: 'Breakfast' })

      await user.click(screen.getByRole('button', { name: 'Delete Breakfast at 07:30' }))
      const confirm = screen.getByRole('dialog', { name: 'Delete breakfast?' })
      await user.click(within(confirm).getByRole('button', { name: 'Delete' }))

      expect(deleteMeal).toHaveBeenCalledWith(1)
      await waitFor(() => expect(screen.queryByRole('heading', { level: 2, name: 'Breakfast' })).not.toBeInTheDocument())
      expect(screen.getByRole('heading', { level: 2, name: 'Lunch' })).toBeInTheDocument()
    })

    it('keeps the meal when you cancel', async () => {
      vi.mocked(listMeals).mockResolvedValue([breakfast])
      const { user } = renderApp('/meals')
      await screen.findByRole('heading', { level: 2, name: 'Breakfast' })

      await user.click(screen.getByRole('button', { name: 'Delete Breakfast at 07:30' }))
      await user.click(within(screen.getByRole('dialog', { name: 'Delete breakfast?' })).getByRole('button', { name: 'Cancel' }))

      expect(deleteMeal).not.toHaveBeenCalled()
      expect(screen.getByRole('heading', { level: 2, name: 'Breakfast' })).toBeInTheDocument()
    })
  })
})
