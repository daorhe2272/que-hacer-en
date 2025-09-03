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
      // Temporarily unset NODE_ENV to test production behavior
      const originalNodeEnv = process.env.NODE_ENV
      delete process.env.NODE_ENV
      
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const client = require('../src/db/client')
        expect(() => client.getDbPool()).toThrow(/DATABASE_URL/)
      } finally {
        // Restore NODE_ENV
        if (originalNodeEnv) {
          process.env.NODE_ENV = originalNodeEnv
        }
      }
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

  test('getDbPool creates mock pool when NODE_ENV is test and no DATABASE_URL', () => {
    jest.isolateModules(() => {
      jest.doMock('dotenv', () => ({ config: jest.fn() }))
      process.env.NODE_ENV = 'test'
      delete process.env.DATABASE_URL
      
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const client = require('../src/db/client')
      const pool1 = client.getDbPool()
      const pool2 = client.getDbPool()
      
      // Should return same mock pool (singleton)
      expect(pool1).toBe(pool2)
      expect(typeof pool1.query).toBe('function')
      expect(typeof pool1.end).toBe('function')
      expect(typeof pool1.connect).toBe('function')
    })
  })

  test('mock pool query throws error', async () => {
    jest.isolateModules(async () => {
      jest.doMock('dotenv', () => ({ config: jest.fn() }))
      process.env.NODE_ENV = 'test'
      delete process.env.DATABASE_URL
      
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const client = require('../src/db/client')
      const pool = client.getDbPool()
      
      await expect(pool.query()).rejects.toThrow('Database not mocked in test')
      await expect(pool.connect()).rejects.toThrow('Database not mocked in test')
    })
  })
})


