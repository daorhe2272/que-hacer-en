import { jest } from '@jest/globals'
import request from 'supertest'
import express from 'express'
import { usersRouter } from '../src/routes/users'
import { query } from '../src/db/client'
import { mockEvents, createMockQuery } from './test-helpers/mock-database'

// Mock the authenticate middleware to avoid Supabase calls
jest.mock('../src/middleware/auth', () => ({
  authenticate: (req: any, res: any, next: any) => {
    // Mock authentication based on test tokens
    const auth = req.headers.authorization
    if (auth === 'Bearer test-token') {
      req.user = { id: 'test-user-id', email: 'test@example.com', role: 'attendee' }
      next()
    } else if (auth === 'Bearer organizer-token') {
      req.user = { id: 'organizer-id', email: 'organizer@example.com', role: 'organizer' }
      next()
    } else if (auth === 'Bearer admin-token') {
      req.user = { id: 'admin-id', email: 'admin@example.com', role: 'admin' }
      next()
    } else {
      res.status(401).json({ error: 'Unauthorized' })
    }
  }
}))

// Mock database client
const mockQuery = createMockQuery()
jest.mocked(query).mockImplementation(mockQuery)

describe('Users Router', () => {
  let app: express.Application

  beforeEach(() => {
    app = express()
    app.use(express.json())
    
    // Mock correlation ID middleware
    app.use((req, _res, next) => {
      req.correlationId = 'test-correlation-id'
      next()
    })
    
    app.use('/api/users', usersRouter)
    
    jest.clearAllMocks()
    // Don't reset mock implementation here - let individual tests set their own mocks
  })

  describe('GET /api/users/me', () => {
    it('should return user profile in test mode', async () => {
      process.env.NODE_ENV = 'test'
      
      const response = await request(app)
        .get('/api/users/me')
        .set('Authorization', 'Bearer test-token')
        .expect(200)

      expect(response.body).toEqual({
        id: 'test-user-id',
        email: 'test@example.com',
        role: 'organizer'
      })
    })

    it('should return 401 without authorization', async () => {
      const response = await request(app)
        .get('/api/users/me')
        .expect(401)

      expect(response.body).toEqual({
        error: 'Unauthorized'
      })
    })

    it('should use database in non-test environment', async () => {
      process.env.NODE_ENV = 'production'
      
      // Mock schema creation and user insertion
      mockQuery
        .mockImplementationOnce(() => ({ rows: [], rowCount: 0 })) // Schema creation
        .mockImplementationOnce(() => ({ rows: [], rowCount: 0 })) // Table creation
        .mockImplementationOnce(() => ({ rows: [], rowCount: 1 })) // User insertion
        .mockImplementationOnce(() => ({ 
          rows: [{ id: 'test-user-id', email: 'test@example.com', role: 'attendee' }], 
          rowCount: 1 
        })) // User select

      const response = await request(app)
        .get('/api/users/me')
        .set('Authorization', 'Bearer test-token')
        .expect(200)

      expect(response.body).toEqual({
        id: 'test-user-id',
        email: 'test@example.com',
        role: 'attendee'
      })
      
      process.env.NODE_ENV = 'test'
    })

    it('should handle user not found in database', async () => {
      process.env.NODE_ENV = 'production'
      
      mockQuery
        .mockImplementationOnce(() => ({ rows: [], rowCount: 0 })) // Schema
        .mockImplementationOnce(() => ({ rows: [], rowCount: 0 })) // Table
        .mockImplementationOnce(() => ({ rows: [], rowCount: 1 })) // Insert
        .mockImplementationOnce(() => ({ rows: [], rowCount: 0 })) // User not found

      const response = await request(app)
        .get('/api/users/me')
        .set('Authorization', 'Bearer test-token')
        .expect(404)

      expect(response.body).toEqual({
        error: 'User not found'
      })
      
      process.env.NODE_ENV = 'test'
    })

    it('should handle database errors gracefully', async () => {
      process.env.NODE_ENV = 'production'
      
      mockQuery.mockImplementationOnce(() => {
        throw new Error('Database connection error')
      })

      const response = await request(app)
        .get('/api/users/me')
        .set('Authorization', 'Bearer test-token')
        .expect(500)

      expect(response.body).toEqual({
        error: 'No se pudo recuperar el perfil'
      })
      
      process.env.NODE_ENV = 'test'
    })
  })

  describe('POST /api/users/favorites', () => {
    it('should add event to favorites in test mode', async () => {
      process.env.NODE_ENV = 'test'
      
      const response = await request(app)
        .post('/api/users/favorites')
        .set('Authorization', 'Bearer test-token')
        .send({ eventId: 'test-event-id' })
        .expect(201)

      expect(response.body).toEqual({
        message: 'Evento agregado a favoritos'
      })
    })

    it('should return 400 for missing eventId', async () => {
      const response = await request(app)
        .post('/api/users/favorites')
        .set('Authorization', 'Bearer test-token')
        .send({})
        .expect(400)

      expect(response.body).toEqual({
        error: 'eventId es requerido'
      })
    })

    it('should return 400 for invalid eventId type', async () => {
      const response = await request(app)
        .post('/api/users/favorites')
        .set('Authorization', 'Bearer test-token')
        .send({ eventId: 123 })
        .expect(400)

      expect(response.body).toEqual({
        error: 'eventId es requerido'
      })
    })

    it('should return 401 without authorization', async () => {
      const response = await request(app)
        .post('/api/users/favorites')
        .send({ eventId: 'test-event-id' })
        .expect(401)

      expect(response.body).toEqual({
        error: 'Unauthorized'
      })
    })

    it('should use database in non-test environment', async () => {
      process.env.NODE_ENV = 'production'
      
      mockQuery.mockImplementationOnce(() => ({ rows: [], rowCount: 1 }))

      const response = await request(app)
        .post('/api/users/favorites')
        .set('Authorization', 'Bearer test-token')
        .send({ eventId: 'test-event-id' })
        .expect(201)

      expect(response.body).toEqual({
        message: 'Evento agregado a favoritos'
      })
      
      process.env.NODE_ENV = 'test'
    })

    it('should handle database errors in non-test environment', async () => {
      process.env.NODE_ENV = 'production'
      
      mockQuery.mockImplementationOnce(() => {
        throw new Error('Database error')
      })

      const response = await request(app)
        .post('/api/users/favorites')
        .set('Authorization', 'Bearer test-token')
        .send({ eventId: 'test-event-id' })
        .expect(500)

      expect(response.body).toEqual({
        error: 'Error al agregar a favoritos'
      })
      
      process.env.NODE_ENV = 'test'
    })
  })

  describe('DELETE /api/users/favorites/:eventId', () => {
    it('should remove event from favorites in test mode', async () => {
      process.env.NODE_ENV = 'test'
      
      const response = await request(app)
        .delete('/api/users/favorites/event-123')
        .set('Authorization', 'Bearer test-token')
        .expect(200)

      expect(response.body).toEqual({
        message: 'Evento removido de favoritos'
      })
    })

    it('should return 404 for non-favorited event in test mode', async () => {
      process.env.NODE_ENV = 'test'
      
      const response = await request(app)
        .delete('/api/users/favorites/non-favorited-event')
        .set('Authorization', 'Bearer test-token')
        .expect(404)

      expect(response.body).toEqual({
        error: 'Favorito no encontrado'
      })
    })

    it('should return 401 without authorization', async () => {
      const response = await request(app)
        .delete('/api/users/favorites/event-123')
        .expect(401)

      expect(response.body).toEqual({
        error: 'Unauthorized'
      })
    })

    it('should use database in non-test environment', async () => {
      process.env.NODE_ENV = 'production'
      
      mockQuery.mockImplementationOnce(() => ({ rows: [], rowCount: 1 }))

      const response = await request(app)
        .delete('/api/users/favorites/test-event-id')
        .set('Authorization', 'Bearer test-token')
        .expect(200)

      expect(response.body).toEqual({
        message: 'Evento removido de favoritos'
      })
      
      process.env.NODE_ENV = 'test'
    })

    it('should return 404 when database returns no rows affected', async () => {
      process.env.NODE_ENV = 'production'
      
      mockQuery.mockImplementationOnce(() => ({ rows: [], rowCount: 0 }))

      const response = await request(app)
        .delete('/api/users/favorites/test-event-id')
        .set('Authorization', 'Bearer test-token')
        .expect(404)

      expect(response.body).toEqual({
        error: 'Favorito no encontrado'
      })
      
      process.env.NODE_ENV = 'test'
    })
  })

  describe('GET /api/users/favorites', () => {
    it('should return user favorites in test mode', async () => {
      process.env.NODE_ENV = 'test'
      
      const response = await request(app)
        .get('/api/users/favorites')
        .set('Authorization', 'Bearer test-token')
        .expect(200)

      expect(response.body).toEqual({
        events: expect.arrayContaining([
          expect.objectContaining({
            id: 'event-123',
            title: 'Test Favorite Event'
          })
        ]),
        pagination: {
          page: 1,
          limit: 20,
          total: 1,
          totalPages: 1
        }
      })
    })

    it('should handle pagination parameters', async () => {
      const response = await request(app)
        .get('/api/users/favorites?page=2&limit=5')
        .set('Authorization', 'Bearer test-token')
        .expect(200)

      expect(response.body.pagination).toEqual({
        page: 2,
        limit: 5,
        total: expect.any(Number),
        totalPages: expect.any(Number)
      })
    })

    it('should return 400 for invalid query parameters', async () => {
      const response = await request(app)
        .get('/api/users/favorites?page=0&limit=200')
        .set('Authorization', 'Bearer test-token')
        .expect(400)

      expect(response.body).toEqual({
        error: 'Parámetros inválidos',
        details: expect.any(Object)
      })
    })

    it('should return 401 without authorization', async () => {
      const response = await request(app)
        .get('/api/users/favorites')
        .expect(401)

      expect(response.body).toEqual({
        error: 'Unauthorized'
      })
    })

    it('should use database in non-test environment', async () => {
      process.env.NODE_ENV = 'production'
      
      mockQuery
        .mockImplementationOnce(() => ({ rows: [{ count: '2' }], rowCount: 1 })) // Count
        .mockImplementationOnce(() => ({ rows: mockEvents.slice(0, 2), rowCount: 2 })) // Events
        .mockImplementationOnce(() => ({ rows: [{ name: 'tag1' }], rowCount: 1 })) // Tags for first event
        .mockImplementationOnce(() => ({ rows: [{ name: 'tag2' }], rowCount: 1 })) // Tags for second event

      const response = await request(app)
        .get('/api/users/favorites')
        .set('Authorization', 'Bearer test-token')
        .expect(200)

      expect(response.body).toHaveProperty('events')
      expect(response.body.events).toHaveLength(2)
      
      process.env.NODE_ENV = 'test'
    })

    it('should handle database errors gracefully', async () => {
      process.env.NODE_ENV = 'production'
      
      mockQuery.mockImplementationOnce(() => {
        throw new Error('Database connection error')
      })

      const response = await request(app)
        .get('/api/users/favorites')
        .set('Authorization', 'Bearer test-token')
        .expect(500)

      expect(response.body).toEqual({
        error: 'Error al cargar favoritos',
        details: undefined
      })
      
      process.env.NODE_ENV = 'test'
    })

    it('should include error details in development environment', async () => {
      process.env.NODE_ENV = 'development'
      
      mockQuery.mockImplementationOnce(() => {
        throw new Error('Specific database error')
      })

      const response = await request(app)
        .get('/api/users/favorites')
        .set('Authorization', 'Bearer test-token')
        .expect(500)

      expect(response.body).toEqual({
        error: 'Error al cargar favoritos',
        details: 'Specific database error'
      })
      
      process.env.NODE_ENV = 'test'
    })
  })

  describe('GET /api/users/favorites/:eventId/status', () => {
    it('should return true for favorited event in test mode', async () => {
      process.env.NODE_ENV = 'test'
      
      const response = await request(app)
        .get('/api/users/favorites/event-123/status')
        .set('Authorization', 'Bearer test-token')
        .expect(200)

      expect(response.body).toEqual({
        isFavorited: true
      })
    })

    it('should return false for non-favorited event in test mode', async () => {
      process.env.NODE_ENV = 'test'
      
      const response = await request(app)
        .get('/api/users/favorites/other-event/status')
        .set('Authorization', 'Bearer test-token')
        .expect(200)

      expect(response.body).toEqual({
        isFavorited: false
      })
    })

    it('should return 401 without authorization', async () => {
      const response = await request(app)
        .get('/api/users/favorites/event-123/status')
        .expect(401)

      expect(response.body).toEqual({
        error: 'Unauthorized'
      })
    })

    it('should use database in non-test environment', async () => {
      process.env.NODE_ENV = 'production'
      
      mockQuery.mockImplementationOnce(() => ({ rows: [{ exists: true }], rowCount: 1 }))

      const response = await request(app)
        .get('/api/users/favorites/test-event/status')
        .set('Authorization', 'Bearer test-token')
        .expect(200)

      expect(response.body).toEqual({
        isFavorited: true
      })
      
      process.env.NODE_ENV = 'test'
    })

    it('should handle database errors gracefully', async () => {
      process.env.NODE_ENV = 'production'
      
      // Clear all previous mocks and set up error mock
      jest.clearAllMocks()
      mockQuery.mockImplementation(() => {
        throw new Error('Database error')
      })

      const response = await request(app)
        .get('/api/users/favorites/test-event/status')
        .set('Authorization', 'Bearer test-token')
        .expect(200) // Function handles errors gracefully and returns false

      expect(response.body).toEqual({
        isFavorited: false // Database error returns false by design
      })
      
      process.env.NODE_ENV = 'test'
    })
  })

  describe('Type assertion helper', () => {
    // This tests the internal assertAuthenticated function indirectly
    it('should handle authenticated requests properly', async () => {
      const response = await request(app)
        .get('/api/users/me')
        .set('Authorization', 'Bearer test-token')
        .expect(200)

      expect(response.body).toHaveProperty('id', 'test-user-id')
      expect(response.body).toHaveProperty('email', 'test@example.com')
    })

    it('should work with different user roles', async () => {
      const organizerResponse = await request(app)
        .get('/api/users/me')
        .set('Authorization', 'Bearer organizer-token')
        .expect(200)

      expect(organizerResponse.body).toHaveProperty('id', 'organizer-id')

      const adminResponse = await request(app)
        .get('/api/users/me')
        .set('Authorization', 'Bearer admin-token')
        .expect(200)

      expect(adminResponse.body).toHaveProperty('id', 'admin-id')
    })
  })
})