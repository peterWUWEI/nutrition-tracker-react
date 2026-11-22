import type { Meal, MealInput } from '../types/meal.ts'
import { apiRequest } from './client.ts'

// Meals eaten on a calendar date (YYYY-MM-DD) in the given IANA timezone.
export function listMeals(date: string, timezone: string, signal?: AbortSignal): Promise<Meal[]> {
  const params = new URLSearchParams({ date, timezone })
  return apiRequest<Meal[]>(`/meals?${params}`, { signal })
}

export function createMeal(input: MealInput): Promise<Meal> {
  return apiRequest<Meal>('/meals', { method: 'POST', body: JSON.stringify(input) })
}

export function updateMeal(id: number, changes: Partial<MealInput>): Promise<Meal> {
  return apiRequest<Meal>(`/meals/${id}`, { method: 'PATCH', body: JSON.stringify(changes) })
}

export function deleteMeal(id: number): Promise<void> {
  return apiRequest<void>(`/meals/${id}`, { method: 'DELETE' })
}
