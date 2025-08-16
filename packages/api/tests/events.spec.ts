/// <reference types="jest" />
import { describe, test, expect } from '@jest/globals'
import request from 'supertest'
import app from '../src/index'
import fs from 'fs'

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
    // Mock JWT verification for auth middleware
    jest.doMock('jose', () => ({
      jwtVerify: jest.fn(async () => ({ payload: { sub: 'user-1', email: 'organizer@example.com', user_role: 'organizer' } }))
    }))
    
    const res = await request(app)
      .post('/api/events')
      .set('Authorization', 'Bearer valid')
      .send({ title: 'x' })
    expect(res.status).toBe(400)
  })

  test('GET /api/events?city=bogota returns filtered list', async () => {
    const res = await request(app).get('/api/events?city=bogota')
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.events)).toBe(true)
  })

  test('GET /api/events sorted by date asc/desc', async () => {
    const asc = await request(app).get('/api/events?sort=date&order=asc')
    expect(asc.status).toBe(200)
    const datesAsc = (asc.body.events as Array<{ date: string }>).map(e => e.date)
    const sortedAsc = [...datesAsc].sort((a, b) => a.localeCompare(b))
    expect(datesAsc).toEqual(sortedAsc)

    const desc = await request(app).get('/api/events?sort=date&order=desc')
    expect(desc.status).toBe(200)
    const datesDesc = (desc.body.events as Array<{ date: string }>).map(e => e.date)
    const sortedDesc = [...datesDesc].sort((a, b) => b.localeCompare(a))
    expect(datesDesc).toEqual(sortedDesc)
  })

  test('GET /api/events sorted by price asc/desc', async () => {
    const asc = await request(app).get('/api/events?sort=price&order=asc')
    expect(asc.status).toBe(200)
    const pricesAsc = (asc.body.events as Array<{ price: number }>).map(e => e.price)
    const sortedAsc = [...pricesAsc].sort((a, b) => a - b)
    expect(pricesAsc).toEqual(sortedAsc)

    const desc = await request(app).get('/api/events?sort=price&order=desc')
    expect(desc.status).toBe(200)
    const pricesDesc = (desc.body.events as Array<{ price: number }>).map(e => e.price)
    const sortedDesc = [...pricesDesc].sort((a, b) => b - a)
    expect(pricesDesc).toEqual(sortedDesc)
  })

  test('Orden estable por fecha+hora con desempate por id', async () => {
    // Creamos una lista pequeña y comparamos que a igualdad de fecha/hora el orden respeta id asc
    const res = await request(app).get('/api/events?sort=date&order=asc&city=bogota')
    expect(res.status).toBe(200)
    const events = res.body.events as Array<{ date: string, time: string, id: string }>
    const sameDate = events.filter(e => e.date === events[0].date && e.time === events[0].time)
    if (sameDate.length > 1) {
      const ids = sameDate.map(e => e.id)
      const sortedIds = [...ids].sort((a, b) => a.localeCompare(b))
      expect(ids).toEqual(sortedIds)
    }
  })

  test('Cabeceras de rate limit presentes y coherentes', async () => {
    const res = await request(app).get('/api/events')
    expect(res.status).toBe(200)
    // express-rate-limit con standardHeaders: true envía cabeceras "RateLimit-*"
    expect(res.headers['ratelimit-limit']).toBeDefined()
    expect(res.headers['ratelimit-remaining']).toBeDefined()
  })

  test('GET /api/events/id/:id returns event by id', async () => {
    const res = await request(app).get('/api/events/id/bg-001')
    expect(res.status).toBe(200)
    expect(res.body.id).toBe('bg-001')
  })

  test('GET /api/events/id/:id devuelve 404 si no existe', async () => {
    const res = await request(app).get('/api/events/id/does-not-exist')
    expect(res.status).toBe(404)
  })

  test('POST /api/events happy path', async () => {
    // Mock JWT verification for auth middleware
    jest.doMock('jose', () => ({
      jwtVerify: jest.fn(async () => ({ payload: { sub: 'user-1', email: 'organizer@example.com', user_role: 'organizer' } }))
    }))

    const body = {
      title: 'Charla de Tecnología',
      description: 'Charlas sobre IA y futuro',
      date: '2024-10-10',
      time: '18:30',
      location: 'Auditorio Central',
      address: 'Calle 1 # 2-34',
      category: 'Tecnología',
      price: 10000,
      currency: 'COP',
      image: 'https://example.com/charla.jpg',
      organizer: 'Tech Org',
      capacity: 100,
      tags: ['tech'],
      status: 'active'
    }
    const res = await request(app)
      .post('/api/events')
      .set('Authorization', 'Bearer valid')
      .send(body)
    expect(res.status).toBe(201)
    expect(res.body.event.title).toBe('Charla de Tecnología')
  })

  test('Error 500 en /api/events cuando la lectura de eventos falla', async () => {
    const spy = jest.spyOn(fs, 'readFileSync').mockImplementation(() => { throw new Error('boom') })
    const res = await request(app).get('/api/events')
    expect(res.status).toBe(500)
    spy.mockRestore()
  })

  test('Error 500 en /api/events/id/:id cuando la lectura falla', async () => {
    const spy = jest.spyOn(fs, 'readFileSync').mockImplementation(() => { throw new Error('boom') })
    const res = await request(app).get('/api/events/id/bg-001')
    expect(res.status).toBe(500)
    spy.mockRestore()
  })

  test('Error 500 en /api/events/:city cuando la lectura falla', async () => {
    const spy = jest.spyOn(fs, 'readFileSync').mockImplementation(() => { throw new Error('boom') })
    const res = await request(app).get('/api/events/bogota')
    expect(res.status).toBe(500)
    spy.mockRestore()
  })

  test('RUTA 404 genérica devuelve 404', async () => {
    const res = await request(app).get('/api/unknown')
    expect(res.status).toBe(404)
  })

  test('GET /api/events?city=unknown (query) devuelve 400 por validación', async () => {
    const res = await request(app).get('/api/events?city=unknown')
    expect(res.status).toBe(400)
  })

  test('GET /api/events filtra por categoría con normalización (musica)', async () => {
    const res = await request(app).get('/api/events?category=musica')
    expect(res.status).toBe(200)
    const cats = (res.body.events as Array<{ category: string }>).map(e => e.category.toLowerCase())
    expect(cats.every(c => c.includes('música') || c.includes('musica'))).toBe(true)
  })

  test('GET /api/events busca por tag (gratis)', async () => {
    const res = await request(app).get('/api/events?q=gratis')
    expect(res.status).toBe(200)
    const titles = (res.body.events as Array<{ title: string }>).map(e => e.title)
    expect(Array.isArray(titles)).toBe(true)
  })

  test('GET /api/events sort=price sin order usa asc por defecto', async () => {
    const r = await request(app).get('/api/events?sort=price')
    expect(r.status).toBe(200)
    const prices = (r.body.events as Array<{ price: number }>).map(e => e.price)
    const sortedAsc = [...prices].sort((a, b) => a - b)
    expect(prices).toEqual(sortedAsc)
  })

  // New filters: date range and price range
  test('GET /api/events with from filters events on/after the date', async () => {
    const res = await request(app).get('/api/events?from=2024-06-01')
    expect(res.status).toBe(200)
    const dates = (res.body.events as Array<{ date: string }>).map(e => e.date)
    expect(dates.every(d => d >= '2024-06-01')).toBe(true)
  })

  test('GET /api/events with to filters events on/before the date', async () => {
    const res = await request(app).get('/api/events?to=2024-03-31')
    expect(res.status).toBe(200)
    const dates = (res.body.events as Array<{ date: string }>).map(e => e.date)
    expect(dates.every(d => d <= '2024-03-31')).toBe(true)
  })

  test('GET /api/events with minPrice filters events by minimum price', async () => {
    const res = await request(app).get('/api/events?minPrice=50000')
    expect(res.status).toBe(200)
    const prices = (res.body.events as Array<{ price: number }>).map(e => e.price)
    expect(prices.every(p => p >= 50000)).toBe(true)
  })

  test('GET /api/events with maxPrice filters events by maximum price', async () => {
    const res = await request(app).get('/api/events?maxPrice=10000')
    expect(res.status).toBe(200)
    const prices = (res.body.events as Array<{ price: number }>).map(e => e.price)
    expect(prices.every(p => p <= 10000)).toBe(true)
  })

  test('GET /api/events with from+to within city bounds returns only that window', async () => {
    const res = await request(app).get('/api/events?city=bogota&from=2024-04-01&to=2024-04-30')
    expect(res.status).toBe(200)
    const dates = (res.body.events as Array<{ date: string }>).map(e => e.date)
    expect(dates.every(d => d >= '2024-04-01' && d <= '2024-04-30')).toBe(true)
  })

  test('GET /api/events returns 400 for bad from format', async () => {
    const res = await request(app).get('/api/events?from=2024/01/01')
    expect(res.status).toBe(400)
  })
})

describe('Infra (CORS y Correlation ID)', () => {
  const originalCors = process.env.CORS_ORIGINS

  afterAll(() => {
    process.env.CORS_ORIGINS = originalCors
  })

  test('CORS permite origen configurado', async () => {
    process.env.CORS_ORIGINS = 'http://allowed.com'
    const res = await request(app).get('/api/health').set('Origin', 'http://allowed.com')
    expect(res.status).toBe(200)
    expect(res.headers['access-control-allow-origin']).toBe('http://allowed.com')
  })

  test('CORS bloquea origen no permitido (403)', async () => {
    process.env.CORS_ORIGINS = 'http://allowed.com'
    const res = await request(app).get('/api/health').set('Origin', 'http://blocked.com')
    expect(res.status).toBe(403)
    expect(res.body.error).toBe('CORS no permitido')
  })

  test('Propaga x-correlation-id en respuestas', async () => {
    const res = await request(app).get('/api/health').set('x-correlation-id', 'abc-123')
    expect(res.status).toBe(200)
    expect(res.headers['x-correlation-id']).toBe('abc-123')
  })

  test('Genera x-correlation-id cuando no viene en la request', async () => {
    const res = await request(app).get('/api/health')
    expect(res.status).toBe(200)
    expect(typeof res.headers['x-correlation-id']).toBe('string')
    expect((res.headers['x-correlation-id'] as string).length).toBeGreaterThan(0)
  })
})


