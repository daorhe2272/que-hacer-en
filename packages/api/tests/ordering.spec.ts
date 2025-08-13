import { describe, test, expect } from '@jest/globals'
import request from 'supertest'
import app from '../src/index'

describe('Ordenamiento estable en empates', () => {
  test('Empates por precio usan id ascendente como desempate', async () => {
    const res = await request(app).get('/api/events?sort=price&order=asc')
    expect(res.status).toBe(200)
    const events = res.body.events as Array<{ id: string; price: number }>

    const zeroPriced = events.filter(e => e.price === 0)
    if (zeroPriced.length > 1) {
      const ids = zeroPriced.map(e => e.id)
      const sortedIds = [...ids].sort((a, b) => a.localeCompare(b))
      expect(ids).toEqual(sortedIds)
    } else {
      // Si no hay suficientes empates visibles en la primera página, verificar en todas
      const resAll = await request(app).get('/api/events?sort=price&order=asc&limit=100')
      expect(resAll.status).toBe(200)
      const all = resAll.body.events as Array<{ id: string; price: number }>
      const zeros = all.filter(e => e.price === 0)
      if (zeros.length > 1) {
        const ids = zeros.map(e => e.id)
        const sortedIds = [...ids].sort((a, b) => a.localeCompare(b))
        expect(ids).toEqual(sortedIds)
      }
    }
  })
})
