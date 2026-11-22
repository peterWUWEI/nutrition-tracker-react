import type { FoodSummary } from './food.ts'

export const MEAL_TITLES = ['breakfast', 'lunch', 'dinner', 'snacks', 'others'] as const

export type MealTitle = (typeof MEAL_TITLES)[number]

export const mealTitleLabels: Record<MealTitle, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snacks: 'Snacks',
  others: 'Others',
}

export interface MealItem {
  foodId: number
  quantityConsumed: number // number of servings
  food: FoodSummary
}

// Shape of a meal as returned by the Meals API (dates are ISO strings).
export interface Meal {
  id: number
  title: MealTitle
  eatenAt: string
  editable: boolean // false once 48 hours have passed since eatenAt
  items: MealItem[]
  createdAt: string
  updatedAt: string
}

// What the client sends to create or update a meal.
export interface MealInput {
  title: MealTitle
  eatenAt: string
  items: { foodId: number; quantityConsumed: number }[]
}
