/// <reference types="jest" />
import { describe, test, expect, beforeEach, jest } from '@jest/globals'

jest.mock('../src/db/client', () => ({ query: jest.fn() }))
const { query } = require('../src/db/client')
import { listEventsDb } from '../src/db/repository'

const queryMock = query as unknown as jest.MockedFunction<(sql: string, params?: unknown[]) => Promise<any>>

beforeEach(() => { queryMock.mockReset() })

describe('Repository branches extra', () => {
  test('listEventsDb builds where for city, category, from, to', async () => {
    queryMock.mockResolvedValueOnce({ rows: [{ count: '1' }] } as any)
    queryMock.mockResolvedValueOnce({ rows: [
      { id: 'id1', title: 'T', description: 'D', location: 'L', address: 'A', price: 10, currency: 'COP', date: '2024-01-01', time: '10:00', category: 'Música', city: 'bogota' }
    ] } as any)

    const res = await listEventsDb({ city: 'bogota', category: 'Música', from: '2024-01-01', to: '2024-12-31', page: 1, limit: 1 })
    expect(res.total).toBe(1)
    expect(res.events[0].id).toBe('id1')
  })
})


