// Shape of a food as returned by the API (dates arrive as ISO strings).
export interface Food {
  id: number
  name: string
  calories: number
  protein: number
  carbs: number
  fat: number
  createdAt: string
  updatedAt: string
}

// Fields the user provides when creating a food.
export type NewFood = Pick<Food, 'name' | 'calories' | 'protein' | 'carbs' | 'fat'>
