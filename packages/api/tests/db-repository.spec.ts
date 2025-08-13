/// <reference types="jest" />
import { describe, test, expect, beforeEach, jest } from '@jest/globals'

jest.mock('../src/db/client', () => ({ query: jest.fn() }))

const { query } = require('../src/db/client')
import { listEventsDb, getEventByLegacyIdDb, listEventsByCityDb } from '../src/db/repository'

const queryMock = query as unknown as jest.MockedFunction<(sql: string, params?: unknown[]) => Promise<any>>

beforeEach(() => { queryMock.mockReset() })

describe('DB Repository', () => {
  test('listEventsDb maps rows and returns total', async () => {
    queryMock.mockImplementation(async (sql: unknown) => {
      if (typeof sql === 'string' && sql.includes('SELECT COUNT(*)')) return { rows: [{ count: '3' }] }
      return { rows: [
        { id: 'uuid-1', title: 'T1', description: 'D1', location: 'Loc', address: 'Addr', price: 1000, currency: 'COP', date: '2024-01-01', time: '10:00', category: 'Música', city: 'bogota' },
        { id: 'uuid-2', title: 'T2', description: 'D2', location: null,   address: null,   price: 0,    currency: 'COP', date: '2024-01-02', time: '12:00', category: 'Arte',   city: 'bogota' }
      ] }
    })

    const { events, total } = await listEventsDb({ page: 1, limit: 2, sort: 'date', order: 'asc' })
    expect(total).toBe(3)
    expect(events.length).toBe(2)
    expect(events[0]).toMatchObject({ id: 'uuid-1', title: 'T1', price: 1000, location: 'Loc' })
    expect(events[1]).toMatchObject({ id: 'uuid-2', title: 'T2', price: 0, location: '' })
  })

  test('getEventByLegacyIdDb returns mapped event or null', async () => {
    queryMock.mockResolvedValueOnce({ rows: [] } as any)
    const none = await getEventByLegacyIdDb('bg-zzz')
    expect(none).toBeNull()

    queryMock.mockResolvedValueOnce({ rows: [
      { id: 'uuid-x', title: 'Tx', description: 'Dx', location: 'Lx', address: 'Ax', price: 500, currency: 'COP', date: '2024-03-10', time: '09:00', category: 'Teatro', city: 'medellin' }
    ] } as any)
    const one = await getEventByLegacyIdDb('bg-001')
    expect(one).not.toBeNull()
    expect(one!.id).toBe('uuid-x')
    expect(one!.title).toBe('Tx')
  })

  test('listEventsByCityDb returns null when city not found', async () => {
    // First query looks up city id
    queryMock.mockResolvedValueOnce({ rows: [] } as any)
    const res = await listEventsByCityDb('unknown')
    expect(res).toBeNull()
  })

  test('listEventsByCityDb returns events for known city', async () => {
    // City id lookup
    queryMock.mockResolvedValueOnce({ rows: [{ id: 1 }] } as any)
    // Events rows
    queryMock.mockResolvedValueOnce({ rows: [
      { id: 'uuid-3', title: 'T3', description: 'D3', location: 'L3', address: 'A3', price: 200, currency: 'COP', date: '2024-02-01', time: '11:00', category: 'Cultural' }
    ] } as any)
    const events = await listEventsByCityDb('bogota')
    expect(events).not.toBeNull()
    expect(events!.length).toBe(1)
    expect(events![0].id).toBe('uuid-3')
  })
})


