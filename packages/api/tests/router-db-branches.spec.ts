/// <reference types="jest" />
import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals'
import express from 'express'
import request from 'supertest'

jest.mock('../src/db/repository', () => ({
  listEventsDb: jest.fn(),
  getEventByLegacyIdDb: jest.fn(),
  listEventsByCityDb: jest.fn()
}))

import { createEventsRouter } from '../src/routes/create-events-router'

describe('Router DB branches (mocked repo)', () => {
  const originalEnv = process.env.NODE_ENV
  const repo = require('../src/db/repository') as any

  beforeEach(() => {
    jest.resetAllMocks()
  })

  afterEach(() => {
    process.env.NODE_ENV = originalEnv
  })

  test('GET /api/events uses DB branch and returns empty list with pagination', async () => {
    process.env.NODE_ENV = 'production'
    repo.listEventsDb.mockResolvedValue({ events: [], total: 0 })
    const app = express()
    app.use('/api/events', createEventsRouter({ enableCache: false }))

    const res = await request(app).get('/api/events?limit=10&page=1')
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('pagination')
    expect(res.body.pagination.total).toBe(0)
    expect(res.body.pagination.totalPages).toBe(0)
    expect(repo.listEventsDb).toHaveBeenCalled()
  })

  test('GET /api/events/id/:id uses DB branch and returns 404 when not found', async () => {
    process.env.NODE_ENV = 'production'
    repo.getEventByLegacyIdDb.mockResolvedValue(null)
    const app = express()
    app.use('/api/events', createEventsRouter({ enableCache: false }))

    const res = await request(app).get('/api/events/id/unknown')
    expect(res.status).toBe(404)
    expect(repo.getEventByLegacyIdDb).toHaveBeenCalledWith('unknown')
  })

  test('GET /api/events/:city uses DB branch and returns 404 for unknown city', async () => {
    process.env.NODE_ENV = 'production'
    repo.listEventsByCityDb.mockResolvedValue(null)
    const app = express()
    app.use('/api/events', createEventsRouter({ enableCache: false }))

    const res = await request(app).get('/api/events/unknown-city')
    expect(res.status).toBe(404)
    expect(repo.listEventsByCityDb).toHaveBeenCalledWith('unknown-city')
  })

  test('GET /api/events/:city uses DB branch and returns events for valid city', async () => {
    process.env.NODE_ENV = 'production'
    repo.listEventsByCityDb.mockResolvedValue([
      { id: 'event-1', title: 'Test Event', date: '2024-06-01', city: 'bogota' },
      { id: 'event-2', title: 'Another Event', date: '2024-06-02', city: 'bogota' }
    ])
    const app = express()
    app.use('/api/events', createEventsRouter({ enableCache: false }))

    const res = await request(app).get('/api/events/bogota')
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('city', 'bogota')
    expect(res.body).toHaveProperty('events')
    expect(Array.isArray(res.body.events)).toBe(true)
    expect(res.body.events).toHaveLength(2)
    expect(repo.listEventsByCityDb).toHaveBeenCalledWith('bogota')
  })
})


