// Spec: nutrition maths for meals. Food values are per serving; quantities are servings.
import { describe, expect, it } from 'vitest'

import type { FoodSummary } from '../types/food.ts'
import type { Meal } from '../types/meal.ts'
import { formatAmount, itemEnergy, mealEnergy, mealsEnergy } from './nutrition.ts'

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

const meal = (items: Meal['items']): Meal => ({
  id: 1,
  title: 'breakfast',
  eatenAt: '2026-11-22T07:30:00.000Z',
  editable: true,
  items,
  createdAt: '2026-11-22T07:30:00.000Z',
  updatedAt: '2026-11-22T07:30:00.000Z',
})

describe('nutrition helpers', () => {
  it('calculates the energy of one item from servings × energy per serving', () => {
    expect(itemEnergy({ foodId: 1, quantityConsumed: 1.5, food: apple })).toBe(78)
  })

  it('adds up the energy of a meal, rounded to whole kcal', () => {
    const breakfast = meal([
      { foodId: 1, quantityConsumed: 2, food: apple },
      { foodId: 2, quantityConsumed: 0.5, food: juice },
    ])

    expect(mealEnergy(breakfast)).toBe(160)
  })

  it('adds up the energy of several meals', () => {
    const meals = [
      meal([{ foodId: 1, quantityConsumed: 2, food: apple }]),
      meal([{ foodId: 2, quantityConsumed: 1, food: juice }]),
    ]

    expect(mealsEnergy(meals)).toBe(216)
  })

  it('shows the amount eaten in the food’s own unit', () => {
    expect(formatAmount({ foodId: 1, quantityConsumed: 1.5, food: apple })).toBe('150 g')
    expect(formatAmount({ foodId: 2, quantityConsumed: 2, food: juice })).toBe('500 ml')
  })
})
