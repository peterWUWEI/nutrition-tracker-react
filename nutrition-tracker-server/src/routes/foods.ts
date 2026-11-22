import { Router } from 'express'
import { z } from 'zod'

import { prisma } from '../lib/prisma.js'
import { HttpError } from '../middleware/errorHandler.js'

export const foodsRouter = Router()

// Request validation with zod. Invalid input throws a ZodError,
// which the error handler turns into a 400 response.
const foodInput = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100),
  calories: z.number().int().min(0),
  protein: z.number().min(0).default(0),
  carbs: z.number().min(0).default(0),
  fat: z.number().min(0).default(0),
})

const idParam = z.coerce.number().int().positive()

// GET /api/foods – list all foods, newest first
foodsRouter.get('/', async (_req, res) => {
  const foods = await prisma.food.findMany({ orderBy: { createdAt: 'desc' } })
  res.json(foods)
})

// GET /api/foods/:id – get one food
foodsRouter.get('/:id', async (req, res) => {
  const id = idParam.parse(req.params.id)
  const food = await prisma.food.findUnique({ where: { id } })
  if (!food) {
    throw new HttpError(404, 'Food not found')
  }
  res.json(food)
})

// POST /api/foods – create a food
foodsRouter.post('/', async (req, res) => {
  const data = foodInput.parse(req.body)
  const food = await prisma.food.create({ data })
  res.status(201).json(food)
})

// PUT /api/foods/:id – replace a food's fields
foodsRouter.put('/:id', async (req, res) => {
  const id = idParam.parse(req.params.id)
  const data = foodInput.parse(req.body)
  const food = await prisma.food.update({ where: { id }, data })
  res.json(food)
})

// DELETE /api/foods/:id – delete a food
foodsRouter.delete('/:id', async (req, res) => {
  const id = idParam.parse(req.params.id)
  await prisma.food.delete({ where: { id } })
  res.status(204).end()
})
