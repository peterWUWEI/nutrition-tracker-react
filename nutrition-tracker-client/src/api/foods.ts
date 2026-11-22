import type { Food, NewFood } from '../types/food.ts'
import { apiRequest } from './client.ts'

export function listFoods(signal?: AbortSignal): Promise<Food[]> {
  return apiRequest<Food[]>('/foods', { signal })
}

export function createFood(food: NewFood): Promise<Food> {
  return apiRequest<Food>('/foods', {
    method: 'POST',
    body: JSON.stringify(food),
  })
}

export function deleteFood(id: number): Promise<void> {
  return apiRequest<void>(`/foods/${id}`, { method: 'DELETE' })
}
