/// <reference types="jest" />
import { describe, test, expect, beforeAll, afterAll, jest } from '@jest/globals'
import request from 'supertest'

// We'll lazily import the app to allow module mocks to take effect

describe('Users API (/api/users/me)', () => {
  const SUPABASE_URL = 'https://project.supabase.co'

  beforeAll(() => {
    process.env.SUPABASE_URL = SUPABASE_URL
  })

  afterAll(() => {
    delete process.env.SUPABASE_URL
  })

  test('returns 401 when Authorization header is missing', async () => {
    const app = (await import('../src/index')).default
    const res = await request(app).get('/api/users/me')
    expect(res.status).toBe(401)
  }, 15000)

  test('returns user profile when token is valid (upsert on first login)', async () => {
    jest.resetModules()
    jest.doMock('jose', () => ({
      createRemoteJWKSet: jest.fn(() => ({} as any)),
      jwtVerify: jest.fn(async () => ({ payload: { sub: 'user-1', email: 'user1@example.com', user_role: 'attendee' } }))
    }))
    const mem: Record<string, { id: string, email: string | null, role: string }> = {}
    jest.doMock('../src/db/client', () => ({
      query: jest.fn(async (sql: string, params?: unknown[]) => {
        if (sql.includes('SELECT id, email, role')) {
          const id = String(params?.[0])
          const row = mem[id] || { id, email: 'user1@example.com', role: 'attendee' }
          return { rows: [row] }
        }
        if (sql.startsWith('INSERT INTO users')) {
          const id = String(params?.[0])
          const email = (params?.[1] as string) ?? null
          mem[id] = { id, email, role: 'attendee' }
          return { rows: [] }
        }
        // DDL (DO $$, CREATE TABLE) no-op
        return { rows: [] }
      })
    }))
    const app = (await import('../src/index')).default
    const res = await request(app)
      .get('/api/users/me')
      .set('Authorization', 'Bearer valid')
    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({ id: 'user-1', email: 'user1@example.com', role: 'attendee' })
  })

  test('returns 500 when DB fails', async () => {
    jest.resetModules()
    jest.doMock('jose', () => ({
      createRemoteJWKSet: jest.fn(() => ({} as any)),
      jwtVerify: jest.fn(async () => ({ payload: { sub: 'user-2', email: 'u2@example.com', user_role: 'attendee' } }))
    }))
    jest.doMock('../src/db/client', () => ({
      query: jest.fn(async () => { throw new Error('boom') })
    }))
    const app = (await import('../src/index')).default
    const res = await request(app)
      .get('/api/users/me')
      .set('Authorization', 'Bearer valid')
    expect(res.status).toBe(500)
  })

  test('returns 404 when user row missing after upsert/select', async () => {
    jest.resetModules()
    jest.doMock('jose', () => ({
      createRemoteJWKSet: jest.fn(() => ({} as any)),
      jwtVerify: jest.fn(async () => ({ payload: { sub: 'user-3', email: 'u3@example.com', user_role: 'attendee' } }))
    }))
    jest.doMock('../src/db/client', () => ({
      query: jest.fn(async (sql: string) => {
        if (sql.includes('SELECT id, email, role')) return { rows: [] }
        return { rows: [] }
      })
    }))
    const app = (await import('../src/index')).default
    const res = await request(app)
      .get('/api/users/me')
      .set('Authorization', 'Bearer valid')
    expect(res.status).toBe(404)
  })
})


