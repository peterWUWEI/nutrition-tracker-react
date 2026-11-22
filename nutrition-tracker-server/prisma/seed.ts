// Inserts a few sample foods (with a placeholder picture). Run with `npm run db:seed`.
import 'dotenv/config'
import fs from 'node:fs'

import { PrismaPg } from '@prisma/adapter-pg'

import { PrismaClient, type Prisma } from '../src/generated/prisma/client.js'
import { saveFoodPicture } from '../src/lib/pictures.js'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

const placeholderPicture = fs.readFileSync(new URL('./seed-picture.png', import.meta.url))

// Nutrition values are per serving.
const sampleFoods: Omit<Prisma.FoodCreateInput, 'pictureUrl'>[] = [
  { name: 'Oatmeal', type: 'food', servingSize: 40, servingUnit: 'gram', energyInKcal: 150, proteinInGram: 5, carbsInGram: 27, fatInGram: 2.5, dietaryFibreInGram: 4 },
  { name: 'Banana', type: 'food', servingSize: 118, servingUnit: 'gram', energyInKcal: 105, proteinInGram: 1.3, carbsInGram: 27, fatInGram: 0.4, sodiumInMg: 1, dietaryFibreInGram: 3.1 },
  { name: 'Grilled chicken breast', type: 'food', servingSize: 100, servingUnit: 'gram', energyInKcal: 165, proteinInGram: 31, carbsInGram: 0, fatInGram: 3.6, sodiumInMg: 74, cholesterolInMg: 85 },
  { name: 'Brown rice', type: 'food', servingSize: 195, servingUnit: 'gram', energyInKcal: 216, proteinInGram: 5, carbsInGram: 45, fatInGram: 1.8, dietaryFibreInGram: 3.5 },
  { name: 'Greek yogurt', type: 'food', servingSize: 170, servingUnit: 'gram', energyInKcal: 100, proteinInGram: 17, carbsInGram: 6, fatInGram: 0.7, sodiumInMg: 61, brand: 'Fresh Farms', servingsPerPackage: 1 },
  { name: 'Orange juice', type: 'beverage', servingSize: 250, servingUnit: 'ml', energyInKcal: 112, proteinInGram: 1.7, carbsInGram: 26, fatInGram: 0.5, sodiumInMg: 2, brand: 'Sunny Orchards', servingsPerPackage: 4 },
]

async function main() {
  const existing = await prisma.food.count()
  if (existing > 0) {
    console.log(`Skipping seed: foods table already has ${existing} rows.`)
    return
  }
  for (const food of sampleFoods) {
    const pictureUrl = await saveFoodPicture(placeholderPicture, { extension: 'png', mimeType: 'image/png' })
    await prisma.food.create({ data: { ...food, pictureUrl } })
  }
  console.log(`Seeded ${sampleFoods.length} foods.`)
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
