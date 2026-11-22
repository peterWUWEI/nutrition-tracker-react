import type { Meal, MealItem } from '../types/meal.ts'

// Food values are per serving and quantityConsumed is a number of servings.

export function itemEnergy(item: MealItem): number {
  return item.quantityConsumed * item.food.energyInKcal
}

// Total energy of a meal in whole kcal.
export function mealEnergy(meal: Meal): number {
  return Math.round(meal.items.reduce((sum, item) => sum + itemEnergy(item), 0))
}

// Total energy of several meals in whole kcal.
export function mealsEnergy(meals: Meal[]): number {
  return Math.round(meals.flatMap((meal) => meal.items).reduce((sum, item) => sum + itemEnergy(item), 0))
}

// How much was eaten in the food's own unit, e.g. "150 g" or "500 ml".
export function formatAmount(item: MealItem): string {
  const amount = Number((item.quantityConsumed * item.food.servingSize).toFixed(1))
  const unit = item.food.servingUnit === 'gram' ? 'g' : 'ml'
  return `${amount} ${unit}`
}
