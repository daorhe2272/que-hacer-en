import { describe, test, expect, afterAll } from '@jest/globals'
import request from 'supertest'
import app from '../src/index'

describe('CORS variantes', () => {
  const originalCors = process.env.CORS_ORIGINS

  afterAll(() => {
    process.env.CORS_ORIGINS = originalCors
  })

  test('Cuando CORS_ORIGINS está vacío, permite cualquier origen', async () => {
    process.env.CORS_ORIGINS = ''
    const res = await request(app).get('/api/health').set('Origin', 'http://cualquiera.com')
    expect(res.status).toBe(200)
    expect(res.headers['access-control-allow-origin']).toBe('http://cualquiera.com')
  })
})
