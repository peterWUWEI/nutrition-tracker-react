import type { Food, FoodSummary, NewFood } from '../types/food.ts'
import type { Page } from '../types/page.ts'
import { apiRequest } from './client.ts'

export interface FoodListParams {
  page: number // starts at 1
  pageSize: number
  search: string
}

// One page of foods sorted by name, optionally filtered by part of the name.
export function listFoods({ page, pageSize, search }: FoodListParams, signal?: AbortSignal): Promise<Page<Food>> {
  const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) })
  if (search) {
    params.set('search', search)
  }
  return apiRequest<Page<Food>>(`/foods?${params}`, { signal })
}

// Creates a food. Sent as multipart/form-data because it includes the picture file.
export function createFood(food: NewFood, picture: File): Promise<Food> {
  const form = new FormData()
  for (const [key, value] of Object.entries(food)) {
    if (value !== undefined && value !== null) {
      form.append(key, String(value))
    }
  }
  form.append('picture', picture)
  return apiRequest<Food>('/foods', { method: 'POST', body: form })
}

export function deleteFood(id: number): Promise<void> {
  return apiRequest<void>(`/foods/${id}`, { method: 'DELETE' })
}

// Searches foods by name (first 20 matches), for pickers like the one in the meal dialog.
export async function searchFoods(search: string, signal?: AbortSignal): Promise<FoodSummary[]> {
  const params = new URLSearchParams({ search, pageSize: '20' })
  const page = await apiRequest<Page<FoodSummary>>(`/foods?${params}`, { signal })
  return page.data
}
