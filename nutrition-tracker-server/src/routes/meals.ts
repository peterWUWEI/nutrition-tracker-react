import { Router } from 'express'
import { z } from 'zod'

import type { Prisma } from '../generated/prisma/client.js'
import { dayRangeInTimeZone, isValidCalendarDate, isValidTimeZone } from '../lib/dates.js'
import { prisma } from '../lib/prisma.js'
import { HttpError } from '../middleware/errorHandler.js'

export const mealsRouter = Router()

// A meal can be changed or deleted only within this many hours of when it was eaten.
const EDIT_WINDOW_HOURS = 48
// Allow a client clock that runs slightly ahead of the server's.
const CLOCK_TOLERANCE_MS = 60 * 1000

// ---------- Validation ----------
const title = z.enum(['breakfast', 'lunch', 'dinner', 'snacks', 'others'])

const eatenAt = z.iso
  .datetime({ offset: true })
  .transform((value) => new Date(value))
  .refine((date) => date.getTime() <= Date.now() + CLOCK_TOLERANCE_MS, "eatenAt can't be in the future")

const items = z
  .array(
    z
      .object({
        foodId: z.number().int().positive(),
        quantityConsumed: z.number().positive(), // number of servings
      })
      .strict(),
  )
  .min(1, 'Add at least one food')
  .refine((list) => new Set(list.map((item) => item.foodId)).size === list.length, {
    message: 'Each food can only be listed once: a foodId appears more than once',
  })

const newMeal = z.object({ title, eatenAt: eatenAt.optional(), items }).strict()
const mealChanges = newMeal.partial() // .strict() carries over, so `id` is rejected

const dayQuery = z.object({
  date: z.string().refine(isValidCalendarDate, 'date must be a real date written as YYYY-MM-DD'),
  timezone: z.string().default('UTC').refine(isValidTimeZone, 'timezone must be an IANA name like Asia/Singapore'),
})

const idParam = z.coerce.number().int().positive()

// ---------- Helpers ----------
const withFoods = { items: { include: { food: true }, orderBy: { id: 'asc' } } } satisfies Prisma.MealInclude
type MealWithFoods = Prisma.MealGetPayload<{ include: typeof withFoods }>

const isEditable = (meal: { eatenAt: Date }) =>
  Date.now() - meal.eatenAt.getTime() < EDIT_WINDOW_HOURS * 60 * 60 * 1000

// The JSON shape described in docs/api-spec.md.
function toResponse(meal: MealWithFoods) {
  return {
    id: meal.id,
    title: meal.title,
    eatenAt: meal.eatenAt,
    editable: isEditable(meal),
    items: meal.items.map((item) => ({ foodId: item.foodId, quantityConsumed: item.quantityConsumed, food: item.food })),
    createdAt: meal.createdAt,
    updatedAt: meal.updatedAt,
  }
}

async function checkFoodsExist(foodIds: number[]) {
  const found = await prisma.food.findMany({ where: { id: { in: foodIds } }, select: { id: true } })
  const missing = foodIds.filter((id) => !found.some((food) => food.id === id))
  if (missing.length > 0) {
    throw new HttpError(400, `Food ${missing.join(', ')} not found`)
  }
}

async function findEditableMeal(id: number) {
  const meal = await prisma.meal.findUnique({ where: { id } })
  if (!meal) {
    throw new HttpError(404, 'Meal not found')
  }
  if (!isEditable(meal)) {
    throw new HttpError(403, `Meals can only be changed or deleted within ${EDIT_WINDOW_HOURS} hours of being eaten`)
  }
  return meal
}

// ---------- Routes ----------

// POST /api/meals: add a meal
mealsRouter.post('/', async (req, res) => {
  const meal = newMeal.parse(req.body)
  await checkFoodsExist(meal.items.map((item) => item.foodId))

  const created = await prisma.meal.create({
    data: {
      title: meal.title,
      eatenAt: meal.eatenAt ?? new Date(),
      items: { create: meal.items },
    },
    include: withFoods,
  })
  res.status(201).json(toResponse(created))
})

// GET /api/meals?date=2026-01-15&timezone=Asia/Singapore: meals eaten on that day, earliest first
mealsRouter.get('/', async (req, res) => {
  const { date, timezone } = dayQuery.parse(req.query)
  const { start, end } = dayRangeInTimeZone(date, timezone)

  const meals = await prisma.meal.findMany({
    where: { eatenAt: { gte: start, lt: end } },
    orderBy: { eatenAt: 'asc' },
    include: withFoods,
  })
  res.json(meals.map(toResponse))
})

// PATCH /api/meals/:id: change title, eatenAt and/or items (items replace the whole list)
mealsRouter.patch('/:id', async (req, res) => {
  const id = idParam.parse(req.params.id)
  const changes = mealChanges.parse(req.body ?? {})
  if (Object.values(changes).every((value) => value === undefined)) {
    throw new HttpError(400, 'Nothing to update: send title, eatenAt or items')
  }

  await findEditableMeal(id)
  if (changes.items) {
    await checkFoodsExist(changes.items.map((item) => item.foodId))
  }

  const updated = await prisma.meal.update({
    where: { id },
    data: {
      title: changes.title,
      eatenAt: changes.eatenAt,
      // Replace the items: remove the old ones and add the new list (in one transaction).
      items: changes.items ? { deleteMany: {}, create: changes.items } : undefined,
    },
    include: withFoods,
  })
  res.json(toResponse(updated))
})

// DELETE /api/meals/:id: delete a meal (its foods are kept)
mealsRouter.delete('/:id', async (req, res) => {
  const meal = await findEditableMeal(idParam.parse(req.params.id))
  await prisma.meal.delete({ where: { id: meal.id } })
  res.status(204).end()
})
