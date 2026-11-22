// Inserts a few sample foods. Run with `npm run db:seed`.
import 'dotenv/config'
import { PrismaPg } from '@prisma/adapter-pg'

import { PrismaClient } from '../src/generated/prisma/client.js'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

const sampleFoods = [
  { name: 'Oatmeal (1 cup cooked)', calories: 158, protein: 6, carbs: 27, fat: 3.2 },
  { name: 'Banana (medium)', calories: 105, protein: 1.3, carbs: 27, fat: 0.4 },
  { name: 'Grilled chicken breast (100 g)', calories: 165, protein: 31, carbs: 0, fat: 3.6 },
  { name: 'Brown rice (1 cup cooked)', calories: 216, protein: 5, carbs: 45, fat: 1.8 },
]

async function main() {
  const existing = await prisma.food.count()
  if (existing > 0) {
    console.log(`Skipping seed: foods table already has ${existing} rows.`)
    return
  }
  const { count } = await prisma.food.createMany({ data: sampleFoods })
  console.log(`Seeded ${count} foods.`)
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
