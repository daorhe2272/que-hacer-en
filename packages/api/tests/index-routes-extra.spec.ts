/// <reference types="jest" />
import request from 'supertest'
import app from '../src'

describe('index extra coverage', () => {
  test('returns 404 for unknown route', async () => {
    const res = await request(app).get('/api/does-not-exist')
    expect(res.status).toBe(404)
    expect(res.body).toEqual({ error: 'Not Found' })
  })

  test('CORS denies when origin not allowed', async () => {
    process.env.CORS_ORIGINS = 'https://allow.example.com'
    const res = await request(app).get('/api/health').set('Origin', 'https://deny.example.com')
    expect([403, 500]).toContain(res.status)
  })
})


