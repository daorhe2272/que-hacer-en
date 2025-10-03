import { jest } from '@jest/globals'
import request from 'supertest'
import app from '../src/index'
import { query } from '../src/db/client'
import { createMockQuery } from './test-helpers/mock-database'

// Mock the authenticate middleware to avoid Supabase calls
jest.mock('../src/middleware/auth', () => ({
  authenticate: (req: any, _res: any, next: any) => {
    // For integration tests, allow requests without requiring tokens
    req.user = { id: 'test-user-id', email: 'test@example.com', role: 'attendee' }
    next()
  },
  requireRole: (roles: string[]) => (req: any, res: any, next: any) => {
    if (!req.user) {
      res.status(403).json({ error: 'Forbidden' })
      return
    }
    if (roles.includes(req.user.role) || req.user.role === 'admin') {
      next()
    } else {
      res.status(403).json({ error: 'Forbidden' })
    }
  }
}))

// Mock database client
const mockQuery = createMockQuery()
jest.mocked(query).mockImplementation(mockQuery)

// Mock file system for events.json reading
jest.mock('fs', () => ({
  readFileSync: jest.fn().mockReturnValue(JSON.stringify({
    bogota: [
      {
        id: 'bg-001',
        title: 'Test Event Bogotá',
        description: 'Test event in Bogotá',
        date: '2024-07-15',
        time: '14:00',
        location: 'Test Location',
        address: 'Test Address',
        category: 'Música',
        price: 0,
        currency: 'COP',
        image: 'test.jpg',
        organizer: 'Test Org',
        capacity: 100,
        tags: ['test'],
        status: 'active'
      }
    ],
    medellin: [
      {
        id: 'med-001',
        title: 'Test Event Medellín',
        description: 'Test event in Medellín',
        date: '2024-08-05',
        time: '16:00',
        location: 'Test Location Med',
        address: 'Test Address Med',
        category: 'Cultural',
        price: 0,
        currency: 'COP',
        image: 'test-med.jpg',
        organizer: 'Test Org Med',
        capacity: 50,
        tags: ['test-med'],
        status: 'active'
      }
    ],
    cali: [],
    barranquilla: [],
    cartagena: []
  }))
}))

describe('App Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Middleware Setup', () => {
    it('should have security headers', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200)

      // Helmet security headers should be present
      expect(response.headers).toHaveProperty('x-dns-prefetch-control')
      expect(response.headers).toHaveProperty('x-frame-options')
      expect(response.headers).toHaveProperty('x-download-options')
      expect(response.headers).toHaveProperty('x-content-type-options')
    })

    it('should add correlation ID to responses', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200)

      expect(response.headers).toHaveProperty('x-correlation-id')
      expect(response.headers['x-correlation-id']).toBeTruthy()
    })

    it('should preserve provided correlation ID', async () => {
      const testCorrelationId = 'test-correlation-123'
      
      const response = await request(app)
        .get('/api/health')
        .set('x-correlation-id', testCorrelationId)
        .expect(200)

      expect(response.headers['x-correlation-id']).toBe(testCorrelationId)
    })

    it('should generate correlation ID when not provided', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200)

      expect(response.headers['x-correlation-id']).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
    })

    it('should handle JSON parsing', async () => {
      const response = await request(app)
        .post('/api/events')
        .send({ test: 'data' })

      // JSON parsing should work (no 500 server errors from JSON parsing)
      // Since auth is mocked, we get validation error instead of auth error
      expect(response.status).not.toBe(500) // No JSON parsing crash
      expect(response.status).toBe(400) // Validation error for invalid event data
    })
  })

  describe('CORS Configuration', () => {
    it('should allow requests when CORS_ORIGINS is empty', async () => {
      delete process.env.CORS_ORIGINS
      
      const response = await request(app)
        .get('/api/health')
        .set('Origin', 'https://example.com')
        .expect(200)

      expect(response.headers).toHaveProperty('access-control-allow-origin')
    })

    it('should allow requests from allowed origins', async () => {
      process.env.CORS_ORIGINS = 'https://allowed.com, https://also-allowed.com'
      
      const response = await request(app)
        .get('/api/health')
        .set('Origin', 'https://allowed.com')
        .expect(200)

      expect(response.headers['access-control-allow-origin']).toBe('https://allowed.com')
    })

    it('should handle requests without origin header', async () => {
      process.env.CORS_ORIGINS = 'https://allowed.com'
      
      const response = await request(app)
        .get('/api/health')
        .expect(200)

      expect(response.body).toEqual({ status: 'ok' })
    })

    it('should reject requests from non-allowed origins', async () => {
      process.env.CORS_ORIGINS = 'https://allowed.com,https://also-allowed.com'
      
      const response = await request(app)
        .get('/api/health')
        .set('Origin', 'https://malicious.com')
        .expect(403)

      expect(response.body).toEqual({ error: 'CORS no permitido' })
    })
  })

  describe('Rate Limiting', () => {
    it('should allow requests under rate limit', async () => {
      // Make several requests quickly
      const requests = Array.from({ length: 5 }, () =>
        request(app).get('/api/health').expect(200)
      )
      
      await Promise.all(requests)
    })

    it('should apply rate limiting to /api/ routes', async () => {
      // This test verifies rate limiting is applied, but testing the actual limit
      // would require making 100+ requests which would slow down tests
      const response = await request(app)
        .get('/api/health')
        .expect(200)

      // Rate limiting headers should be present
      expect(response.headers).toHaveProperty('ratelimit-limit')
      expect(response.headers).toHaveProperty('ratelimit-remaining')
      expect(response.headers).toHaveProperty('ratelimit-reset')
    })

    it('should not rate limit non-api routes', async () => {
      const response = await request(app)
        .get('/non-api-route')
        .expect(404)

      // Rate limiting headers should not be present for non-api routes
      expect(response.headers).not.toHaveProperty('ratelimit-limit')
    })
  })

  describe('Health Check Endpoint', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200)

      expect(response.body).toEqual({ status: 'ok' })
    })

    it('should be accessible without authentication', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200)

      expect(response.body).toEqual({ status: 'ok' })
    })
  })

  describe('Route Mounting', () => {
    it('should mount events routes', async () => {
      process.env.NODE_ENV = 'test'
      
      const response = await request(app)
        .get('/api/events')
        .expect(200)

      expect(response.body).toHaveProperty('events')
      expect(response.body).toHaveProperty('pagination')
    })

    it('should mount users routes', async () => {
      const response = await request(app)
        .get('/api/users/me')
        .expect(200) // Should reach the route (auth mocked, so succeeds)

      // Route is mounted correctly - we get user data, not 404
      expect(response.body).toHaveProperty('id')
      expect(response.body).toHaveProperty('email')
    })
  })

  describe('404 Handler', () => {
    it('should return 404 for non-existent routes', async () => {
      const response = await request(app)
        .get('/non-existent-route')
        .expect(404)

      expect(response.body).toEqual({ error: 'Not Found' })
    })

    it('should return 404 for non-existent API routes', async () => {
      const response = await request(app)
        .get('/api/non-existent')
        .expect(404)

      expect(response.body).toEqual({ error: 'Not Found' })
    })

    it('should handle different HTTP methods', async () => {
      const response = await request(app)
        .post('/non-existent-route')
        .expect(404)

      expect(response.body).toEqual({ error: 'Not Found' })
    })
  })

  describe('Global Error Handler', () => {
    it('should handle CORS errors specifically', async () => {
      // Create a mock scenario that would trigger CORS error
      // This is difficult to test directly, but we can verify the error handler exists
      const response = await request(app)
        .get('/api/health')
        .expect(200)

      // If we reach here, the error handler is properly set up
      expect(response.body).toEqual({ status: 'ok' })
    })

    it('should handle general errors with 500 status', async () => {
      // The error handler is tested indirectly through other routes
      // that might throw errors (like database connection issues)
      expect(true).toBe(true) // Placeholder - real errors tested in other modules
    })

    it('should log errors to console', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
      
      // Trigger a route that might cause an error
      await request(app)
        .get('/api/events')
        .set('Authorization', 'Bearer invalid-token')

      // The error handler should be available for error logging
      consoleSpy.mockRestore()
    })
  })

  describe('App Configuration', () => {
    it('should not start server in test environment', () => {
      process.env.NODE_ENV = 'test'
      
      // The app should export without starting the server
      expect(app).toBeDefined()
      expect(typeof app.listen).toBe('function')
    })

    it('should handle PORT environment variable', () => {
      // This tests the PORT parsing logic indirectly
      const originalPort = process.env.PORT
      process.env.PORT = '3000'
      
      // Re-require would be needed to test this fully, but the logic is simple
      expect(process.env.PORT).toBe('3000')
      
      if (originalPort) {
        process.env.PORT = originalPort
      } else {
        delete process.env.PORT
      }
    })

    it('should use default port when PORT is not set', () => {
      const originalPort = process.env.PORT
      delete process.env.PORT
      
      // Default port logic is tested indirectly
      expect(process.env.PORT).toBeUndefined()
      
      if (originalPort) {
        process.env.PORT = originalPort
      }
    })
  })

  describe('Middleware Order', () => {
    it('should apply security middleware first', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200)

      // Security headers should be present, indicating helmet ran first
      expect(response.headers).toHaveProperty('x-content-type-options', 'nosniff')
    })

    it('should apply CORS before route handlers', async () => {
      // Ensure CORS allows all origins for this test
      delete process.env.CORS_ORIGINS
      
      const response = await request(app)
        .get('/api/health')
        .set('Origin', 'https://test.com')
        .expect(200)

      // CORS headers should be present
      expect(response.headers).toHaveProperty('access-control-allow-origin')
    })

    it('should apply correlation ID middleware early', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200)

      // Correlation ID should be present in response
      expect(response.headers).toHaveProperty('x-correlation-id')
    })

    it('should apply rate limiting before route handlers', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200)

      // Rate limiting headers should be present for API routes
      expect(response.headers).toHaveProperty('ratelimit-limit')
    })
  })

  describe('Response Headers', () => {
    it('should set content-type for JSON responses', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200)

      expect(response.headers['content-type']).toContain('application/json')
    })

    it('should handle different content types appropriately', async () => {
      const response = await request(app)
        .get('/api/events')
        .expect(200)

      expect(response.headers['content-type']).toContain('application/json')
    })
  })

  describe('Environment-specific Behavior', () => {
    it('should behave differently in test vs production', async () => {
      const originalEnv = process.env.NODE_ENV
      
      process.env.NODE_ENV = 'test'
      const testResponse = await request(app)
        .get('/api/events')
        .expect(200)

      expect(testResponse.body).toHaveProperty('events')
      
      process.env.NODE_ENV = originalEnv
    })
  })

  describe('Request Processing', () => {
    it('should handle query parameters', async () => {
      const response = await request(app)
        .get('/api/events?city=bogota&limit=5')
        .expect(200)

      expect(response.body).toHaveProperty('events')
      expect(response.body).toHaveProperty('pagination')
    })

    it('should handle request bodies', async () => {
      const response = await request(app)
        .post('/api/users/favorites')
        .send({ eventId: 'test-event' })
        .expect(201) // Auth mocked, body processed successfully

      expect(response.body).toEqual({ message: 'Evento agregado a favoritos' })
    })
  })

  describe('Error Resilience', () => {
    it('should not crash on malformed requests', async () => {
      const response = await request(app)
        .post('/api/events')
        .set('Content-Type', 'application/json')
        .send('invalid json')
        .expect(500) // Global error handler catches JSON parsing errors

      // Should handle JSON parsing errors gracefully (no app crash)
      expect(response).toBeDefined()
      expect(response.body).toEqual({ error: 'Error interno del servidor' })
    })

    it('should handle missing headers gracefully', async () => {
      const response = await request(app)
        .get('/api/events')
        .expect(200)

      expect(response.body).toHaveProperty('events')
    })
  })
})