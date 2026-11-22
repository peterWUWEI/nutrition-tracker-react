import { useCallback, useEffect, useState } from 'react'

import { createFood, deleteFood, listFoods, type FoodListParams } from '../api/foods.ts'
import type { Food, NewFood } from '../types/food.ts'

interface LoadedPage {
  key: string // which request these results belong to
  foods: Food[]
  totalItems: number
  error: string | null
}

// Loads one page of foods for the given page/pageSize/search, and reloads it after a food
// is added or deleted (so the list stays sorted and the counts stay right).
export function useFoods({ page, pageSize, search }: FoodListParams) {
  const [loaded, setLoaded] = useState<LoadedPage | null>(null)
  const [reloadCount, setReloadCount] = useState(0)
  const key = JSON.stringify({ page, pageSize, search, reloadCount })

  useEffect(() => {
    const controller = new AbortController()

    listFoods({ page, pageSize, search }, controller.signal)
      .then((result) =>
        setLoaded({ key, foods: result.data, totalItems: result.pagination.totalItems, error: null }),
      )
      .catch((err: unknown) => {
        if (!controller.signal.aborted) {
          setLoaded({ key, foods: [], totalItems: 0, error: err instanceof Error ? err.message : 'Failed to load foods' })
        }
      })

    return () => controller.abort()
  }, [key, page, pageSize, search])

  // While a new request is in flight, keep showing the previous results (no flicker).
  const reload = useCallback(() => setReloadCount((count) => count + 1), [])

  const addFood = useCallback(
    async (food: NewFood, picture: File) => {
      await createFood(food, picture)
      reload()
    },
    [reload],
  )

  const removeFood = useCallback(
    async (id: number) => {
      await deleteFood(id)
      reload()
    },
    [reload],
  )

  return {
    foods: loaded?.foods ?? [],
    totalItems: loaded?.totalItems ?? 0,
    loading: loaded?.key !== key,
    error: loaded?.error ?? null,
    addFood,
    removeFood,
  }
}
