// Shared helpers for the API spec tests.
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import type { Express } from 'express'
import request, { type Response } from 'supertest'
import { expect } from 'vitest'

const imagesDir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures', 'images')

// Tiny real image files (1x1 pixel) used as food pictures.
export const images = {
  png: path.join(imagesDir, 'food.png'),
  jpeg: path.join(imagesDir, 'food.jpg'),
  webp: path.join(imagesDir, 'food.webp'),
  gif: path.join(imagesDir, 'food.gif'),
}

export type FoodFields = Record<string, string | number | undefined>

export interface FoodBody {
  id: number
  name: string
  pictureUrl: string
  [field: string]: unknown
}

export interface MealBody {
  id: number
  title: string
  eatenAt: string
  editable: boolean
  items: { foodId: number; quantityConsumed: number; food: FoodBody }[]
}

// A valid set of fields for creating a food. Override any field per test;
// set a field to undefined to leave it out.
export function foodFields(overrides: FoodFields = {}): FoodFields {
  return {
    name: 'Apple',
    type: 'food',
    servingSize: 100,
    servingUnit: 'gram',
    energyInKcal: 52,
    proteinInGram: 0.3,
    carbsInGram: 14,
    fatInGram: 0.2,
    ...overrides,
  }
}

// Sends POST /api/foods as multipart/form-data (form fields + picture file).
// Pass picture = null to send no picture, or chain your own .attach() call.
export function postFood(app: Express, fields: FoodFields = foodFields(), picture: string | null = images.png) {
  let req = request(app).post('/api/foods')
  for (const [key, value] of Object.entries(fields)) {
    if (value !== undefined) {
      req = req.field(key, String(value))
    }
  }
  if (picture) {
    req = req.attach('picture', picture)
  }
  return req
}

// Creates a food through the API and returns it. Fails loudly if creation fails.
export async function createFood(app: Express, overrides: FoodFields = {}): Promise<FoodBody> {
  const res = await postFood(app, foodFields(overrides))
  if (res.status !== 201) {
    throw new Error(`Could not create food: ${res.status} ${JSON.stringify(res.body)}`)
  }
  return res.body as FoodBody
}

// Creates a meal through the API and returns it. Fails loudly if creation fails.
export async function createMeal(app: Express, body: object): Promise<MealBody> {
  const res = await request(app).post('/api/meals').send(body)
  if (res.status !== 201) {
    throw new Error(`Could not create meal: ${res.status} ${JSON.stringify(res.body)}`)
  }
  return res.body as MealBody
}

// ISO timestamp for a moment `hours` hours ago (negative = in the future).
export function hoursAgo(hours: number): string {
  return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString()
}

// The UTC calendar date (YYYY-MM-DD) of an ISO timestamp.
export function utcDateOf(isoTimestamp: string): string {
  return isoTimestamp.slice(0, 10)
}

// Asserts an error response: the expected status and a JSON body like { error: "..." }.
// Pass `mentions` to also check the message names what was wrong (e.g. /servingSize/).
export function expectError(res: Response, status: number, mentions?: RegExp) {
  expect(res.status).toBe(status)
  expect(res.body).toEqual(expect.objectContaining({ error: expect.any(String) }))
  if (mentions) {
    expect(res.body.error).toMatch(mentions)
  }
}
