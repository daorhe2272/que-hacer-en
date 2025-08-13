/// <reference types="jest" />

import { describe, test, expect, beforeEach, jest } from '@jest/globals'

describe('DB client', () => {
  const originalEnv = process.env

  beforeEach(() => {
    jest.resetModules()
    jest.clearAllMocks()
    process.env = { ...originalEnv }
    delete process.env.DATABASE_URL
  })

  test('getDbPool throws when DATABASE_URL is missing', () => {
    jest.isolateModules(() => {
      jest.doMock('dotenv', () => ({ config: jest.fn() }))
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const client = require('../src/db/client')
      expect(() => client.getDbPool()).toThrow(/DATABASE_URL/)
    })
  })

  test('getDbPool creates Pool once and query delegates to pool.query', async () => {
    const querySpy = jest.fn(async () => ({ rows: [{ ok: true }] }))
    const PoolCtor = jest.fn(() => ({ query: querySpy }))

    jest.doMock('pg', () => ({ Pool: PoolCtor }))
    process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/db'

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const client = require('../src/db/client')
    const pool1 = client.getDbPool()
    const pool2 = client.getDbPool()
    expect(pool1).toBe(pool2)
    expect(PoolCtor).toHaveBeenCalledTimes(1)
    const res = await client.query('SELECT 1', [])
    expect(querySpy).toHaveBeenCalledTimes(1)
    expect(res).toEqual({ rows: [{ ok: true }] })

    const res2 = await client.query('SELECT 2')
    expect(querySpy).toHaveBeenCalledTimes(2)
    expect(res2).toEqual({ rows: [{ ok: true }] })
  })
})


