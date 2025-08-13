import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals'
import request from 'supertest'
import express from 'express'
import { createEventsRouter } from '../src/routes/create-events-router'

describe('Cache behavior (router factory)', () => {
  beforeEach(() => {
    jest.restoreAllMocks()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  test('serves cached payload on identical query within TTL', async () => {
    const app = express()
    app.use('/api/events', createEventsRouter({ enableCache: true }))

    const r1 = await request(app).get('/api/events').expect(200)
    const r2 = await request(app).get('/api/events').expect(200)
    expect(r2.body).toEqual(r1.body)
  })

  test('expires cache after TTL and reprocesses request', async () => {
    const app = express()
    app.use('/api/events', createEventsRouter({ enableCache: true }))

    const realNow = Date.now
    let now = realNow()
    jest.spyOn(Date, 'now').mockImplementation(() => now)

    const r1 = await request(app).get('/api/events').expect(200)
    now += 16_000
    const r2 = await request(app).get('/api/events').expect(200)

    expect(r2.body).toEqual(r1.body)
  })
})
