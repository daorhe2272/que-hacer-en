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

describe('Users Favorites API', () => {
  const SUPABASE_URL = 'https://project.supabase.co'

  beforeAll(() => {
    process.env.SUPABASE_URL = SUPABASE_URL
  })

  afterAll(() => {
    delete process.env.SUPABASE_URL
  })

  describe('POST /api/users/favorites', () => {
    test('adds event to favorites successfully', async () => {
      jest.resetModules()
      jest.doMock('jose', () => ({
        createRemoteJWKSet: jest.fn(() => ({} as any)),
        jwtVerify: jest.fn(async () => ({ payload: { sub: 'user-1', email: 'user1@example.com', user_role: 'attendee' } }))
      }))
      jest.doMock('../src/db/repository', () => ({
        addToFavoritesDb: jest.fn(async () => true),
        removeFromFavoritesDb: jest.fn(),
        getUserFavoritesDb: jest.fn(),
        isEventFavoritedDb: jest.fn()
      }))
      
      const app = (await import('../src/index')).default
      const res = await request(app)
        .post('/api/users/favorites')
        .set('Authorization', 'Bearer valid')
        .send({ eventId: 'event-123' })
      
      expect(res.status).toBe(201)
      expect(res.body.message).toBe('Evento agregado a favoritos')
    })

    test('returns 401 when unauthorized', async () => {
      jest.resetModules()
      const app = (await import('../src/index')).default
      const res = await request(app)
        .post('/api/users/favorites')
        .send({ eventId: 'event-123' })
      
      expect(res.status).toBe(401)
    })

    test('returns 400 when eventId is missing', async () => {
      jest.resetModules()
      jest.doMock('jose', () => ({
        createRemoteJWKSet: jest.fn(() => ({} as any)),
        jwtVerify: jest.fn(async () => ({ payload: { sub: 'user-1', email: 'user1@example.com', user_role: 'attendee' } }))
      }))
      
      const app = (await import('../src/index')).default
      const res = await request(app)
        .post('/api/users/favorites')
        .set('Authorization', 'Bearer valid')
        .send({})
      
      expect(res.status).toBe(400)
      expect(res.body.error).toBe('eventId es requerido')
    })

    test('returns 500 when database operation fails', async () => {
      jest.resetModules()
      jest.doMock('jose', () => ({
        createRemoteJWKSet: jest.fn(() => ({} as any)),
        jwtVerify: jest.fn(async () => ({ payload: { sub: 'user-1', email: 'user1@example.com', user_role: 'attendee' } }))
      }))
      jest.doMock('../src/db/repository', () => ({
        addToFavoritesDb: jest.fn(async () => false),
        removeFromFavoritesDb: jest.fn(),
        getUserFavoritesDb: jest.fn(),
        isEventFavoritedDb: jest.fn()
      }))
      
      const app = (await import('../src/index')).default
      const res = await request(app)
        .post('/api/users/favorites')
        .set('Authorization', 'Bearer valid')
        .send({ eventId: 'event-123' })
      
      expect(res.status).toBe(500)
    })
  })

  describe('DELETE /api/users/favorites/:eventId', () => {
    test('removes event from favorites successfully', async () => {
      jest.resetModules()
      jest.doMock('jose', () => ({
        createRemoteJWKSet: jest.fn(() => ({} as any)),
        jwtVerify: jest.fn(async () => ({ payload: { sub: 'user-1', email: 'user1@example.com', user_role: 'attendee' } }))
      }))
      jest.doMock('../src/db/repository', () => ({
        addToFavoritesDb: jest.fn(),
        removeFromFavoritesDb: jest.fn(async () => true),
        getUserFavoritesDb: jest.fn(),
        isEventFavoritedDb: jest.fn()
      }))
      
      const app = (await import('../src/index')).default
      const res = await request(app)
        .delete('/api/users/favorites/event-123')
        .set('Authorization', 'Bearer valid')
      
      expect(res.status).toBe(200)
      expect(res.body.message).toBe('Evento removido de favoritos')
    })

    test('returns 404 when favorite not found', async () => {
      jest.resetModules()
      jest.doMock('jose', () => ({
        createRemoteJWKSet: jest.fn(() => ({} as any)),
        jwtVerify: jest.fn(async () => ({ payload: { sub: 'user-1', email: 'user1@example.com', user_role: 'attendee' } }))
      }))
      jest.doMock('../src/db/repository', () => ({
        addToFavoritesDb: jest.fn(),
        removeFromFavoritesDb: jest.fn(async () => false),
        getUserFavoritesDb: jest.fn(),
        isEventFavoritedDb: jest.fn()
      }))
      
      const app = (await import('../src/index')).default
      const res = await request(app)
        .delete('/api/users/favorites/nonexistent')
        .set('Authorization', 'Bearer valid')
      
      expect(res.status).toBe(404)
    })
  })

  describe('GET /api/users/favorites', () => {
    test('returns user favorites successfully', async () => {
      jest.resetModules()
      jest.doMock('jose', () => ({
        createRemoteJWKSet: jest.fn(() => ({} as any)),
        jwtVerify: jest.fn(async () => ({ payload: { sub: 'user-1', email: 'user1@example.com', user_role: 'attendee' } }))
      }))
      jest.doMock('../src/db/repository', () => ({
        addToFavoritesDb: jest.fn(),
        removeFromFavoritesDb: jest.fn(),
        getUserFavoritesDb: jest.fn(async () => ({ 
          events: [{ id: 'event-1', title: 'Test Event' }], 
          total: 1 
        })),
        isEventFavoritedDb: jest.fn()
      }))
      
      const app = (await import('../src/index')).default
      const res = await request(app)
        .get('/api/users/favorites')
        .set('Authorization', 'Bearer valid')
      
      expect(res.status).toBe(200)
      expect(res.body.events).toHaveLength(1)
      expect(res.body.pagination.total).toBe(1)
    })

    test('returns 400 for invalid query parameters', async () => {
      jest.resetModules()
      jest.doMock('jose', () => ({
        createRemoteJWKSet: jest.fn(() => ({} as any)),
        jwtVerify: jest.fn(async () => ({ payload: { sub: 'user-1', email: 'user1@example.com', user_role: 'attendee' } }))
      }))
      
      const app = (await import('../src/index')).default
      const res = await request(app)
        .get('/api/users/favorites?page=invalid')
        .set('Authorization', 'Bearer valid')
      
      expect(res.status).toBe(400)
    })
  })

  describe('GET /api/users/favorites/:eventId/status', () => {
    test('returns favorite status successfully', async () => {
      jest.resetModules()
      jest.doMock('jose', () => ({
        createRemoteJWKSet: jest.fn(() => ({} as any)),
        jwtVerify: jest.fn(async () => ({ payload: { sub: 'user-1', email: 'user1@example.com', user_role: 'attendee' } }))
      }))
      jest.doMock('../src/db/repository', () => ({
        addToFavoritesDb: jest.fn(),
        removeFromFavoritesDb: jest.fn(),
        getUserFavoritesDb: jest.fn(),
        isEventFavoritedDb: jest.fn(async () => true)
      }))
      
      const app = (await import('../src/index')).default
      const res = await request(app)
        .get('/api/users/favorites/event-123/status')
        .set('Authorization', 'Bearer valid')
      
      expect(res.status).toBe(200)
      expect(res.body.isFavorited).toBe(true)
    })
  })
})


