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
  getAdminStatsDb: jest.fn()
}))

import { getAdminStatsDb } from '../src/db/repository'

const mockGetAdminStatsDb = getAdminStatsDb as jest.MockedFunction<typeof getAdminStatsDb>

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
        activeEvents: 567
      })
    })

    it('should return admin stats for admin user in production mode', async () => {
      process.env.NODE_ENV = 'production'

      mockGetAdminStatsDb.mockResolvedValue({
        totalUsers: 999,
        activeEvents: 123
      })

      const response = await request(app)
        .get('/api/admin/stats')
        .set('Authorization', 'Bearer admin-token')
        .expect(200)

      expect(response.body).toEqual({
        totalUsers: 999,
        activeEvents: 123
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
})