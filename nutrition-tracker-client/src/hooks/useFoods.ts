import { useCallback, useEffect, useState } from 'react'

import { createFood, deleteFood, listFoods } from '../api/foods.ts'
import type { Food, NewFood } from '../types/food.ts'

// Custom hook that owns the foods list: loading it, adding to it and removing from it.
// Components that use it stay focused on rendering.
export function useFoods() {
  const [foods, setFoods] = useState<Food[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // AbortController cancels the request if the component unmounts first
    // (React StrictMode mounts components twice in development).
    const controller = new AbortController()

    listFoods(controller.signal)
      .then((data) => setFoods(data))
      .catch((err: unknown) => {
        if (!controller.signal.aborted) {
          setError(err instanceof Error ? err.message : 'Failed to load foods')
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      })

    return () => controller.abort()
  }, [])

  const addFood = useCallback(async (newFood: NewFood) => {
    const created = await createFood(newFood)
    setFoods((current) => [created, ...current])
  }, [])

  const removeFood = useCallback(async (id: number) => {
    await deleteFood(id)
    setFoods((current) => current.filter((food) => food.id !== id))
  }, [])

  return { foods, loading, error, addFood, removeFood }
}
