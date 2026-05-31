import { jest } from '@jest/globals'
import request from 'supertest'
import express from 'express'
import { adminRouter } from '../src/routes/admin'

// Mock the authenticate middleware to avoid Supabase calls
jest.mock('../src/middleware/auth', () => ({
  authenticate: (req: any, res: any, next: any) => {
    // Mock authentication based on test tokens
    const auth = req.headers.authorization
    if (auth === 'Bearer admin-token') {
      req.user = { id: 'admin-id', email: 'admin@example.com', role: 'admin' }
      next()
    } else if (auth === 'Bearer organizer-token') {
      req.user = { id: 'organizer-id', email: 'organizer@example.com', role: 'organizer' }
      next()
    } else {
      res.status(401).json({ error: 'Unauthorized' })
    }
  }
}))

// Mock database client
jest.mock('../src/db/repository', () => ({
  getAdminStatsDb: jest.fn(),
  listInactiveEventsDb: jest.fn()
}))

// Mock mining utils
jest.mock('../src/utils/mining-utils', () => ({
  mineUrlDirectly: jest.fn(),
  mineUrlDirectlyStreaming: jest.fn(),
  mineUrlsDirectlyStreaming: jest.fn()
}))

import { getAdminStatsDb, listInactiveEventsDb } from '../src/db/repository'
import { mineUrlsDirectlyStreaming } from '../src/utils/mining-utils'

const mockGetAdminStatsDb = getAdminStatsDb as jest.MockedFunction<typeof getAdminStatsDb>
const mockListInactiveEventsDb = listInactiveEventsDb as jest.MockedFunction<typeof listInactiveEventsDb>
const mockMineUrlsDirectlyStreaming = mineUrlsDirectlyStreaming as jest.MockedFunction<typeof mineUrlsDirectlyStreaming>

describe('Admin Router', () => {
  let app: express.Application

  beforeEach(() => {
    app = express()
    app.use(express.json())

    // Mock correlation ID middleware
    app.use((req, _res, next) => {
      req.correlationId = 'test-correlation-id'
      next()
    })

    app.use('/api/admin', adminRouter)

    jest.clearAllMocks()
  })

  describe('GET /api/admin/stats', () => {
    it('should return admin stats for admin user in test mode', async () => {
      process.env.NODE_ENV = 'test'

      const response = await request(app)
        .get('/api/admin/stats')
        .set('Authorization', 'Bearer admin-token')
        .expect(200)

      expect(response.body).toEqual({
        totalUsers: 1234,
        activeEvents: 567,
        pendingReviews: 23,
        lastMiningTime: '2024-10-16T10:30:00.000Z'
      })
    })

    it('should return admin stats for admin user in production mode', async () => {
      process.env.NODE_ENV = 'production'

      mockGetAdminStatsDb.mockResolvedValue({
        totalUsers: 999,
        activeEvents: 123,
        pendingReviews: 0,
        lastMiningTime: null
      })

      const response = await request(app)
        .get('/api/admin/stats')
        .set('Authorization', 'Bearer admin-token')
        .expect(200)

      expect(response.body).toEqual({
        totalUsers: 999,
        activeEvents: 123,
        pendingReviews: 0,
        lastMiningTime: null
      })

      expect(mockGetAdminStatsDb).toHaveBeenCalled()
    })

    it('should return 403 for non-admin user', async () => {
      const response = await request(app)
        .get('/api/admin/stats')
        .set('Authorization', 'Bearer organizer-token')
        .expect(403)

      expect(response.body).toEqual({
        error: 'Admin access required'
      })
    })

    it('should return 401 without authorization', async () => {
      const response = await request(app)
        .get('/api/admin/stats')
        .expect(401)

      expect(response.body).toEqual({
        error: 'Unauthorized'
      })
    })

    it('should handle database errors gracefully', async () => {
      process.env.NODE_ENV = 'production'

      mockGetAdminStatsDb.mockRejectedValue(new Error('Database error'))

      const response = await request(app)
        .get('/api/admin/stats')
        .set('Authorization', 'Bearer admin-token')
        .expect(500)

      expect(response.body).toEqual({
        error: 'Failed to fetch admin stats'
      })
    })
  })

  describe('GET /api/admin/events/inactive', () => {
    it('should return inactive events in test mode', async () => {
      process.env.NODE_ENV = 'test'

      const response = await request(app)
        .get('/api/admin/events/inactive')
        .set('Authorization', 'Bearer admin-token')
        .expect(200)

      expect(response.body).toEqual({
        events: [],
        pagination: {
          page: 1,
          limit: 20,
          total: 0,
          totalPages: 0
        }
      })
    })

    it('should return inactive events in production mode', async () => {
      process.env.NODE_ENV = 'production'

      const mockEvents = [
        {
          id: 'event-1',
          title: 'Inactive Event 1',
          description: 'Description',
          utcTimestamp: '2024-12-01T01:00:00.000Z',
          location: 'Venue 1',
          address: 'Address 1',
          category: 'Música',
          city: 'bogota',
          price: 50000,
          currency: 'COP',
          image: 'image.jpg',
          tags: [],
          active: false
        }
      ]

      mockListInactiveEventsDb.mockResolvedValue({
        events: mockEvents,
        total: 1
      })

      const response = await request(app)
        .get('/api/admin/events/inactive')
        .set('Authorization', 'Bearer admin-token')
        .expect(200)

      expect(response.body).toEqual({
        events: mockEvents,
        pagination: {
          page: 1,
          limit: 20,
          total: 1,
          totalPages: 1
        }
      })

      expect(mockListInactiveEventsDb).toHaveBeenCalledWith({
        city: undefined,
        q: undefined,
        page: 1,
        limit: 20
      })
    })

    it('should handle query parameters correctly', async () => {
      process.env.NODE_ENV = 'production'

      mockListInactiveEventsDb.mockResolvedValue({
        events: [],
        total: 0
      })

      const response = await request(app)
        .get('/api/admin/events/inactive?city=bogota&q=test&page=2&limit=10')
        .set('Authorization', 'Bearer admin-token')
        .expect(200)

      expect(mockListInactiveEventsDb).toHaveBeenCalledWith({
        city: 'bogota',
        q: 'test',
        page: 2,
        limit: 10
      })

      expect(response.body).toEqual({
        events: [],
        pagination: {
          page: 2,
          limit: 10,
          total: 0,
          totalPages: 0
        }
      })
    })

    it('should calculate total pages correctly', async () => {
      process.env.NODE_ENV = 'production'

      mockListInactiveEventsDb.mockResolvedValue({
        events: [],
        total: 45
      })

      const response = await request(app)
        .get('/api/admin/events/inactive?limit=10')
        .set('Authorization', 'Bearer admin-token')
        .expect(200)

      expect(response.body.pagination.totalPages).toBe(5)
    })

    it('should return 403 for non-admin user', async () => {
      const response = await request(app)
        .get('/api/admin/events/inactive')
        .set('Authorization', 'Bearer organizer-token')
        .expect(403)

      expect(response.body).toEqual({
        error: 'Admin access required'
      })
    })

    it('should return 401 without authorization', async () => {
      const response = await request(app)
        .get('/api/admin/events/inactive')
        .expect(401)

      expect(response.body).toEqual({
        error: 'Unauthorized'
      })
    })

    it('should handle database errors gracefully', async () => {
      process.env.NODE_ENV = 'production'

      mockListInactiveEventsDb.mockRejectedValue(new Error('Database error'))

      const response = await request(app)
        .get('/api/admin/events/inactive')
        .set('Authorization', 'Bearer admin-token')
        .expect(500)

      expect(response.body).toEqual({
        error: 'Failed to fetch inactive events'
      })
    })
  })

  describe('POST /api/admin/mine-url', () => {
    const testUrl = 'https://example.com/events'

    describe('Non-streaming mode', () => {
      it('should successfully mine URL with single url field', async () => {
        mockMineUrlsDirectlyStreaming.mockResolvedValue({
          success: true,
          eventsExtracted: 5,
          eventsStored: 4,
          eventsFailed: 1,
          details: 'Successfully mined 4 events'
        })

        const response = await request(app)
          .post('/api/admin/mine-url')
          .set('Authorization', 'Bearer admin-token')
          .send({ url: testUrl })
          .expect(200)

        expect(response.body).toEqual({
          success: true,
          message: 'URL mining completed successfully',
          eventsExtracted: 5,
          eventsStored: 4,
          eventsFailed: 1,
          details: 'Successfully mined 4 events'
        })

        expect(mockMineUrlsDirectlyStreaming).toHaveBeenCalledWith([testUrl], 'admin-id')
      })

      it('should successfully mine multiple URLs with urls array', async () => {
        mockMineUrlsDirectlyStreaming.mockResolvedValue({
          success: true,
          eventsExtracted: 10,
          eventsStored: 8,
          eventsFailed: 2,
          details: 'Successfully mined 8 events from 2 sources'
        })

        const response = await request(app)
          .post('/api/admin/mine-url')
          .set('Authorization', 'Bearer admin-token')
          .send({ urls: [testUrl, 'https://example.com/events2'] })
          .expect(200)

        expect(response.body.success).toBe(true)
        expect(response.body.eventsExtracted).toBe(10)
        expect(mockMineUrlsDirectlyStreaming).toHaveBeenCalledWith(
          [testUrl, 'https://example.com/events2'], 'admin-id'
        )
      })

      it('should handle mining failure', async () => {
        mockMineUrlsDirectlyStreaming.mockResolvedValue({
          success: false,
          eventsExtracted: 0,
          eventsStored: 0,
          eventsFailed: 0,
          error: 'Failed to fetch content'
        })

        const response = await request(app)
          .post('/api/admin/mine-url')
          .set('Authorization', 'Bearer admin-token')
          .send({ url: testUrl })
          .expect(500)

        expect(response.body).toEqual({
          success: false,
          error: 'Failed to fetch content',
          eventsExtracted: 0,
          eventsStored: 0,
          eventsFailed: 0
        })
      })

      it('should return 400 without url or urls', async () => {
        const response = await request(app)
          .post('/api/admin/mine-url')
          .set('Authorization', 'Bearer admin-token')
          .send({})
          .expect(400)

        expect(response.body).toEqual({
          error: 'Se requiere una URL o un array de URLs'
        })
      })

      it('should return 400 for empty urls array', async () => {
        const response = await request(app)
          .post('/api/admin/mine-url')
          .set('Authorization', 'Bearer admin-token')
          .send({ urls: [] })
          .expect(400)

        expect(response.body).toEqual({
          error: 'Se requiere una URL o un array de URLs'
        })
      })

      it('should return 400 for invalid URL format', async () => {
        const response = await request(app)
          .post('/api/admin/mine-url')
          .set('Authorization', 'Bearer admin-token')
          .send({ url: 'not-a-url' })
          .expect(400)

        expect(response.body.error).toContain('Formato de URL inválido')
      })

      it('should return 400 for invalid URL in urls array', async () => {
        const response = await request(app)
          .post('/api/admin/mine-url')
          .set('Authorization', 'Bearer admin-token')
          .send({ urls: [testUrl, 'not-a-url'] })
          .expect(400)

        expect(response.body.error).toContain('Formato de URL inválido')
      })

      it('should return 403 for non-admin user', async () => {
        const response = await request(app)
          .post('/api/admin/mine-url')
          .set('Authorization', 'Bearer organizer-token')
          .send({ url: testUrl })
          .expect(403)

        expect(response.body).toEqual({
          error: 'Admin access required'
        })
      })

      it('should return 401 without authorization', async () => {
        const response = await request(app)
          .post('/api/admin/mine-url')
          .send({ url: testUrl })
          .expect(401)

        expect(response.body).toEqual({
          error: 'Unauthorized'
        })
      })

      it('should handle unexpected errors', async () => {
        mockMineUrlsDirectlyStreaming.mockRejectedValue(new Error('Unexpected error'))

        const response = await request(app)
          .post('/api/admin/mine-url')
          .set('Authorization', 'Bearer admin-token')
          .send({ url: testUrl })
          .expect(500)

        expect(response.body).toEqual({
          error: 'Internal server error',
          success: false,
          eventsExtracted: 0,
          eventsStored: 0,
          eventsFailed: 0
        })
      })
    })

    describe('Streaming mode', () => {
      it('should successfully mine URL with streaming', async () => {
        mockMineUrlsDirectlyStreaming.mockImplementation(async (_urls, _userId, callback) => {
          if (callback) {
            callback('Starting mining...')
            callback('Processing events...')
          }
          return {
            success: true,
            eventsExtracted: 3,
            eventsStored: 3,
            eventsFailed: 0,
            details: 'Successfully mined 3 events'
          }
        })

        const response = await request(app)
          .post('/api/admin/mine-url')
          .set('Authorization', 'Bearer admin-token')
          .send({ url: testUrl, stream: true })
          .expect(200)

        expect(response.text).toContain('"status":"completed"')
        expect(response.text).toContain('"eventsStored":3')
        expect(response.text).toContain('"status":"end"')
        expect(mockMineUrlsDirectlyStreaming).toHaveBeenCalledWith(
          [testUrl],
          'admin-id',
          expect.any(Function)
        )
      })

      it('should handle mining failure with streaming', async () => {
        mockMineUrlsDirectlyStreaming.mockResolvedValue({
          success: false,
          eventsExtracted: 0,
          eventsStored: 0,
          eventsFailed: 0,
          error: 'Failed to extract events'
        })

        const response = await request(app)
          .post('/api/admin/mine-url')
          .set('Authorization', 'Bearer admin-token')
          .send({ url: testUrl, stream: true })
          .expect(200)

        expect(response.text).toContain('"status":"failed"')
        expect(response.text).toContain('Failed to extract events')
        expect(response.text).toContain('"status":"end"')
      })

      it('should handle unexpected errors in streaming mode', async () => {
        mockMineUrlsDirectlyStreaming.mockRejectedValue(new Error('Unexpected error'))

        const response = await request(app)
          .post('/api/admin/mine-url')
          .set('Authorization', 'Bearer admin-token')
          .send({ url: testUrl, stream: true })
          .expect(200)

        expect(response.text).toContain('"status":"failed"')
        expect(response.text).toContain('Error interno del servidor')
        expect(response.text).toContain('"status":"end"')
      })
    })
  })
})