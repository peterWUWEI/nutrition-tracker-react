import { Router } from 'express'
import { z } from 'zod'

import type { Food } from '../generated/prisma/client.js'
import { deleteFoodPicture, detectImageType, saveFoodPicture } from '../lib/pictures.js'
import { prisma } from '../lib/prisma.js'
import { HttpError } from '../middleware/errorHandler.js'
import { uploadPicture } from '../middleware/uploadPicture.js'

export const foodsRouter = Router()

// ---------- Validation ----------
// Form fields arrive as text in multipart requests ("52") and as numbers in JSON (52).
// Empty text counts as "not given"; anything else is converted to a number.
const asNumber = (value: unknown) => {
  if (typeof value !== 'string') return value
  const text = value.trim()
  return text === '' ? undefined : Number(text)
}
const asOptionalText = (value: unknown) => (typeof value === 'string' && value.trim() === '' ? undefined : value)

const positive = z.preprocess(asNumber, z.number().positive())
const nonNegative = z.preprocess(asNumber, z.number().min(0))
const optionalPositive = z.preprocess(asNumber, z.number().positive().nullish())
const optionalNonNegative = z.preprocess(asNumber, z.number().min(0).nullish())

const foodFields = z
  .object({
    name: z.string().trim().min(1, 'Name is required').max(100),
    type: z.enum(['food', 'beverage']),
    servingSize: positive,
    servingUnit: z.enum(['gram', 'ml']),
    servingsPerPackage: optionalPositive,
    energyInKcal: nonNegative,
    proteinInGram: nonNegative,
    carbsInGram: nonNegative,
    fatInGram: nonNegative,
    sodiumInMg: optionalNonNegative,
    cholesterolInMg: optionalNonNegative,
    dietaryFibreInGram: optionalNonNegative,
    brand: z.preprocess(asOptionalText, z.string().trim().max(100).nullish()),
  })
  .strict() // unknown fields (including id) are rejected

// Every field optional, for updates. Required fields still can't be set to null.
const foodChanges = foodFields.partial()

const listQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().trim().optional(),
})

const idParam = z.coerce.number().int().positive()
const nameQuery = z.object({ name: z.string().trim().min(1, 'Give the name of the food to delete') })

// ---------- Rules shared by create and update ----------
const expectedUnit = { food: 'gram', beverage: 'ml' } as const

function checkUnitMatchesType(food: { type: 'food' | 'beverage'; servingUnit: 'gram' | 'ml' }) {
  const unit = expectedUnit[food.type]
  if (food.servingUnit !== unit) {
    throw new HttpError(400, `servingUnit must be "${unit}" for a ${food.type}`)
  }
}

// Names are unique ignoring letter case ("Apple" and "apple" are the same food).
async function checkNameIsFree(name: string, exceptId?: number) {
  const existing = await prisma.food.findFirst({
    where: { name: { equals: name, mode: 'insensitive' }, ...(exceptId ? { NOT: { id: exceptId } } : {}) },
    select: { id: true },
  })
  if (existing) {
    throw new HttpError(409, `A food named "${name}" already exists`)
  }
}

// Checks the uploaded file is a real JPEG, PNG or WebP image and saves it.
async function savePictureFrom(file: Express.Multer.File): Promise<string> {
  const type = detectImageType(file.buffer)
  if (!type) {
    throw new HttpError(400, 'picture must be a JPEG, PNG or WebP image')
  }
  return saveFoodPicture(file.buffer, type)
}

async function findFoodOr404(id: number): Promise<Food> {
  const food = await prisma.food.findUnique({ where: { id } })
  if (!food) {
    throw new HttpError(404, 'Food not found')
  }
  return food
}

async function deleteFood(food: Food) {
  // Keep meal history complete: a food that is part of a meal can't be deleted.
  const usedInMeals = await prisma.mealItem.count({ where: { foodId: food.id } })
  if (usedInMeals > 0) {
    throw new HttpError(409, `${food.name} is part of ${usedInMeals} meal(s) and can't be deleted`)
  }
  await prisma.food.delete({ where: { id: food.id } })
  await deleteFoodPicture(food.pictureUrl)
}

// ---------- Routes ----------

// GET /api/foods?page=1&pageSize=10&search=yog: one page of foods sorted by name
foodsRouter.get('/', async (req, res) => {
  const { page, pageSize, search } = listQuery.parse(req.query)
  const where = search ? { name: { contains: search, mode: 'insensitive' as const } } : {}

  const [totalItems, data] = await prisma.$transaction([
    prisma.food.count({ where }),
    prisma.food.findMany({ where, orderBy: { name: 'asc' }, skip: (page - 1) * pageSize, take: pageSize }),
  ])

  res.json({ data, pagination: { page, pageSize, totalItems, totalPages: Math.ceil(totalItems / pageSize) } })
})

// GET /api/foods/:id: one food
foodsRouter.get('/:id', async (req, res) => {
  res.json(await findFoodOr404(idParam.parse(req.params.id)))
})

// POST /api/foods: create a food (multipart/form-data with a "picture" file)
foodsRouter.post('/', uploadPicture, async (req, res) => {
  if (!req.file) {
    throw new HttpError(400, 'picture is required (a JPEG, PNG or WebP image)')
  }
  const fields = foodFields.parse(req.body ?? {})
  checkUnitMatchesType(fields)
  await checkNameIsFree(fields.name)

  const pictureUrl = await savePictureFrom(req.file)
  try {
    const food = await prisma.food.create({ data: { ...fields, pictureUrl } })
    res.status(201).json(food)
  } catch (error) {
    await deleteFoodPicture(pictureUrl) // don't leave an orphaned file behind
    throw error
  }
})

// PATCH /api/foods/:id: change any fields except id.
// JSON for field changes; multipart/form-data when replacing the picture.
foodsRouter.patch('/:id', uploadPicture, async (req, res) => {
  const id = idParam.parse(req.params.id)
  const changes = foodChanges.parse(req.body ?? {})
  const hasChanges = Object.values(changes).some((value) => value !== undefined) || req.file
  if (!hasChanges) {
    throw new HttpError(400, 'Nothing to update: send at least one field or a new picture')
  }

  const food = await findFoodOr404(id)
  checkUnitMatchesType({ type: changes.type ?? food.type, servingUnit: changes.servingUnit ?? food.servingUnit })
  if (changes.name) {
    await checkNameIsFree(changes.name, id)
  }

  const pictureUrl = req.file ? await savePictureFrom(req.file) : undefined
  const updated = await prisma.food.update({ where: { id }, data: { ...changes, pictureUrl } })
  if (pictureUrl) {
    await deleteFoodPicture(food.pictureUrl) // the old picture is no longer used
  }
  res.json(updated)
})

// DELETE /api/foods/:id: delete by id
foodsRouter.delete('/:id', async (req, res) => {
  await deleteFood(await findFoodOr404(idParam.parse(req.params.id)))
  res.status(204).end()
})

// DELETE /api/foods?name=Apple: delete by name (ignoring letter case)
foodsRouter.delete('/', async (req, res) => {
  const { name } = nameQuery.parse(req.query)
  const food = await prisma.food.findFirst({ where: { name: { equals: name, mode: 'insensitive' } } })
  if (!food) {
    throw new HttpError(404, `No food named "${name}"`)
  }
  await deleteFood(food)
  res.status(204).end()
})
