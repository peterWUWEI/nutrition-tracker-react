import { useCallback, useEffect, useState } from 'react'

import * as mealsApi from '../api/meals.ts'
import type { Meal, MealInput } from '../types/meal.ts'
import { getTimeZone } from '../utils/date.ts'

interface LoadedMeals {
  date: string // the date these meals belong to
  meals: Meal[]
  error: string | null
}

const byEatenAt = (a: Meal, b: Meal) => a.eatenAt.localeCompare(b.eatenAt)

// Loads the meals of one day and keeps the list up to date as meals are added, changed or removed.
export function useMeals(date: string) {
  const [loaded, setLoaded] = useState<LoadedMeals | null>(null)

  useEffect(() => {
    const controller = new AbortController()

    mealsApi
      .listMeals(date, getTimeZone(), controller.signal)
      .then((meals) => setLoaded({ date, meals: [...meals].sort(byEatenAt), error: null }))
      .catch((err: unknown) => {
        if (!controller.signal.aborted) {
          setLoaded({ date, meals: [], error: err instanceof Error ? err.message : 'Failed to load meals' })
        }
      })

    return () => controller.abort()
  }, [date])

  // Loading is derived: we're loading until the meals for the current date have arrived.
  const isCurrent = loaded?.date === date
  const meals = isCurrent ? loaded.meals : []

  const addMeal = useCallback(async (input: MealInput) => {
    const created = await mealsApi.createMeal(input)
    setLoaded((current) => current && { ...current, meals: [...current.meals, created].sort(byEatenAt) })
  }, [])

  const updateMeal = useCallback(async (id: number, input: MealInput) => {
    const updated = await mealsApi.updateMeal(id, input)
    setLoaded(
      (current) =>
        current && { ...current, meals: current.meals.map((meal) => (meal.id === id ? updated : meal)).sort(byEatenAt) },
    )
  }, [])

  const removeMeal = useCallback(async (id: number) => {
    await mealsApi.deleteMeal(id)
    setLoaded((current) => current && { ...current, meals: current.meals.filter((meal) => meal.id !== id) })
  }, [])

  return {
    meals,
    loading: !isCurrent,
    error: isCurrent ? loaded.error : null,
    addMeal,
    updateMeal,
    removeMeal,
  }
}
