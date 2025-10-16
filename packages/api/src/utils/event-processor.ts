import { query } from '../db/client'
import { ExtractedEvent } from '../event-schema'
import { CreateEventParams, EventDto } from '../db/repository'
import crypto from 'crypto'

/**
 * Converts an extracted event to database format
 */
export function convertExtractedEventToDbFormat(extractedEvent: ExtractedEvent): CreateEventParams {
  return {
    title: extractedEvent.title,
    description: extractedEvent.description,
    date: extractedEvent.date,
    time: extractedEvent.time,
    location: extractedEvent.location,
    address: extractedEvent.address,
    category: extractedEvent.category_slug,
    city: extractedEvent.city_slug,
    price: extractedEvent.Price,
    currency: 'COP',
    image: extractedEvent.image_url || undefined,
    tags: []
  }
}

/**
 * Checks if an event already exists in the database (duplicate detection)
 */
async function isDuplicateEvent(title: string, location: string): Promise<boolean> {
  try {
    const result = await query(
      `SELECT 1 FROM events
       WHERE LOWER(title_norm) = LOWER(normalize_text($1))
       AND LOWER(venue_norm) = LOWER(normalize_text($2))
       LIMIT 1`,
      [title, location]
    )
    return result.rows.length > 0
  } catch (error) {
    console.error('Error checking for duplicate event:', error)
    return false // If check fails, allow event to be created
  }
}

/**
 * Creates a mined event in the database with inactive status
 */
export async function createMinedEventDb(params: CreateEventParams, adminUserId: string, eventUrl?: string): Promise<EventDto> {
  const {
    title, description, date, time, location, address,
    category, city, price, currency, image, tags = []
  } = params

  const cityRes = await query<{ id: number }>(`SELECT id FROM cities WHERE slug = $1`, [city])
  if (cityRes.rows.length === 0) {
    throw new Error('Ciudad no encontrada')
  }
  const cityId = cityRes.rows[0].id

  const categoryRes = await query<{ id: number }>(`SELECT id FROM categories WHERE slug = $1`, [category])
  if (categoryRes.rows.length === 0) {
    throw new Error('Categoría no encontrada')
  }
  const categoryId = categoryRes.rows[0].id

  const eventId = crypto.randomUUID()
  // Convert Colombian time to UTC for storage
  const startsAt = `${date}T${time}:00-05:00`

  // Insert event with active=false for mined events
  await query(
    `INSERT INTO events (id, city_id, category_id, title, description, venue, address, starts_at, price_cents, currency, image, created_by, active, event_url)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, false, $13)`,
    [eventId, cityId, categoryId, title, description, location, address, startsAt, price, currency, image, adminUserId, eventUrl]
  )

  if (tags.length > 0) {
    for (const tagName of tags) {
      await query(
        `INSERT INTO tags (name) VALUES ($1) ON CONFLICT (name) DO NOTHING`,
        [tagName]
      )
      const tagRes = await query<{ id: number }>(`SELECT id FROM tags WHERE name = $1`, [tagName])
      if (tagRes.rows.length > 0) {
        await query(
          `INSERT INTO event_tags (event_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [eventId, tagRes.rows[0].id]
        )
      }
    }
  }

  const event = await getEventByIdDb(eventId)
  if (!event) {
    throw new Error('Error al crear el evento minado')
  }
  return event
}

/**
 * Gets an event by ID from database
 */
async function getEventByIdDb(eventId: string): Promise<EventDto | null> {
  const res = await query<{
    id: string
    title: string
    description: string
    venue: string | null
    address: string | null
    price_cents: number | null
    currency: string
    starts_at: string
    label: string
    slug: string
    image: string | null
    created_by: string | null
    event_url: string | null
    active: boolean
  }>(
    `SELECT e.id,
            e.title,
            e.description,
            e.venue as location,
            e.address,
            e.price_cents as price,
            e.currency,
            e.starts_at as utc_timestamp,
            ct.label as category,
            c.slug as city,
            e.image,
            e.created_by,
            e.event_url,
            e.active
     FROM events e
     JOIN cities c ON c.id = e.city_id
     JOIN categories ct ON ct.id = e.category_id
     WHERE e.id = $1
     LIMIT 1`, [eventId]
  )
  const r = res.rows[0]
  if (!r) return null

  const event: EventDto = {
    id: r.id,
    title: r.title,
    description: r.description,
    utcTimestamp: r.starts_at,
    location: r.venue ?? '',
    address: r.address ?? '',
    category: r.label,
    city: r.slug,
    price: r.price_cents,
    currency: r.currency,
    image: r.image ?? '',
    organizer: '',
    tags: [],
    created_by: r.created_by ?? undefined,
    event_url: r.event_url ?? undefined,
    active: r.active
  }
  return event
}

/**
 * Processes extracted events and stores them in the database
 * Returns array of successfully stored events
 */
export async function processExtractedEvents(extractedEvents: ExtractedEvent[], adminUserId: string): Promise<EventDto[]> {
  const storedEvents: EventDto[] = []
  const skippedEvents: string[] = []

  console.log(`[Event Processor] Processing ${extractedEvents.length} extracted events`)

  for (const extractedEvent of extractedEvents) {
    try {
      // Validate required fields
      if (!extractedEvent.title || !extractedEvent.date || !extractedEvent.time || !extractedEvent.category_slug || !extractedEvent.city_slug) {
        console.warn('[Event Processor] Skipping event due to missing required fields:', extractedEvent)
        skippedEvents.push(`${extractedEvent.title} - Missing required fields`)
        continue
      }

      // Check for duplicates
      const isDuplicate = await isDuplicateEvent(extractedEvent.title, extractedEvent.location)
      if (isDuplicate) {
        console.warn('[Event Processor] Skipping duplicate event:', extractedEvent.title)
        skippedEvents.push(`${extractedEvent.title} - Duplicate`)
        continue
      }

      // Convert to database format
      const eventData = convertExtractedEventToDbFormat(extractedEvent)

      // Store in database
      const storedEvent = await createMinedEventDb(eventData, adminUserId, extractedEvent.event_url)
      storedEvents.push(storedEvent)
      
      console.log(`[Event Processor] Successfully stored event: ${extractedEvent.title}`)
    } catch (error) {
      console.error(`[Event Processor] Failed to process event: ${extractedEvent.title}`, error)
      skippedEvents.push(`${extractedEvent.title} - Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  console.log(`[Event Processor] Processing complete. Stored: ${storedEvents.length}, Skipped: ${skippedEvents.length}`)
  if (skippedEvents.length > 0) {
    console.log(`[Event Processor] Skipped events:`, skippedEvents)
  }

  return storedEvents
}