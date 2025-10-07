import { jest } from '@jest/globals'
import request from 'supertest'
import express from 'express'
import dataSourcesRouter from '../src/routes/data-sources'
import { query } from '../src/db/client'
import { createMockQuery } from './test-helpers/mock-database'

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
  },
  requireRole: () => (req: any, res: any, next: any) => {
    if (req.user?.role === 'admin') {
      next()
    } else {
      res.status(403).json({ error: 'Admin access required' })
    }
  }
}))

// Mock database client
const mockQuery = createMockQuery()
jest.mocked(query).mockImplementation(mockQuery)

describe('Data Sources Router', () => {
  let app: express.Application

  beforeEach(() => {
    app = express()
    app.use(express.json())

    // Mock correlation ID middleware
    app.use((req, _res, next) => {
      req.correlationId = 'test-correlation-id'
      next()
    })

    app.use('/api/data-sources', dataSourcesRouter)

    jest.clearAllMocks()
  })

  describe('GET /api/data-sources', () => {
    it('should return data sources list for admin user', async () => {
      const response = await request(app)
        .get('/api/data-sources')
        .set('Authorization', 'Bearer admin-token')
        .expect(200)

      expect(response.body).toHaveProperty('data_sources')
      expect(response.body).toHaveProperty('pagination')
      expect(Array.isArray(response.body.data_sources)).toBe(true)
      expect(response.body.pagination).toHaveProperty('page', 1)
      expect(response.body.pagination).toHaveProperty('total')
      expect(response.body.pagination).toHaveProperty('totalPages')
    })

    it('should filter by city', async () => {
      const response = await request(app)
        .get('/api/data-sources?city=bogota')
        .set('Authorization', 'Bearer admin-token')
        .expect(200)

      expect(response.body).toHaveProperty('data_sources')
    })

    it('should filter by source_type', async () => {
      const response = await request(app)
        .get('/api/data-sources?source_type=regular')
        .set('Authorization', 'Bearer admin-token')
        .expect(200)

      expect(response.body).toHaveProperty('data_sources')
    })

    it('should filter by active status', async () => {
      const response = await request(app)
        .get('/api/data-sources?active=true')
        .set('Authorization', 'Bearer admin-token')
        .expect(200)

      expect(response.body).toHaveProperty('data_sources')
    })

    it('should handle pagination', async () => {
      const response = await request(app)
        .get('/api/data-sources?page=2&limit=5')
        .set('Authorization', 'Bearer admin-token')
        .expect(200)

      expect(response.body.pagination).toHaveProperty('page', 2)
      expect(response.body.pagination).toHaveProperty('limit', 5)
    })

    it('should return 403 for non-admin user', async () => {
      const response = await request(app)
        .get('/api/data-sources')
        .set('Authorization', 'Bearer organizer-token')
        .expect(403)

      expect(response.body).toEqual({
        error: 'Admin access required'
      })
    })

    it('should return 401 without authorization', async () => {
      const response = await request(app)
        .get('/api/data-sources')
        .expect(401)

      expect(response.body).toEqual({
        error: 'Unauthorized'
      })
    })
  })

  describe('POST /api/data-sources', () => {
    it('should create new data source', async () => {
      const newDataSource = {
        url: 'https://example.com/new-source',
        source_type: 'regular',
        city_slug: 'bogota'
      }

      const response = await request(app)
        .post('/api/data-sources')
        .set('Authorization', 'Bearer admin-token')
        .send(newDataSource)
        .expect(201)

      expect(response.body).toHaveProperty('id')
      expect(response.body).toHaveProperty('url', newDataSource.url)
      expect(response.body).toHaveProperty('source_type', newDataSource.source_type)
      expect(response.body).toHaveProperty('active', true)
      expect(response.body).toHaveProperty('mining_status', 'pending')
    })

    it('should create occasional data source without city', async () => {
      const newDataSource = {
        url: 'https://example.com/occasional-source',
        source_type: 'occasional'
      }

      const response = await request(app)
        .post('/api/data-sources')
        .set('Authorization', 'Bearer admin-token')
        .send(newDataSource)
        .expect(201)

      expect(response.body).toHaveProperty('source_type', 'occasional')
    })

    it('should return 400 for missing required fields', async () => {
      const response = await request(app)
        .post('/api/data-sources')
        .set('Authorization', 'Bearer admin-token')
        .send({ url: 'https://example.com/test' })
        .expect(400)

      expect(response.body).toHaveProperty('error')
    })

    it('should return 400 for invalid source_type', async () => {
      const response = await request(app)
        .post('/api/data-sources')
        .set('Authorization', 'Bearer admin-token')
        .send({ url: 'https://example.com/test', source_type: 'invalid' })
        .expect(400)

      expect(response.body).toHaveProperty('error')
    })

    it('should return 400 for invalid URL', async () => {
      const response = await request(app)
        .post('/api/data-sources')
        .set('Authorization', 'Bearer admin-token')
        .send({ url: 'not-a-url', source_type: 'regular' })
        .expect(400)

      expect(response.body).toHaveProperty('error')
    })

    it('should return 400 for regular source without city', async () => {
      const response = await request(app)
        .post('/api/data-sources')
        .set('Authorization', 'Bearer admin-token')
        .send({ url: 'https://example.com/test', source_type: 'regular' })
        .expect(400)

      expect(response.body).toHaveProperty('error')
    })

    it('should return 400 for non-existent city', async () => {
      const response = await request(app)
        .post('/api/data-sources')
        .set('Authorization', 'Bearer admin-token')
        .send({ url: 'https://example.com/test', source_type: 'regular', city_slug: 'nonexistent' })
        .expect(400)

      expect(response.body).toHaveProperty('error')
    })

    it('should return 409 for duplicate data source', async () => {
      // Mock the sequence of queries for duplicate check
      mockQuery
        .mockImplementationOnce(() => ({ rows: [{ id: 1, slug: 'bogota', name: 'Bogotá' }], rowCount: 1 })) // City lookup
        .mockImplementationOnce(() => ({ rows: [{ id: 'existing' }], rowCount: 1 })) // Duplicate check

      const response = await request(app)
        .post('/api/data-sources')
        .set('Authorization', 'Bearer admin-token')
        .send({ url: 'https://example.com/duplicate', source_type: 'regular', city_slug: 'bogota' })
        .expect(409)

      expect(response.body).toHaveProperty('error')
    })

    it('should handle database INSERT failure gracefully', async () => {
      // Mock the sequence: city lookup succeeds, duplicate check succeeds (no duplicate), INSERT returns no rows
      mockQuery
        .mockImplementationOnce(() => ({ rows: [{ id: 1, slug: 'bogota', name: 'Bogotá' }], rowCount: 1 })) // City lookup
        .mockImplementationOnce(() => ({ rows: [], rowCount: 0 })) // Duplicate check (no existing)
        .mockImplementationOnce(() => ({ rows: [], rowCount: 0 })) // INSERT returns no rows

      const response = await request(app)
        .post('/api/data-sources')
        .set('Authorization', 'Bearer admin-token')
        .send({ url: 'https://example.com/test', source_type: 'regular', city_slug: 'bogota' })
        .expect(500)

      expect(response.body).toHaveProperty('error', 'Error al crear la fuente de datos')
    })
  })

  describe('PUT /api/data-sources/:id', () => {
    it('should update data source', async () => {
      const updates = {
        url: 'https://example.com/updated',
        active: false
      }

      const response = await request(app)
        .put('/api/data-sources/ds-001')
        .set('Authorization', 'Bearer admin-token')
        .send(updates)
        .expect(200)

      expect(response.body).toHaveProperty('id', 'ds-001')
      expect(response.body).toHaveProperty('url')
      expect(response.body).toHaveProperty('active')
    })

    it('should return 400 for invalid URL', async () => {
      const response = await request(app)
        .put('/api/data-sources/ds-001')
        .set('Authorization', 'Bearer admin-token')
        .send({ url: 'invalid-url' })
        .expect(400)

      expect(response.body).toHaveProperty('error')
    })

    it('should return 400 for invalid source_type', async () => {
      const response = await request(app)
        .put('/api/data-sources/ds-001')
        .set('Authorization', 'Bearer admin-token')
        .send({ source_type: 'invalid' })
        .expect(400)

      expect(response.body).toHaveProperty('error')
    })

    it('should return 400 for non-existent city', async () => {
      const response = await request(app)
        .put('/api/data-sources/ds-001')
        .set('Authorization', 'Bearer admin-token')
        .send({ city_slug: 'nonexistent' })
        .expect(400)

      expect(response.body).toHaveProperty('error')
    })

    it('should return 404 for non-existent data source', async () => {
      mockQuery.mockImplementationOnce(() => ({ rows: [], rowCount: 0 }))

      const response = await request(app)
        .put('/api/data-sources/nonexistent')
        .set('Authorization', 'Bearer admin-token')
        .send({ active: false })
        .expect(404)

      expect(response.body).toHaveProperty('error')
    })

    it('should return 400 for no fields to update', async () => {
      const response = await request(app)
        .put('/api/data-sources/ds-001')
        .set('Authorization', 'Bearer admin-token')
        .send({})
        .expect(400)

      expect(response.body).toHaveProperty('error')
    })

    it('should handle database error during city lookup in update', async () => {
      // Mock the sequence: data source exists, city lookup fails
      mockQuery
        .mockImplementationOnce(() => ({ rows: [{ created_by: 'admin-id' }], rowCount: 1 })) // Data source exists
        .mockImplementationOnce(() => {
          throw new Error('Database connection error')
        }) // City lookup fails

      const response = await request(app)
        .put('/api/data-sources/ds-001')
        .set('Authorization', 'Bearer admin-token')
        .send({ city_slug: 'bogota' })
        .expect(500)

      expect(response.body).toHaveProperty('error', 'Error interno del servidor')
    })
  })

  describe('DELETE /api/data-sources/:id', () => {
    it('should delete data source', async () => {
      const response = await request(app)
        .delete('/api/data-sources/ds-001')
        .set('Authorization', 'Bearer admin-token')
        .expect(200)

      expect(response.body).toEqual({
        message: 'Fuente de datos eliminada exitosamente'
      })
    })

    it('should return 404 for non-existent data source', async () => {
      mockQuery.mockImplementationOnce(() => ({ rows: [], rowCount: 0 }))

      const response = await request(app)
        .delete('/api/data-sources/nonexistent')
        .set('Authorization', 'Bearer admin-token')
        .expect(404)

      expect(response.body).toHaveProperty('error')
    })
  })

  describe('POST /api/data-sources/:id/mine', () => {
    it('should trigger mining for data source', async () => {
      const response = await request(app)
        .post('/api/data-sources/ds-001/mine')
        .set('Authorization', 'Bearer admin-token')
        .expect(200)

      expect(response.body).toEqual({
        message: 'Minería iniciada exitosamente',
        data_source_id: 'ds-001'
      })
    })

    it('should return 404 for non-existent data source', async () => {
      mockQuery.mockImplementationOnce(() => ({ rows: [], rowCount: 0 }))

      const response = await request(app)
        .post('/api/data-sources/nonexistent/mine')
        .set('Authorization', 'Bearer admin-token')
        .expect(404)

      expect(response.body).toHaveProperty('error')
    })

    it('should return 400 for inactive data source', async () => {
      mockQuery.mockImplementationOnce(() => ({ rows: [{ url: 'https://example.com/test', active: false }], rowCount: 1 }))

      const response = await request(app)
        .post('/api/data-sources/ds-001/mine')
        .set('Authorization', 'Bearer admin-token')
        .expect(400)

      expect(response.body).toHaveProperty('error')
    })

    it('should handle mining status update failure in setTimeout callback', async () => {
      // Mock the sequence: data source exists and is active, initial update succeeds, but setTimeout update fails
      mockQuery
        .mockImplementationOnce(() => ({ rows: [{ url: 'https://example.com/test', active: true }], rowCount: 1 })) // Data source check
        .mockImplementationOnce(() => ({ rows: [], rowCount: 1 })) // Initial mining_status update
        .mockImplementationOnce(() => {
          throw new Error('Database connection error')
        }) // setTimeout update fails

      const response = await request(app)
        .post('/api/data-sources/ds-001/mine')
        .set('Authorization', 'Bearer admin-token')
        .expect(200)

      expect(response.body).toEqual({
        message: 'Minería iniciada exitosamente',
        data_source_id: 'ds-001'
      })

      // Wait a bit for the setTimeout to execute
      await new Promise(resolve => setTimeout(resolve, 2100))
    })
  })
})