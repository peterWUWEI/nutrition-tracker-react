// Foods as described in nutrition-tracker-server/docs/api-spec.md. All nutrition values are per serving.

export type FoodType = 'food' | 'beverage'
export type ServingUnit = 'gram' | 'ml'

// Shape of a food returned by the API (dates arrive as ISO strings; unset optional fields are null).
export interface Food {
  id: number
  name: string
  type: FoodType
  servingSize: number
  servingUnit: ServingUnit // gram for food, ml for beverages
  servingsPerPackage: number | null
  energyInKcal: number
  proteinInGram: number
  carbsInGram: number
  fatInGram: number
  sodiumInMg: number | null
  cholesterolInMg: number | null
  dietaryFibreInGram: number | null
  brand: string | null
  pictureUrl: string
  createdAt: string
  updatedAt: string
}

// The fields the user fills in to create a food (the picture is sent separately as a file).
export interface NewFood {
  name: string
  type: FoodType
  servingSize: number
  servingUnit: ServingUnit
  servingsPerPackage?: number
  energyInKcal: number
  proteinInGram: number
  carbsInGram: number
  fatInGram: number
  sodiumInMg?: number
  cholesterolInMg?: number
  dietaryFibreInGram?: number
  brand?: string
}

// The food details the meal pages need.
export type FoodSummary = Pick<
  Food,
  'id' | 'name' | 'type' | 'servingSize' | 'servingUnit' | 'energyInKcal' | 'proteinInGram' | 'carbsInGram' | 'fatInGram'
>

export const unitLabel = (unit: ServingUnit) => (unit === 'gram' ? 'g' : 'ml')
