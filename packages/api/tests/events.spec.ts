/// <reference types="jest" />
import { describe, test, expect } from '@jest/globals'
import request from 'supertest'
import app from '../src/index'

describe('Events API', () => {
  test('GET /api/health returns ok', async () => {
    const res = await request(app).get('/api/health')
    expect(res.status).toBe(200)
    expect(res.body.status).toBe('ok')
  })

  test('GET /api/events returns list', async () => {
    const res = await request(app).get('/api/events')
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.events)).toBe(true)
    expect(res.body.pagination.total).toBeGreaterThan(0)
  })

  test('GET /api/events/:city returns city list (happy path)', async () => {
    const res = await request(app).get('/api/events/bogota')
    expect(res.status).toBe(200)
    expect(res.body.city).toBe('bogota')
    expect(Array.isArray(res.body.events)).toBe(true)
  })

  test('GET /api/events/:city returns 404 for invalid city', async () => {
    const res = await request(app).get('/api/events/unknown-city')
    expect(res.status).toBe(404)
  })

  test('GET /api/events with filters works (edge case empty)', async () => {
    const res = await request(app).get('/api/events?city=cali&category=deportes&q=zzzz')
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.events)).toBe(true)
    expect(res.body.events.length).toBe(0)
    expect(res.body.pagination.total).toBe(0)
  })

  test('GET /api/events supports diacritics-insensitive search', async () => {
    const res = await request(app).get('/api/events?q=tecnologia')
    expect(res.status).toBe(200)
    const titles = (res.body.events as Array<{ title: string }>).map(e => e.title.toLowerCase())
    expect(titles.join(' ')).toContain('ia')
  })

  test('GET /api/events validation error for bad params', async () => {
    const res = await request(app).get('/api/events?page=0&limit=1000')
    expect(res.status).toBe(400)
  })

  test('POST /api/events validation error', async () => {
    const res = await request(app).post('/api/events').send({ title: 'x' })
    expect(res.status).toBe(400)
  })
})


