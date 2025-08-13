import { describe, test, expect } from '@jest/globals'
import request from 'supertest'
import app from '../src/index'

describe('Búsqueda por texto cubre ramas OR', () => {
  test('q que coincide en título', async () => {
    const res = await request(app).get('/api/events?q=carnaval')
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.events)).toBe(true)
    expect(res.body.events.length).toBeGreaterThan(0)
  })

  test('q que coincide en descripción', async () => {
    const res = await request(app).get('/api/events?q=inteligencia')
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.events)).toBe(true)
    expect(res.body.events.length).toBeGreaterThan(0)
  })

  test('q que coincide en ubicación/location', async () => {
    const res = await request(app).get('/api/events?q=cinemateca')
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.events)).toBe(true)
    expect(res.body.events.length).toBeGreaterThan(0)
  })

  test('q que coincide en tags', async () => {
    const res = await request(app).get('/api/events?q=festival')
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.events)).toBe(true)
    expect(res.body.events.length).toBeGreaterThan(0)
  })
})
