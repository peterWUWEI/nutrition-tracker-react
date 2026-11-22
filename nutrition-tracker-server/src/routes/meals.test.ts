// Spec for the Meals API (features 5–7). See docs/api-spec.md for the full contract.
//
// 5. Add a meal (breakfast, lunch, dinner, snacks or others) containing any number of
//    foods, each with the number of servings consumed
// 6. View the meals eaten on a given date
// 7. A meal can only be changed or deleted within 48 hours of when it was eaten
import request from 'supertest'
import { describe, expect, it } from 'vitest'

import { createApp } from '../app.js'
import { createFood, createMeal, expectError, hoursAgo, utcDateOf } from '../test/helpers.js'

const app = createApp()

async function createFoods() {
  const apple = await createFood(app, { name: 'Apple' })
  const juice = await createFood(app, {
    name: 'Orange juice',
    type: 'beverage',
    servingSize: 250,
    servingUnit: 'ml',
    energyInKcal: 112,
  })
  return { apple, juice }
}

function getMealsOn(date: string, timezone?: string) {
  return request(app)
    .get('/api/meals')
    .query(timezone ? { date, timezone } : { date })
}

describe('Meals API', () => {
  describe('POST /api/meals: add a meal', () => {
    it('creates a meal with several foods and the servings consumed of each', async () => {
      const { apple, juice } = await createFoods()
      const eatenAt = hoursAgo(1)

      const res = await request(app)
        .post('/api/meals')
        .send({
          title: 'breakfast',
          eatenAt,
          items: [
            { foodId: apple.id, quantityConsumed: 1.5 },
            { foodId: juice.id, quantityConsumed: 1 },
          ],
        })

      expect(res.status).toBe(201)
      expect(res.body).toMatchObject({
        id: expect.any(Number),
        title: 'breakfast',
        eatenAt,
        editable: true,
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      })
      expect(res.body.items).toHaveLength(2)
      expect(res.body.items).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            foodId: apple.id,
            quantityConsumed: 1.5,
            food: expect.objectContaining({ id: apple.id, name: 'Apple', energyInKcal: 52 }),
          }),
          expect.objectContaining({
            foodId: juice.id,
            quantityConsumed: 1,
            food: expect.objectContaining({ id: juice.id, name: 'Orange juice', energyInKcal: 112 }),
          }),
        ]),
      )
    })

    it('uses the current time when eatenAt is not given', async () => {
      const { apple } = await createFoods()
      const before = Date.now()

      const res = await request(app)
        .post('/api/meals')
        .send({ title: 'lunch', items: [{ foodId: apple.id, quantityConsumed: 1 }] })

      expect(res.status).toBe(201)
      const eatenAt = Date.parse(res.body.eatenAt)
      expect(eatenAt).toBeGreaterThanOrEqual(before - 1000)
      expect(eatenAt).toBeLessThanOrEqual(Date.now() + 1000)
    })

    it.each(['breakfast', 'lunch', 'dinner', 'snacks', 'others'])('accepts the title "%s"', async (title) => {
      const { apple } = await createFoods()

      const res = await request(app)
        .post('/api/meals')
        .send({ title, items: [{ foodId: apple.id, quantityConsumed: 1 }] })

      expect(res.status).toBe(201)
      expect(res.body.title).toBe(title)
    })

    it.each([
      ['an unknown title', { title: 'brunch' }],
      ['a missing title', { title: undefined }],
    ])('rejects %s', async (_case, overrides) => {
      const { apple } = await createFoods()

      const res = await request(app)
        .post('/api/meals')
        .send({ items: [{ foodId: apple.id, quantityConsumed: 1 }], ...overrides })

      expectError(res, 400, /title/)
    })

    it.each([
      ['an empty list of foods', { items: [] }],
      ['no list of foods', { items: undefined }],
    ])('rejects a meal with %s', async (_case, overrides) => {
      const res = await request(app)
        .post('/api/meals')
        .send({ title: 'lunch', ...overrides })

      expectError(res, 400, /items/)
    })

    it.each([0, -1, 'two', undefined])('rejects quantityConsumed = %s', async (quantityConsumed) => {
      const { apple } = await createFoods()

      const res = await request(app)
        .post('/api/meals')
        .send({ title: 'lunch', items: [{ foodId: apple.id, quantityConsumed }] })

      expectError(res, 400, /quantityConsumed/)
    })

    it('rejects a food that does not exist', async () => {
      const res = await request(app)
        .post('/api/meals')
        .send({ title: 'lunch', items: [{ foodId: 9999, quantityConsumed: 1 }] })

      expectError(res, 400, /9999/)
    })

    it('rejects the same food listed twice in one meal', async () => {
      const { apple } = await createFoods()

      const res = await request(app)
        .post('/api/meals')
        .send({
          title: 'lunch',
          items: [
            { foodId: apple.id, quantityConsumed: 1 },
            { foodId: apple.id, quantityConsumed: 2 },
          ],
        })

      expectError(res, 400, /more than once|twice|duplicate/i)
    })

    it.each([
      ['in the future', hoursAgo(-1)],
      ['that is not a date', 'yesterday'],
    ])('rejects an eatenAt %s', async (_case, eatenAt) => {
      const { apple } = await createFoods()

      const res = await request(app)
        .post('/api/meals')
        .send({ title: 'lunch', eatenAt, items: [{ foodId: apple.id, quantityConsumed: 1 }] })

      expectError(res, 400, /eatenAt/)
    })

    it('allows logging a meal eaten more than 2 days ago, which is then locked', async () => {
      const { apple } = await createFoods()

      const res = await request(app)
        .post('/api/meals')
        .send({ title: 'dinner', eatenAt: hoursAgo(24 * 5), items: [{ foodId: apple.id, quantityConsumed: 1 }] })

      expect(res.status).toBe(201)
      expect(res.body.editable).toBe(false)
    })
  })

  describe('GET /api/meals?date=YYYY-MM-DD: view meals on a date', () => {
    it('returns the meals eaten on that date (UTC by default), earliest first', async () => {
      const { apple } = await createFoods()
      const items = [{ foodId: apple.id, quantityConsumed: 1 }]
      await createMeal(app, { title: 'lunch', eatenAt: '2026-01-15T12:30:00.000Z', items })
      await createMeal(app, { title: 'breakfast', eatenAt: '2026-01-15T07:00:00.000Z', items })
      await createMeal(app, { title: 'dinner', eatenAt: '2026-01-16T19:00:00.000Z', items })

      const res = await getMealsOn('2026-01-15')

      expect(res.status).toBe(200)
      expect(res.body.map((meal: { title: string }) => meal.title)).toEqual(['breakfast', 'lunch'])
    })

    it('includes every food in each meal with its details', async () => {
      const { apple, juice } = await createFoods()
      await createMeal(app, {
        title: 'breakfast',
        eatenAt: '2026-01-15T07:00:00.000Z',
        items: [
          { foodId: apple.id, quantityConsumed: 2 },
          { foodId: juice.id, quantityConsumed: 0.5 },
        ],
      })

      const res = await getMealsOn('2026-01-15')

      expect(res.body).toHaveLength(1)
      expect(res.body[0]).toMatchObject({ title: 'breakfast', eatenAt: '2026-01-15T07:00:00.000Z' })
      expect(res.body[0].items).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ foodId: apple.id, quantityConsumed: 2, food: expect.objectContaining({ name: 'Apple' }) }),
          expect.objectContaining({
            foodId: juice.id,
            quantityConsumed: 0.5,
            food: expect.objectContaining({ name: 'Orange juice' }),
          }),
        ]),
      )
    })

    it('uses the timezone parameter to decide which day a meal belongs to', async () => {
      const { apple } = await createFoods()
      // 23:30 UTC on Jan 15 is 07:30 on Jan 16 in Singapore (UTC+8).
      await createMeal(app, {
        title: 'breakfast',
        eatenAt: '2026-01-15T23:30:00.000Z',
        items: [{ foodId: apple.id, quantityConsumed: 1 }],
      })

      expect((await getMealsOn('2026-01-16', 'Asia/Singapore')).body).toHaveLength(1)
      expect((await getMealsOn('2026-01-15', 'Asia/Singapore')).body).toHaveLength(0)
      expect((await getMealsOn('2026-01-15')).body).toHaveLength(1)
    })

    it('returns an empty list for a date without meals', async () => {
      const res = await getMealsOn('2026-01-15')

      expect(res.status).toBe(200)
      expect(res.body).toEqual([])
    })

    it('marks meals as editable only within 48 hours of being eaten', async () => {
      const { apple } = await createFoods()
      const items = [{ foodId: apple.id, quantityConsumed: 1 }]
      const recent = await createMeal(app, { title: 'lunch', eatenAt: hoursAgo(1), items })
      const old = await createMeal(app, { title: 'dinner', eatenAt: hoursAgo(72), items })

      const recentDay = await getMealsOn(utcDateOf(recent.eatenAt))
      const oldDay = await getMealsOn(utcDateOf(old.eatenAt))

      expect(recentDay.body.find((meal: { id: number }) => meal.id === recent.id).editable).toBe(true)
      expect(oldDay.body.find((meal: { id: number }) => meal.id === old.id).editable).toBe(false)
    })

    it.each([
      ['a missing date', {}, /date/],
      ['an impossible date', { date: '2026-02-30' }, /date/],
      ['a date in the wrong format', { date: '15/01/2026' }, /date/],
      ['an unknown timezone', { date: '2026-01-15', timezone: 'Mars/Olympus_Mons' }, /timezone/],
    ])('rejects %s', async (_case, query, mentions) => {
      expectError(await request(app).get('/api/meals').query(query), 400, mentions)
    })
  })

  describe('PATCH /api/meals/:id: update a meal', () => {
    it('changes the title of a recent meal', async () => {
      const { apple } = await createFoods()
      const meal = await createMeal(app, {
        title: 'lunch',
        eatenAt: hoursAgo(1),
        items: [{ foodId: apple.id, quantityConsumed: 1 }],
      })

      const res = await request(app).patch(`/api/meals/${meal.id}`).send({ title: 'snacks' })

      expect(res.status).toBe(200)
      expect(res.body).toMatchObject({ id: meal.id, title: 'snacks', eatenAt: meal.eatenAt })
    })

    it('replaces the foods of a recent meal', async () => {
      const { apple, juice } = await createFoods()
      const meal = await createMeal(app, {
        title: 'lunch',
        eatenAt: hoursAgo(1),
        items: [{ foodId: apple.id, quantityConsumed: 1 }],
      })

      const res = await request(app)
        .patch(`/api/meals/${meal.id}`)
        .send({ items: [{ foodId: juice.id, quantityConsumed: 2 }] })

      expect(res.status).toBe(200)
      expect(res.body.items).toEqual([
        expect.objectContaining({ foodId: juice.id, quantityConsumed: 2, food: expect.objectContaining({ name: 'Orange juice' }) }),
      ])

      const day = await getMealsOn(utcDateOf(meal.eatenAt))
      expect(day.body[0].items).toHaveLength(1)
      expect(day.body[0].items[0].foodId).toBe(juice.id)
    })

    it('changes when a recent meal was eaten', async () => {
      const { apple } = await createFoods()
      const meal = await createMeal(app, {
        title: 'lunch',
        eatenAt: hoursAgo(1),
        items: [{ foodId: apple.id, quantityConsumed: 1 }],
      })
      const newEatenAt = hoursAgo(3)

      const res = await request(app).patch(`/api/meals/${meal.id}`).send({ eatenAt: newEatenAt })

      expect(res.status).toBe(200)
      expect(res.body.eatenAt).toBe(newEatenAt)
    })

    it('allows changes up to 48 hours after the meal was eaten', async () => {
      const { apple } = await createFoods()
      const meal = await createMeal(app, {
        title: 'lunch',
        eatenAt: hoursAgo(47),
        items: [{ foodId: apple.id, quantityConsumed: 1 }],
      })

      const res = await request(app).patch(`/api/meals/${meal.id}`).send({ title: 'dinner' })

      expect(res.status).toBe(200)
      expect(res.body.title).toBe('dinner')
    })

    it('refuses changes more than 48 hours after the meal was eaten', async () => {
      const { apple } = await createFoods()
      const meal = await createMeal(app, {
        title: 'lunch',
        eatenAt: hoursAgo(49),
        items: [{ foodId: apple.id, quantityConsumed: 1 }],
      })

      const res = await request(app).patch(`/api/meals/${meal.id}`).send({ title: 'dinner' })

      expectError(res, 403)
      const day = await getMealsOn(utcDateOf(meal.eatenAt))
      expect(day.body.find((m: { id: number }) => m.id === meal.id).title).toBe('lunch')
    })

    it.each([
      ['an unknown title', () => ({ title: 'brunch' }), /title/],
      ['an empty list of foods', () => ({ items: [] }), /items/],
      ['a zero quantity', (foodId: number) => ({ items: [{ foodId, quantityConsumed: 0 }] }), /quantityConsumed/],
      ['a food that does not exist', () => ({ items: [{ foodId: 9999, quantityConsumed: 1 }] }), /9999/],
      ['an eatenAt in the future', () => ({ eatenAt: hoursAgo(-1) }), /eatenAt/],
      ['a new id', () => ({ id: 999 }), /\bid\b/],
      ['no changes at all', () => ({}), undefined],
    ])('rejects %s', async (_case, makeChanges, mentions) => {
      const { apple } = await createFoods()
      const meal = await createMeal(app, {
        title: 'lunch',
        eatenAt: hoursAgo(1),
        items: [{ foodId: apple.id, quantityConsumed: 1 }],
      })

      expectError(await request(app).patch(`/api/meals/${meal.id}`).send(makeChanges(apple.id)), 400, mentions)
    })

    it('returns 404 for an unknown meal', async () => {
      expectError(await request(app).patch('/api/meals/999').send({ title: 'dinner' }), 404)
    })
  })

  describe('DELETE /api/meals/:id: delete a meal', () => {
    it('deletes a recent meal but keeps its foods', async () => {
      const { apple } = await createFoods()
      const meal = await createMeal(app, {
        title: 'lunch',
        eatenAt: hoursAgo(1),
        items: [{ foodId: apple.id, quantityConsumed: 1 }],
      })

      const res = await request(app).delete(`/api/meals/${meal.id}`)

      expect(res.status).toBe(204)
      const day = await getMealsOn(utcDateOf(meal.eatenAt))
      expect(day.body.find((m: { id: number }) => m.id === meal.id)).toBeUndefined()
      expect((await request(app).get(`/api/foods/${apple.id}`)).status).toBe(200)
    })

    it('allows deleting up to 48 hours after the meal was eaten', async () => {
      const { apple } = await createFoods()
      const meal = await createMeal(app, {
        title: 'lunch',
        eatenAt: hoursAgo(47),
        items: [{ foodId: apple.id, quantityConsumed: 1 }],
      })

      expect((await request(app).delete(`/api/meals/${meal.id}`)).status).toBe(204)
    })

    it('refuses to delete a meal eaten more than 48 hours ago', async () => {
      const { apple } = await createFoods()
      const meal = await createMeal(app, {
        title: 'lunch',
        eatenAt: hoursAgo(49),
        items: [{ foodId: apple.id, quantityConsumed: 1 }],
      })

      expectError(await request(app).delete(`/api/meals/${meal.id}`), 403)
      const day = await getMealsOn(utcDateOf(meal.eatenAt))
      expect(day.body.find((m: { id: number }) => m.id === meal.id)).toBeDefined()
    })

    it('returns 404 for an unknown meal', async () => {
      expectError(await request(app).delete('/api/meals/999'), 404)
    })
  })
})
