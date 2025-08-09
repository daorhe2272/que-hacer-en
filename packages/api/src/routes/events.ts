import { Router } from 'express'
import fs from 'fs'
import path from 'path'
import type { Event, EventsData, CityKey } from '../types'
import { listQuerySchema, eventSchema } from '../validation'

export const router: Router = Router()

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

router.get('/', (req, res) => {
  try {
    const parseResult = listQuerySchema.safeParse(req.query)
    if (!parseResult.success) {
      res.status(400).json({ error: 'Parámetros inválidos', details: parseResult.error.flatten() })
      return
    }

    const data = readEvents()
    const { city, category, q, page = 1, limit = 20, sort, order = 'asc' } = parseResult.data

    let events: Event[] = [
      ...data.bogota,
      ...data.medellin,
      ...data.cali,
      ...data.barranquilla,
      ...data.cartagena
    ]

    if (city) events = (data[city as CityKey] ?? [])
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

    if (sort) {
      const dir = order === 'desc' ? -1 : 1
      if (sort === 'date') events = events.sort((a, b) => (a.date.localeCompare(b.date)) * dir)
      if (sort === 'price') events = events.sort((a, b) => (a.price - b.price) * dir)
    }

    const total = events.length
    const totalPages = Math.ceil(total / limit)
    const start = (page - 1) * limit
    const end = start + limit
    const items = events.slice(start, end)

    res.json({
      events: items,
      pagination: { page, limit, total, totalPages }
    })
  } catch (err) {
    res.status(500).json({ error: 'No se pudieron cargar los eventos' })
  }
})

router.get('/id/:id', (req, res) => {
  try {
    const data = readEvents()
    const { id } = req.params
    const all: Event[] = [
      ...data.bogota,
      ...data.medellin,
      ...data.cali,
      ...data.barranquilla,
      ...data.cartagena
    ]
    const found = all.find(e => e.id === id)
    if (!found) {
      res.status(404).json({ error: 'Event not found' })
      return
    }
    res.json(found)
  } catch (err) {
    res.status(500).json({ error: 'Failed to load event' })
  }
})

router.get('/:city', (req, res) => {
  try {
    const data = readEvents()
    const { city } = req.params
    const cityKey = city as CityKey
    const events = data[cityKey]
    if (!events) {
      res.status(404).json({ error: 'City not found' })
      return
    }
    res.json({ city: cityKey, events })
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


