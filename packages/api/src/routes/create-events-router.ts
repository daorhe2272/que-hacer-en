import { Router } from 'express'
import fs from 'fs'
import path from 'path'
import type { Event, EventsData, CityKey } from '../types'
import { listQuerySchema, eventSchema } from '../validation'
import { listEventsDb, getEventByLegacyIdDb, listEventsByCityDb } from '../db/repository'

export type CreateEventsRouterOptions = {
  enableCache?: boolean
  cacheTtlMs?: number
}

function readEvents(): EventsData {
  const rootEventsPath = path.resolve(__dirname, '../../../../events.json')
  const content = fs.readFileSync(rootEventsPath, 'utf-8')
  return JSON.parse(content) as EventsData
}

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

type CacheEntry = { expiresAt: number, value: unknown }

export function createEventsRouter(options?: CreateEventsRouterOptions): Router {
  const router: Router = Router()
  const enableCache = options?.enableCache ?? (process.env.NODE_ENV !== 'test')
  const cacheTtlMs = options?.cacheTtlMs ?? 15_000
  const cache = new Map<string, CacheEntry>()

  function cacheGet<T>(key: string): T | undefined {
    if (!enableCache) return undefined
    const entry = cache.get(key)
    if (!entry) return undefined
    if (Date.now() > entry.expiresAt) {
      cache.delete(key)
      return undefined
    }
    return entry.value as T
  }

  function cacheSet<T>(key: string, value: T): void {
    if (!enableCache) return
    cache.set(key, { value, expiresAt: Date.now() + cacheTtlMs })
  }

  router.get('/', async (req, res) => {
    try {
      const parseResult = listQuerySchema.safeParse(req.query)
      if (!parseResult.success) {
        res.status(400).json({ error: 'Parámetros inválidos', details: parseResult.error.flatten() })
        return
      }

      const params = parseResult.data
      const cacheKey = JSON.stringify(params)
      const cached = cacheGet<{ events: Event[], pagination: { page: number, limit: number, total: number, totalPages: number } }>(cacheKey)
      if (cached) {
        res.json(cached)
        return
      }

      const { city, category, q, from, to, minPrice, maxPrice, page = 1, limit = 20, sort, order = 'asc' } = params

      const useDb = !!process.env.DATABASE_URL && process.env.NODE_ENV !== 'test'

      let payload: { events: Event[], pagination: { page: number, limit: number, total: number, totalPages: number } }
      if (useDb) {
        const { events, total } = await listEventsDb({ city, category, q, from, to, minPrice, maxPrice, page, limit, sort, order })
        const totalPages = Math.ceil(total / limit)
        payload = { events: events as Event[], pagination: { page, limit, total, totalPages } }
      } else {
        const data = readEvents()
        let events: Event[] = [
          ...data.bogota,
          ...data.medellin,
          ...data.cali,
          ...data.barranquilla,
          ...data.cartagena
        ]
        if (city) events = data[city as CityKey]
        if (category) events = events.filter(e => normalize(e.category) === normalize(category))
        if (q) {
          const term = normalize(q)
          events = events.filter(e =>
            normalize(e.title).includes(term) ||
            normalize(e.description).includes(term) ||
            normalize(e.location).includes(term) ||
            e.tags.some(t => normalize(t).includes(term))
          )
        }
        if (from) events = events.filter(e => `${e.date}` >= from)
        if (to) events = events.filter(e => `${e.date}` <= to)
        if (typeof minPrice === 'number') events = events.filter(e => e.price >= minPrice)
        if (typeof maxPrice === 'number') events = events.filter(e => e.price <= maxPrice)
        if (sort) {
          const dir = order === 'desc' ? -1 : 1
          if (sort === 'date') {
            events = events.sort((a, b) => {
              const aKey = `${a.date}T${a.time}`
              const bKey = `${b.date}T${b.time}`
              const cmp = aKey.localeCompare(bKey)
              if (cmp !== 0) return cmp * dir
              return a.id.localeCompare(b.id)
            })
          }
          if (sort === 'price') {
            events = events.sort((a, b) => {
              const cmp = a.price - b.price
              if (cmp !== 0) return cmp * dir
              return a.id.localeCompare(b.id)
            })
          }
        }
        const total = events.length
        const totalPages = Math.ceil(total / limit)
        const start = (page - 1) * limit
        const end = start + limit
        const items = events.slice(start, end)
        payload = { events: items, pagination: { page, limit, total, totalPages } }
      }

      cacheSet(cacheKey, payload)
      res.json(payload)
    } catch (err) {
      res.status(500).json({ error: 'No se pudieron cargar los eventos' })
    }
  })

  router.get('/id/:id', async (req, res) => {
    try {
      const { id } = req.params
      const useDb = !!process.env.DATABASE_URL && process.env.NODE_ENV !== 'test'
      const found = useDb ? await getEventByLegacyIdDb(id) : (() => {
        const data = readEvents()
        const all: Event[] = [
          ...data.bogota,
          ...data.medellin,
          ...data.cali,
          ...data.barranquilla,
          ...data.cartagena
        ]
        return all.find(e => e.id === id)
      })()
      if (!found) {
        res.status(404).json({ error: 'Event not found' })
        return
      }
      res.json(found)
    } catch (err) {
      res.status(500).json({ error: 'Failed to load event' })
    }
  })

  router.get('/:city', async (req, res) => {
    try {
      const { city } = req.params
      const useDb = !!process.env.DATABASE_URL && process.env.NODE_ENV !== 'test'
      if (useDb) {
        const events = await listEventsByCityDb(city)
        if (!events) {
          res.status(404).json({ error: 'City not found' })
          return
        }
        res.json({ city, events })
        return
      }
      const data = readEvents()
      const events = data[city as CityKey]
      if (!events) {
        res.status(404).json({ error: 'City not found' })
        return
      }
      res.json({ city, events })
    } catch (err) {
      res.status(500).json({ error: 'Failed to load events' })
    }
  })

  router.post('/', (req, res) => {
    const parsed = eventSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ error: 'Datos inválidos', details: parsed.error.flatten() })
      return
    }
    res.status(201).json({ message: 'Evento recibido (mock)', event: parsed.data })
  })

  return router
}
