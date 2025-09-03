/// <reference types="jest" />
import { describe, test, expect, beforeAll, afterAll, jest } from '@jest/globals'

// Mock database client specifically for users tests
jest.mock('../src/db/client', () => ({
  query: jest.fn(async (sql: string, _params?: unknown[]) => {
    // Default successful responses for common queries
    if (sql.includes('SELECT id, email, role')) {
      return { 
        rows: [{ id: 'test-user-id', email: 'test@example.com', role: 'attendee' }],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: []
      }
    }
    if (sql.startsWith('INSERT INTO users') || sql.startsWith('DO $$') || sql.includes('CREATE TABLE')) {
      return { 
        rows: [],
        command: 'INSERT',
        rowCount: 0,
        oid: 0,
        fields: []
      }
    }
    return { 
      rows: [],
      command: 'SELECT',
      rowCount: 0,
      oid: 0,
      fields: []
    }
  }),
  getDbPool: jest.fn(() => ({
    query: jest.fn(async () => ({ rows: [] })),
    end: jest.fn(),
    connect: jest.fn()
  }))
}))

// Mock repository specifically for users tests
jest.mock('../src/db/repository', () => ({
  addToFavoritesDb: jest.fn(async () => true),
  removeFromFavoritesDb: jest.fn(async () => true),
  getUserFavoritesDb: jest.fn(async () => ({ 
    events: [{ id: 'event-1', title: 'Test Event' }], 
    total: 1 
  })),
  isEventFavoritedDb: jest.fn(async () => true)
}))

import request from 'supertest'
import app from '../src/index'

// Import mocked modules to get access to jest.fn() instances
import * as dbClient from '../src/db/client'
import * as repository from '../src/db/repository'

// Type the mocked functions properly
const mockQuery = dbClient.query as jest.MockedFunction<typeof dbClient.query>
const mockAddToFavoritesDb = repository.addToFavoritesDb as jest.MockedFunction<typeof repository.addToFavoritesDb>
const mockRemoveFromFavoritesDb = repository.removeFromFavoritesDb as jest.MockedFunction<typeof repository.removeFromFavoritesDb>
const mockGetUserFavoritesDb = repository.getUserFavoritesDb as jest.MockedFunction<typeof repository.getUserFavoritesDb>
const mockIsEventFavoritedDb = repository.isEventFavoritedDb as jest.MockedFunction<typeof repository.isEventFavoritedDb>

describe('Users API (/api/users/me)', () => {
  beforeAll(() => {
    process.env.NODE_ENV = 'test'
    process.env.SUPABASE_URL = 'https://test.supabase.co'
  })

  afterAll(() => {
    delete process.env.SUPABASE_URL
    delete process.env.NODE_ENV
  })

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks()
  })

  test('returns 401 when Authorization header is missing', async () => {
    const res = await request(app).get('/api/users/me')
    expect(res.status).toBe(401)
  })

  test('returns user profile when token is valid (upsert on first login)', async () => {
    const res = await request(app)
      .get('/api/users/me')
      .set('Authorization', 'Bearer test-token')
    
    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({ id: 'test-user-id', email: 'test@example.com', role: 'attendee' })
  })

  test('returns 500 when DB fails', async () => {
    // Override the global mock for this specific test
    mockQuery.mockRejectedValueOnce(new Error('boom'))
    
    const res = await request(app)
      .get('/api/users/me')
      .set('Authorization', 'Bearer test-token')
    
    expect(res.status).toBe(500)
  })

  test('returns 404 when user row missing after upsert/select', async () => {
    // Override to return empty result for SELECT queries
    mockQuery.mockImplementation(async (sql: string) => {
      if (sql.includes('SELECT id, email, role')) return { 
        rows: [], 
        command: 'SELECT', 
        rowCount: 0, 
        oid: 0, 
        fields: [] 
      }
      return { 
        rows: [], 
        command: 'SELECT', 
        rowCount: 0, 
        oid: 0, 
        fields: [] 
      }
    })
    
    const res = await request(app)
      .get('/api/users/me')
      .set('Authorization', 'Bearer test-token')
    
    expect(res.status).toBe(404)
  })
})

describe('Users Favorites API', () => {
  beforeAll(() => {
    process.env.NODE_ENV = 'test'
    process.env.SUPABASE_URL = 'https://test.supabase.co'
  })

  afterAll(() => {
    delete process.env.SUPABASE_URL
    delete process.env.NODE_ENV
  })

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks()
  })

  describe('POST /api/users/favorites', () => {
    test('adds event to favorites successfully', async () => {
      const res = await request(app)
        .post('/api/users/favorites')
        .set('Authorization', 'Bearer test-token')
        .send({ eventId: 'event-123' })
      
      expect(res.status).toBe(201)
      expect(res.body.message).toBe('Evento agregado a favoritos')
    })


    test('returns 401 when unauthorized', async () => {
      const res = await request(app)
        .post('/api/users/favorites')
        .send({ eventId: 'event-123' })
      
      expect(res.status).toBe(401)
    })

    test('returns 400 when eventId is missing', async () => {
      const res = await request(app)
        .post('/api/users/favorites')
        .set('Authorization', 'Bearer test-token')
        .send({})
      
      expect(res.status).toBe(400)
      expect(res.body.error).toBe('eventId es requerido')
    })

    test('returns 500 when database operation fails', async () => {
      mockAddToFavoritesDb.mockResolvedValueOnce(false)
      
      const res = await request(app)
        .post('/api/users/favorites')
        .set('Authorization', 'Bearer test-token')
        .send({ eventId: 'event-123' })
      
      expect(res.status).toBe(500)
    })

    test('returns 500 when exception is thrown', async () => {
      mockAddToFavoritesDb.mockRejectedValueOnce(new Error('DB error'))
      
      const res = await request(app)
        .post('/api/users/favorites')
        .set('Authorization', 'Bearer test-token')
        .send({ eventId: 'event-123' })
      
      expect(res.status).toBe(500)
      expect(res.body.error).toBe('Error al agregar a favoritos')
    })

  })

  describe('DELETE /api/users/favorites/:eventId', () => {
    test('removes event from favorites successfully', async () => {
      const res = await request(app)
        .delete('/api/users/favorites/event-123')
        .set('Authorization', 'Bearer test-token')
      
      expect(res.status).toBe(200)
      expect(res.body.message).toBe('Evento removido de favoritos')
    })

    test('returns 404 when favorite not found', async () => {
      mockRemoveFromFavoritesDb.mockResolvedValueOnce(false)
      
      const res = await request(app)
        .delete('/api/users/favorites/nonexistent')
        .set('Authorization', 'Bearer test-token')
      
      expect(res.status).toBe(404)
    })

    test('returns 401 when unauthorized', async () => {
      const res = await request(app)
        .delete('/api/users/favorites/event-123')
      
      expect(res.status).toBe(401)
    })

    test('returns 500 when exception is thrown', async () => {
      mockRemoveFromFavoritesDb.mockRejectedValueOnce(new Error('DB error'))
      
      const res = await request(app)
        .delete('/api/users/favorites/event-123')
        .set('Authorization', 'Bearer test-token')
      
      expect(res.status).toBe(500)
      expect(res.body.error).toBe('Error al remover de favoritos')
    })
  })

  describe('GET /api/users/favorites', () => {
    test('returns user favorites successfully', async () => {
      const res = await request(app)
        .get('/api/users/favorites')
        .set('Authorization', 'Bearer test-token')
      
      expect(res.status).toBe(200)
      expect(res.body.events).toHaveLength(1)
      expect(res.body.pagination.total).toBe(1)
    })

    test('returns 400 for invalid query parameters', async () => {
      const res = await request(app)
        .get('/api/users/favorites?page=invalid')
        .set('Authorization', 'Bearer test-token')
      
      expect(res.status).toBe(400)
    })

    test('returns 401 when unauthorized', async () => {
      const res = await request(app)
        .get('/api/users/favorites')
      
      expect(res.status).toBe(401)
    })

    test('returns 500 when exception is thrown', async () => {
      mockGetUserFavoritesDb.mockRejectedValueOnce(new Error('DB error'))
      
      const res = await request(app)
        .get('/api/users/favorites')
        .set('Authorization', 'Bearer test-token')
      
      expect(res.status).toBe(500)
      expect(res.body.error).toBe('Error al cargar favoritos')
    })
  })

  describe('GET /api/users/favorites/:eventId/status', () => {
    test('returns favorite status successfully', async () => {
      const res = await request(app)
        .get('/api/users/favorites/event-123/status')
        .set('Authorization', 'Bearer test-token')
      
      expect(res.status).toBe(200)
      expect(res.body.isFavorited).toBe(true)
    })

    test('returns 401 when unauthorized', async () => {
      const res = await request(app)
        .get('/api/users/favorites/event-123/status')
      
      expect(res.status).toBe(401)
    })

    test('returns 500 when exception is thrown', async () => {
      mockIsEventFavoritedDb.mockRejectedValueOnce(new Error('DB error'))
      
      const res = await request(app)
        .get('/api/users/favorites/event-123/status')
        .set('Authorization', 'Bearer test-token')
      
      expect(res.status).toBe(500)
      expect(res.body.error).toBe('Error al verificar favorito')
    })
  })
})