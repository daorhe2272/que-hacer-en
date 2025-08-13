/// <reference types="jest" />
import { describe, test, expect, beforeEach, jest } from '@jest/globals'

jest.mock('../src/db/client', () => ({ query: jest.fn() }))
const { query } = require('../src/db/client')
import { listEventsDb } from '../src/db/repository'

const queryMock = query as unknown as jest.MockedFunction<(sql: string, params?: unknown[]) => Promise<any>>

beforeEach(() => { queryMock.mockReset() })

describe('DB Repository extra branches', () => {
  test('listEventsDb applies price sort desc and filters min/max price', async () => {
    // First call: COUNT(*)
    queryMock.mockResolvedValueOnce({ rows: [{ count: '2' }] } as any)
    // Second call: rows
    queryMock.mockResolvedValueOnce({ rows: [
      { id: 'a', title: 'A', description: 'D', location: null, address: null, price: 1000, currency: 'COP', date: '2024-05-01', time: '10:00', category: 'Música', city: 'bogota' },
      { id: 'b', title: 'B', description: 'D', location: 'L', address: 'Addr', price: 5000, currency: 'COP', date: '2024-05-02', time: '11:00', category: 'Arte', city: 'bogota' }
    ] } as any)

    const res = await listEventsDb({ minPrice: 1000, maxPrice: 7000, sort: 'price', order: 'desc', page: 1, limit: 2 })
    expect(res.total).toBe(2)
    expect(res.events.length).toBe(2)
    expect(res.events[0].price).toBe(1000)
    expect(res.events[1].price).toBe(5000)
  })

  test('listEventsDb with q builds LIKE branch', async () => {
    queryMock.mockResolvedValueOnce({ rows: [{ count: '1' }] } as any)
    queryMock.mockResolvedValueOnce({ rows: [
      { id: 'x', title: 'Teatro', description: 'Desc', location: null, address: null, price: 0, currency: 'COP', date: '2024-01-01', time: '09:00', category: 'Cultural', city: 'bogota' }
    ] } as any)
    const res = await listEventsDb({ q: 'té' })
    expect(res.total).toBe(1)
    expect(res.events[0].title).toBe('Teatro')
  })
})


