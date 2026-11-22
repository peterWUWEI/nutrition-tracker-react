// Spec: the foods API functions build the right HTTP requests.
import { afterEach, describe, expect, it, vi } from 'vitest'

import { createFood, deleteFood, listFoods, searchFoods } from './foods.ts'

function mockFetch(body: unknown, status = 200) {
  // A fresh Response per call: a response body can only be read once.
  const fetchMock = vi.fn<(url: string, init: RequestInit) => Promise<Response>>(() =>
    Promise.resolve(
      new Response(status === 204 ? null : JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json' },
      }),
    ),
  )
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

const emptyPage = { data: [], pagination: { page: 1, pageSize: 10, totalItems: 0, totalPages: 0 } }

afterEach(() => {
  // Back to the "no network" fetch from src/test/setup.ts
  vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('Network access is disabled in tests'))))
})

describe('foods API functions', () => {
  it('lists a page of foods, with an optional search', async () => {
    const fetchMock = mockFetch(emptyPage)

    await listFoods({ page: 2, pageSize: 25, search: 'yog' })
    await listFoods({ page: 1, pageSize: 10, search: '' })

    expect(fetchMock.mock.calls[0][0]).toBe('/api/foods?page=2&pageSize=25&search=yog')
    expect(fetchMock.mock.calls[1][0]).toBe('/api/foods?page=1&pageSize=10')
  })

  it('sends a new food as multipart/form-data with the picture file', async () => {
    const fetchMock = mockFetch({ id: 1 }, 201)
    const picture = new File(['png bytes'], 'banana.png', { type: 'image/png' })

    await createFood(
      {
        name: 'Banana',
        type: 'food',
        servingSize: 118,
        servingUnit: 'gram',
        energyInKcal: 105,
        proteinInGram: 1.3,
        carbsInGram: 27,
        fatInGram: 0.4,
        brand: 'Fresh Farms',
      },
      picture,
    )

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('/api/foods')
    expect(init.method).toBe('POST')
    const form = init.body as FormData
    expect(form).toBeInstanceOf(FormData)
    expect(form.get('name')).toBe('Banana')
    expect(form.get('servingSize')).toBe('118')
    expect(form.get('brand')).toBe('Fresh Farms')
    expect(form.has('sodiumInMg')).toBe(false)
    expect((form.get('picture') as File).name).toBe('banana.png')
    // The browser sets the multipart Content-Type (with its boundary) itself.
    expect(new Headers(init.headers).has('Content-Type')).toBe(false)
  })

  it('deletes a food by id', async () => {
    const fetchMock = mockFetch(null, 204)

    await deleteFood(7)

    expect(fetchMock).toHaveBeenCalledWith('/api/foods/7', expect.objectContaining({ method: 'DELETE' }))
  })

  it('searches foods by name and returns just the foods', async () => {
    const fetchMock = mockFetch({ ...emptyPage, data: [{ id: 1, name: 'Apple' }] })

    const foods = await searchFoods('app')

    expect(fetchMock.mock.calls[0][0]).toBe('/api/foods?search=app&pageSize=20')
    expect(foods).toEqual([{ id: 1, name: 'Apple' }])
  })
})
