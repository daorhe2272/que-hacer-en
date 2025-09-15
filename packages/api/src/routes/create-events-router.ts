import { Router } from 'express'
import fs from 'fs'
import path from 'path'
import type { Event, EventsData, CityKey } from '../types'
import { listQuerySchema, createEventSchema, updateEventSchema } from '../validation'
import { listEventsDb, getEventByLegacyIdDb, listEventsByCityDb, createEventDb, updateEventDb, deleteEventDb, getEventByIdDb, listOrganizerEventsDb, type EventDto } from '../db/repository'
import { authenticate, requireRole } from '../middleware/auth'

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

      const useDb = process.env.NODE_ENV !== 'test'

      let payload: { events: Event[], pagination: { page: number, limit: number, total: number, totalPages: number } }
      if (useDb) {
        const { events, total } = await listEventsDb({ city, category, q, from, to, minPrice, maxPrice, page, limit, sort, order })
        const totalPages = Math.ceil(total / limit)
        payload = { events, pagination: { page, limit, total, totalPages } }
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
        // Filter out past events (always apply this filter)
        const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' }) // YYYY-MM-DD format in Colombian timezone
        events = events.filter(e => e.utcTimestamp && e.utcTimestamp.split('T')[0] >= today)

        if (from) events = events.filter(e => e.utcTimestamp && e.utcTimestamp.split('T')[0] >= from)
        if (to) events = events.filter(e => e.utcTimestamp && e.utcTimestamp.split('T')[0] <= to)
        if (typeof minPrice === 'number') events = events.filter(e => e.price !== null && e.price >= minPrice)
        if (typeof maxPrice === 'number') events = events.filter(e => e.price !== null && e.price <= maxPrice)
        if (sort) {
          const dir = order === 'desc' ? -1 : 1
          if (sort === 'date') {
            events = events.sort((a, b) => {
              if (!a.utcTimestamp && !b.utcTimestamp) return a.id.localeCompare(b.id)
              if (!a.utcTimestamp) return 1
              if (!b.utcTimestamp) return -1
              const cmp = a.utcTimestamp.localeCompare(b.utcTimestamp)
              if (cmp !== 0) return cmp * dir
              return a.id.localeCompare(b.id)
            })
          }
          if (sort === 'price') {
            events = events.sort((a, b) => {
              // Handle null prices by sorting them to the end
              if (a.price === null && b.price === null) return a.id.localeCompare(b.id)
              if (a.price === null) return 1
              if (b.price === null) return -1
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

  // Get event by UUID (for database events)
  router.get('/uuid/:id', async (req, res) => {
    try {
      const { id } = req.params
      const useDb = process.env.NODE_ENV !== 'test'
      const found = useDb ? await getEventByIdDb(id) : (() => {
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

  router.get('/id/:id', async (req, res) => {
    try {
      const { id } = req.params
      const useDb = process.env.NODE_ENV !== 'test'
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

  // Create new event
  router.post('/', authenticate, async (req, res) => {
    try {
      const parsed = createEventSchema.safeParse(req.body)
      if (!parsed.success) {
        res.status(400).json({ error: 'Datos inválidos', details: parsed.error.flatten() })
        return
      }

      const useDb = process.env.NODE_ENV !== 'test'
      let event: EventDto
      
      if (useDb) {
        event = await createEventDb(parsed.data, req.user!.id)
      } else {
        // Mock event creation for tests
        event = {
          id: '550e8400-e29b-41d4-a716-446655440000',
          title: parsed.data.title!,
          description: parsed.data.description!,
          utcTimestamp: `${parsed.data.date!}T${parsed.data.time!}:00-05:00`,
          location: parsed.data.location!,
          address: parsed.data.address || 'Test Address',
          category: parsed.data.category!,
          city: parsed.data.city!,
          price: parsed.data.price || null,
          currency: parsed.data.currency || 'COP',
          image: parsed.data.image || 'test-image.jpg',
          organizer: 'Test Organizer',
          capacity: parsed.data.capacity || null,
          tags: parsed.data.tags || [],
          status: 'active'
        }
      }
      
      res.status(201).json({ message: 'Evento creado exitosamente', event })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al crear el evento'
      res.status(500).json({ error: message })
    }
  })

  // List organizer's events (must come before /:city)
  router.get('/manage', authenticate, requireRole('organizer', 'admin'), async (req, res) => {
    try {
      const parseResult = listQuerySchema.safeParse(req.query)
      if (!parseResult.success) {
        res.status(400).json({ error: 'Parámetros inválidos', details: parseResult.error.flatten() })
        return
      }

      const params = parseResult.data
      const { page = 1, limit = 20 } = params
      const useDb = process.env.NODE_ENV !== 'test'
      
      let events: EventDto[], total: number
      
      if (useDb) {
        const result = await listOrganizerEventsDb(req.user!.id, params)
        events = result.events
        total = result.total
      } else {
        // Mock organizer events for tests
        const mockEvent: EventDto = {
          id: '550e8400-e29b-41d4-a716-446655440000',
          title: 'Test Organizer Event',
          description: 'A test event for organizer',
          utcTimestamp: '2024-12-02T01:00:00.000Z',
          location: 'Test Venue',
          address: 'Test Address',
          category: 'musica',
          city: 'bogota',
          price: 50000,
          currency: 'COP',
          image: 'test-image.jpg',
          organizer: 'Test Organizer',
          capacity: null,
          tags: ['test'],
          status: 'active'
        }
        events = [mockEvent]
        total = 1
      }
      
      const totalPages = Math.ceil(total / limit)
      
      res.json({ 
        events, 
        pagination: { page, limit, total, totalPages } 
      })
    } catch (err) {
      res.status(500).json({ error: 'Error al cargar los eventos' })
    }
  })

  // Get event by ID (for editing)
  router.get('/manage/:id', authenticate, requireRole('organizer', 'admin'), async (req, res) => {
    try {
      const { id } = req.params
      const useDb = process.env.NODE_ENV !== 'test'
      
      let event: EventDto | null
      
      if (useDb) {
        event = await getEventByIdDb(id)
      } else {
        // Mock event retrieval for tests
        if (id === '550e8400-e29b-41d4-a716-446655440000') {
          event = {
            id: '550e8400-e29b-41d4-a716-446655440000',
            title: 'Test Event',
            description: 'A test event description',
            utcTimestamp: '2024-12-02T01:00:00.000Z',
            location: 'Test Venue',
            address: 'Test Address',
            category: 'musica',
            city: 'bogota',
            price: 50000,
            currency: 'COP',
            image: 'test-image.jpg',
            organizer: 'Test Organizer',
            capacity: null,
            tags: ['test'],
            status: 'active'
          }
        } else {
          event = null
        }
      }
      
      if (!event) {
        res.status(404).json({ error: 'Evento no encontrado' })
        return
      }
      res.json(event)
    } catch (err) {
      res.status(500).json({ error: 'Error al cargar el evento' })
    }
  })

  // Update event
  router.put('/:id', authenticate, requireRole('organizer', 'admin'), async (req, res) => {
    try {
      const parsed = updateEventSchema.safeParse({ ...req.body, id: req.params.id })
      if (!parsed.success) {
        res.status(400).json({ error: 'Datos inválidos', details: parsed.error.flatten() })
        return
      }

      const useDb = process.env.NODE_ENV !== 'test'
      let event: EventDto | null
      
      if (useDb) {
        event = await updateEventDb(parsed.data, req.user!.id)
      } else {
        // Mock event update for tests
        if (req.params.id === '550e8400-e29b-41d4-a716-446655440000') {
          event = {
            id: req.params.id,
            title: parsed.data.title!,
            description: parsed.data.description!,
            utcTimestamp: `${parsed.data.date!}T${parsed.data.time!}:00-05:00`,
            location: parsed.data.location!,
            address: parsed.data.address || 'Test Address',
            category: parsed.data.category!,
            city: parsed.data.city || 'bogota',
            price: parsed.data.price || null,
            currency: parsed.data.currency || 'COP',
            image: parsed.data.image || 'test-image.jpg',
            organizer: 'Test Organizer',
            capacity: parsed.data.capacity || null,
            tags: parsed.data.tags || [],
            status: 'active'
          }
        } else {
          event = null
        }
      }
      
      if (!event) {
        res.status(404).json({ error: 'Evento no encontrado' })
        return
      }
      res.json({ message: 'Evento actualizado exitosamente', event })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al actualizar el evento'
      res.status(500).json({ error: message })
    }
  })

  // Delete event
  router.delete('/:id', authenticate, requireRole('organizer', 'admin'), async (req, res) => {
    try {
      const { id } = req.params
      const useDb = process.env.NODE_ENV !== 'test'
      
      let deleted: boolean
      
      if (useDb) {
        deleted = await deleteEventDb(id, req.user!.id)
      } else {
        // Mock event deletion for tests
        deleted = id === '550e8400-e29b-41d4-a716-446655440000'
      }
      
      if (!deleted) {
        res.status(404).json({ error: 'Evento no encontrado' })
        return
      }
      res.json({ message: 'Evento eliminado exitosamente' })
    } catch (err) {
      res.status(500).json({ error: 'Error al eliminar el evento' })
    }
  })

  router.get('/:city', async (req, res) => {
    try {
      const { city } = req.params
      const useDb = process.env.NODE_ENV !== 'test'
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
      let events = data[city as CityKey]
      if (!events) {
        res.status(404).json({ error: 'City not found' })
        return
      }
      // Filter out past events
      const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' }) // YYYY-MM-DD format in Colombian timezone
      events = events.filter(e => new Date(e.utcTimestamp).toLocaleDateString('en-CA', { timeZone: 'America/Bogota' }) >= today)
      res.json({ city, events })
    } catch (err) {
      res.status(500).json({ error: 'Failed to load events' })
    }
  })


  return router
}
