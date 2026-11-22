// Spec for the Foods API (features 1–4). See docs/api-spec.md for the full contract.
//
// 1. Add a food (multipart upload with a required picture)
// 2. List foods with pagination and search by name
// 3. Update any field of a food except its id
// 4. Delete a food by id or by name
import request from 'supertest'
import { describe, expect, it } from 'vitest'

import { createApp } from '../app.js'
import { createFood, createMeal, expectError, foodFields, images, postFood } from '../test/helpers.js'

const app = createApp()

describe('Foods API', () => {
  describe('POST /api/foods: add a food', () => {
    it('creates a food from the required fields and a picture', async () => {
      const res = await postFood(app, foodFields())

      expect(res.status).toBe(201)
      expect(res.body).toEqual({
        id: expect.any(Number),
        name: 'Apple',
        type: 'food',
        servingSize: 100,
        servingUnit: 'gram',
        servingsPerPackage: null,
        energyInKcal: 52,
        proteinInGram: 0.3,
        carbsInGram: 14,
        fatInGram: 0.2,
        sodiumInMg: null,
        cholesterolInMg: null,
        dietaryFibreInGram: null,
        brand: null,
        pictureUrl: expect.stringMatching(/^\/uploads\/.+\.png$/),
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      })
    })

    it('stores the optional fields when they are provided', async () => {
      const res = await postFood(
        app,
        foodFields({
          servingsPerPackage: 4,
          sodiumInMg: 1,
          cholesterolInMg: 0,
          dietaryFibreInGram: 2.4,
          brand: 'Fresh Farms',
        }),
      )

      expect(res.status).toBe(201)
      expect(res.body).toMatchObject({
        servingsPerPackage: 4,
        sodiumInMg: 1,
        cholesterolInMg: 0,
        dietaryFibreInGram: 2.4,
        brand: 'Fresh Farms',
      })
    })

    it('creates a beverage measured in ml', async () => {
      const res = await postFood(
        app,
        foodFields({ name: 'Orange juice', type: 'beverage', servingSize: 250, servingUnit: 'ml' }),
      )

      expect(res.status).toBe(201)
      expect(res.body).toMatchObject({ name: 'Orange juice', type: 'beverage', servingSize: 250, servingUnit: 'ml' })
    })

    it('gives each new food the next id', async () => {
      const first = await createFood(app, { name: 'Apple' })
      const second = await createFood(app, { name: 'Banana' })

      expect(second.id).toBeGreaterThan(first.id)
    })

    it('trims spaces around the name', async () => {
      const res = await postFood(app, foodFields({ name: '  Banana  ' }))

      expect(res.status).toBe(201)
      expect(res.body.name).toBe('Banana')
    })

    it('serves the uploaded picture at pictureUrl', async () => {
      const food = await createFood(app)

      const picture = await request(app).get(food.pictureUrl)

      expect(picture.status).toBe(200)
      expect(picture.headers['content-type']).toBe('image/png')
    })

    it.each([
      ['JPEG', images.jpeg, 'image/jpeg'],
      ['WebP', images.webp, 'image/webp'],
    ])('accepts a %s picture', async (_format, file, contentType) => {
      const res = await postFood(app, foodFields(), file)
      expect(res.status).toBe(201)

      const picture = await request(app).get(res.body.pictureUrl)
      expect(picture.headers['content-type']).toBe(contentType)
    })

    it.each([
      'name',
      'type',
      'servingSize',
      'servingUnit',
      'energyInKcal',
      'proteinInGram',
      'carbsInGram',
      'fatInGram',
    ])('requires %s', async (field) => {
      const res = await postFood(app, foodFields({ [field]: undefined }))

      expectError(res, 400, new RegExp(field))
    })

    it('requires a picture', async () => {
      const res = await postFood(app, foodFields(), null)

      expectError(res, 400, /picture/i)
    })

    it('rejects a "picture" that is not really an image', async () => {
      // Claims to be a PNG, but the bytes are plain text.
      const res = await postFood(app, foodFields(), null).attach('picture', Buffer.from('definitely not an image'), {
        filename: 'fake.png',
        contentType: 'image/png',
      })

      expectError(res, 400, /picture/i)
    })

    it('rejects image formats other than JPEG, PNG and WebP', async () => {
      const res = await postFood(app, foodFields(), images.gif)

      expectError(res, 400, /picture/i)
    })

    it('rejects pictures larger than 5 MB', async () => {
      const pngSignature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
      const tooLarge = Buffer.concat([pngSignature, Buffer.alloc(5 * 1024 * 1024)])

      const res = await postFood(app, foodFields(), null).attach('picture', tooLarge, {
        filename: 'huge.png',
        contentType: 'image/png',
      })

      expectError(res, 413, /picture/i)
    })

    it('rejects an unknown type', async () => {
      const res = await postFood(app, foodFields({ type: 'snack' }))

      expectError(res, 400, /type/)
    })

    it.each([
      ['food', 'ml'],
      ['beverage', 'gram'],
    ])('rejects type "%s" with serving unit "%s"', async (type, servingUnit) => {
      const res = await postFood(app, foodFields({ type, servingUnit }))

      expectError(res, 400, /servingUnit/)
    })

    it.each([
      ['servingSize', 0],
      ['servingSize', -1],
      ['servingsPerPackage', 0],
      ['energyInKcal', -1],
      ['proteinInGram', -0.5],
      ['carbsInGram', -1],
      ['fatInGram', -1],
      ['sodiumInMg', -1],
      ['cholesterolInMg', -1],
      ['dietaryFibreInGram', -1],
      ['energyInKcal', 'lots'],
    ])('rejects %s = %s', async (field, value) => {
      const res = await postFood(app, foodFields({ [field]: value }))

      expectError(res, 400, new RegExp(field))
    })

    it('rejects a name that is already used, ignoring letter case and spaces', async () => {
      await createFood(app, { name: 'Apple' })

      const res = await postFood(app, foodFields({ name: '  apple ' }))

      expectError(res, 409)
    })
  })

  describe('GET /api/foods: list with pagination and search', () => {
    // Creates foods named "Food 01", "Food 02", ... so their sort order is predictable.
    async function createNumberedFoods(count: number) {
      for (let i = 1; i <= count; i++) {
        await createFood(app, { name: `Food ${String(i).padStart(2, '0')}` })
      }
    }

    const namesOf = (body: { data: { name: string }[] }) => body.data.map((food) => food.name)

    it('returns the first 10 foods sorted by name, with pagination details', async () => {
      await createNumberedFoods(12)

      const res = await request(app).get('/api/foods')

      expect(res.status).toBe(200)
      expect(namesOf(res.body)).toEqual([
        'Food 01',
        'Food 02',
        'Food 03',
        'Food 04',
        'Food 05',
        'Food 06',
        'Food 07',
        'Food 08',
        'Food 09',
        'Food 10',
      ])
      expect(res.body.pagination).toEqual({ page: 1, pageSize: 10, totalItems: 12, totalPages: 2 })
    })

    it('returns full food details in the list', async () => {
      await createFood(app, { name: 'Apple' })

      const res = await request(app).get('/api/foods')

      expect(res.body.data[0]).toMatchObject({
        id: expect.any(Number),
        name: 'Apple',
        type: 'food',
        energyInKcal: 52,
        pictureUrl: expect.any(String),
      })
    })

    it('returns the requested page', async () => {
      await createNumberedFoods(12)

      const res = await request(app).get('/api/foods').query({ page: 2 })

      expect(res.status).toBe(200)
      expect(namesOf(res.body)).toEqual(['Food 11', 'Food 12'])
      expect(res.body.pagination).toEqual({ page: 2, pageSize: 10, totalItems: 12, totalPages: 2 })
    })

    it('supports a custom page size', async () => {
      await createNumberedFoods(12)

      const res = await request(app).get('/api/foods').query({ page: 3, pageSize: 5 })

      expect(namesOf(res.body)).toEqual(['Food 11', 'Food 12'])
      expect(res.body.pagination).toEqual({ page: 3, pageSize: 5, totalItems: 12, totalPages: 3 })
    })

    it('returns an empty page after the last page', async () => {
      await createNumberedFoods(12)

      const res = await request(app).get('/api/foods').query({ page: 5 })

      expect(res.status).toBe(200)
      expect(res.body.data).toEqual([])
      expect(res.body.pagination).toEqual({ page: 5, pageSize: 10, totalItems: 12, totalPages: 2 })
    })

    it('returns an empty list when there are no foods', async () => {
      const res = await request(app).get('/api/foods')

      expect(res.status).toBe(200)
      expect(res.body).toEqual({ data: [], pagination: { page: 1, pageSize: 10, totalItems: 0, totalPages: 0 } })
    })

    it.each([
      { page: 0 },
      { page: -1 },
      { page: 'abc' },
      { pageSize: 0 },
      { pageSize: 101 },
      { pageSize: 'abc' },
    ])('rejects invalid pagination %o', async (query) => {
      const res = await request(app).get('/api/foods').query(query)

      expectError(res, 400, new RegExp(Object.keys(query)[0]))
    })

    it('searches by part of the name, ignoring letter case', async () => {
      await createFood(app, { name: 'Greek yogurt' })
      await createFood(app, { name: 'Plain Yogurt' })
      await createFood(app, { name: 'Apple' })

      const res = await request(app).get('/api/foods').query({ search: 'YOGURT' })

      expect(res.status).toBe(200)
      expect(namesOf(res.body)).toEqual(['Greek yogurt', 'Plain Yogurt'])
      expect(res.body.pagination.totalItems).toBe(2)
    })

    it('paginates search results', async () => {
      await createFood(app, { name: 'Yogurt 1' })
      await createFood(app, { name: 'Yogurt 2' })
      await createFood(app, { name: 'Yogurt 3' })
      await createFood(app, { name: 'Apple' })

      const res = await request(app).get('/api/foods').query({ search: 'yogurt', page: 2, pageSize: 2 })

      expect(namesOf(res.body)).toEqual(['Yogurt 3'])
      expect(res.body.pagination).toEqual({ page: 2, pageSize: 2, totalItems: 3, totalPages: 2 })
    })

    it('returns no results when nothing matches the search', async () => {
      await createFood(app, { name: 'Apple' })

      const res = await request(app).get('/api/foods').query({ search: 'pizza' })

      expect(res.body.data).toEqual([])
      expect(res.body.pagination.totalItems).toBe(0)
    })
  })

  describe('GET /api/foods/:id: view one food', () => {
    it('returns the food', async () => {
      const food = await createFood(app, { name: 'Apple' })

      const res = await request(app).get(`/api/foods/${food.id}`)

      expect(res.status).toBe(200)
      expect(res.body).toEqual(food)
    })

    it('returns 404 for an unknown id', async () => {
      expectError(await request(app).get('/api/foods/999'), 404)
    })

    it('returns 400 for an id that is not a number', async () => {
      expectError(await request(app).get('/api/foods/abc'), 400)
    })
  })

  describe('PATCH /api/foods/:id: update a food', () => {
    it('updates one field and keeps the others', async () => {
      const food = await createFood(app, { name: 'Apple' })

      const res = await request(app).patch(`/api/foods/${food.id}`).send({ energyInKcal: 60 })

      expect(res.status).toBe(200)
      expect(res.body).toMatchObject({ id: food.id, name: 'Apple', energyInKcal: 60, proteinInGram: 0.3 })

      const reloaded = await request(app).get(`/api/foods/${food.id}`)
      expect(reloaded.body.energyInKcal).toBe(60)
    })

    it('updates any combination of editable fields', async () => {
      const food = await createFood(app, { name: 'Apple' })
      const changes = {
        name: 'Apple juice',
        type: 'beverage',
        servingSize: 250,
        servingUnit: 'ml',
        servingsPerPackage: 4,
        energyInKcal: 110,
        proteinInGram: 0.2,
        carbsInGram: 28,
        fatInGram: 0.3,
        sodiumInMg: 10,
        cholesterolInMg: 0,
        dietaryFibreInGram: 0.5,
        brand: 'Sunny Orchards',
      }

      const res = await request(app).patch(`/api/foods/${food.id}`).send(changes)

      expect(res.status).toBe(200)
      expect(res.body).toMatchObject({ id: food.id, ...changes })
    })

    it('clears an optional field when it is set to null', async () => {
      const food = await createFood(app, { brand: 'Fresh Farms' })

      const res = await request(app).patch(`/api/foods/${food.id}`).send({ brand: null })

      expect(res.status).toBe(200)
      expect(res.body.brand).toBeNull()
    })

    it('replaces the picture (and other fields) with a multipart upload', async () => {
      const food = await createFood(app, { name: 'Apple' })

      const res = await request(app)
        .patch(`/api/foods/${food.id}`)
        .field('name', 'Red apple')
        .attach('picture', images.jpeg)

      expect(res.status).toBe(200)
      expect(res.body.name).toBe('Red apple')
      expect(res.body.pictureUrl).not.toBe(food.pictureUrl)

      const picture = await request(app).get(res.body.pictureUrl)
      expect(picture.headers['content-type']).toBe('image/jpeg')
    })

    it('does not allow changing the id', async () => {
      const food = await createFood(app, { name: 'Apple' })

      const res = await request(app).patch(`/api/foods/${food.id}`).send({ id: 999, name: 'Pear' })

      expectError(res, 400, /\bid\b/)
      const reloaded = await request(app).get(`/api/foods/${food.id}`)
      expect(reloaded.body.name).toBe('Apple')
    })

    it.each([
      { energyInKcal: -5 },
      { servingSize: 0 },
      { type: 'snack' },
      { name: '' },
      { name: null },
      { energyInKcal: null },
    ])('rejects the invalid change %o', async (changes) => {
      const food = await createFood(app)

      const res = await request(app).patch(`/api/foods/${food.id}`).send(changes)

      expectError(res, 400, new RegExp(Object.keys(changes)[0]))
    })

    it('rejects a picture that is not an image', async () => {
      const food = await createFood(app)

      const res = await request(app)
        .patch(`/api/foods/${food.id}`)
        .attach('picture', Buffer.from('not an image'), { filename: 'fake.png', contentType: 'image/png' })

      expectError(res, 400, /picture/i)
    })

    it('rejects an empty update', async () => {
      const food = await createFood(app)

      expectError(await request(app).patch(`/api/foods/${food.id}`).send({}), 400)
    })

    it('rejects a type change that does not match the serving unit', async () => {
      const food = await createFood(app, { type: 'food', servingUnit: 'gram' })

      const res = await request(app).patch(`/api/foods/${food.id}`).send({ type: 'beverage' })

      expectError(res, 400, /servingUnit/)
    })

    it('rejects a name already used by another food', async () => {
      await createFood(app, { name: 'Apple' })
      const banana = await createFood(app, { name: 'Banana' })

      const res = await request(app).patch(`/api/foods/${banana.id}`).send({ name: 'APPLE' })

      expectError(res, 409)
    })

    it('allows changing the letter case of its own name', async () => {
      const food = await createFood(app, { name: 'Apple' })

      const res = await request(app).patch(`/api/foods/${food.id}`).send({ name: 'APPLE' })

      expect(res.status).toBe(200)
      expect(res.body.name).toBe('APPLE')
    })

    it('returns 404 for an unknown food', async () => {
      expectError(await request(app).patch('/api/foods/999').send({ name: 'Pear' }), 404)
    })
  })

  describe('DELETE /api/foods: delete by id or name', () => {
    it('deletes a food by id', async () => {
      const food = await createFood(app)

      const res = await request(app).delete(`/api/foods/${food.id}`)

      expect(res.status).toBe(204)
      expectError(await request(app).get(`/api/foods/${food.id}`), 404)
    })

    it('returns 404 when deleting an unknown id', async () => {
      expectError(await request(app).delete('/api/foods/999'), 404)
    })

    it('deletes a food by name, ignoring letter case', async () => {
      const food = await createFood(app, { name: 'Apple' })

      const res = await request(app).delete('/api/foods').query({ name: 'apple' })

      expect(res.status).toBe(204)
      expectError(await request(app).get(`/api/foods/${food.id}`), 404)
    })

    it('returns 404 when no food has that name', async () => {
      await createFood(app, { name: 'Apple' })

      expectError(await request(app).delete('/api/foods').query({ name: 'Pear' }), 404)
    })

    it('requires an id or a name', async () => {
      expectError(await request(app).delete('/api/foods'), 400, /name/)
    })

    it('refuses to delete a food that is part of a meal', async () => {
      const food = await createFood(app, { name: 'Apple' })
      await createMeal(app, { title: 'lunch', items: [{ foodId: food.id, quantityConsumed: 1 }] })

      expectError(await request(app).delete(`/api/foods/${food.id}`), 409)
      expectError(await request(app).delete('/api/foods').query({ name: 'Apple' }), 409)

      const reloaded = await request(app).get(`/api/foods/${food.id}`)
      expect(reloaded.status).toBe(200)
    })
  })
})
