import { query } from '../db/client'
import { ExtractedEvent } from '../event-schema'
import { CreateEventParams, EventDto } from '../db/repository'
import { ExistingEventSummary, checkSemanticDuplicates } from './event-deduplicator'
import { enrichEventFromHtml } from './event-enricher'
import { fetchHtmlContent } from './html-fetcher'
import crypto from 'crypto'

function normalize(text: string): string {
  return text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

// '08:00' and '00:00' are sentinel values the extractor assigns when no time is found, so they
// are treated as wildcards: an unknown time should not exclude an otherwise-matching event.
function timeMatches(candidateTime: string, existingTime: string): boolean {
  if (candidateTime === '08:00' || candidateTime === '00:00' || existingTime === '08:00' || existingTime === '00:00') return true
  return candidateTime === existingTime
}

/**
 * Runs `fn` for each item with at most `limit` in-flight calls, preserving input
 * order in the returned array. Errors must be contained inside `fn` (e.g. return
 * a tagged result) so a single failure doesn't reject the whole batch.
 */
async function mapWithConcurrency<T, R>(
  items: readonly T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length)
  let next = 0

  async function worker() {
    while (next < items.length) {
      const index = next++
      results[index] = await fn(items[index], index)
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, () => worker())
  )
  return results
}

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

function isEventInPast(eventDate: string): boolean {
  try {
    const todayStr = new Date().toISOString().split('T')[0]
    return eventDate < todayStr
  } catch (error) {
    console.warn('[Procesador de Eventos] Formato de fecha inválido:', eventDate)
    return true
  }
}

function isEventTooFarInFuture(eventDate: string): boolean {
  try {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() + 60)
    const cutoffStr = cutoffDate.toISOString().split('T')[0]
    return eventDate > cutoffStr
  } catch (error) {
    console.warn('[Procesador de Eventos] Formato de fecha inválido:', eventDate)
    return true
  }
}

async function isDuplicateEvent(title: string, location: string, date: string): Promise<boolean> {
  try {
    const result = await query(
      `SELECT 1 FROM events
       WHERE LOWER(title_norm) = LOWER(normalize_text($1))
       AND LOWER(venue_norm) = LOWER(normalize_text($2))
       AND (starts_at AT TIME ZONE 'America/Bogota')::date = $3::date
       LIMIT 1`,
      [title, location, date]
    )
    return result.rows.length > 0
  } catch (error) {
    console.error('Error checking for duplicate event:', error)
    return false
  }
}

async function fetchExistingEventsForCity(citySlug: string): Promise<ExistingEventSummary[]> {
  try {
    const result = await query<{
      id: string
      title: string
      venue: string | null
      date: string
      time: string
    }>(
      // CURRENT_DATE returns the database server's local time, so it might not match Colombia's current date
      `SELECT e.id, e.title, e.venue,
              (e.starts_at AT TIME ZONE 'America/Bogota')::date::text AS date,
              to_char((e.starts_at AT TIME ZONE 'America/Bogota'), 'HH24:MI') AS time
       FROM events e
       JOIN cities c ON c.id = e.city_id
       WHERE c.slug = $1
         AND (e.starts_at AT TIME ZONE 'America/Bogota')::date >= CURRENT_DATE
       ORDER BY e.starts_at ASC`,
      [citySlug]
    )
    return result.rows.map(r => ({
      id: r.id,
      title: r.title,
      location: r.venue ?? '',
      date: r.date,
      time: r.time,
    }))
  } catch (error) {
    console.error('[Procesador de Eventos] Error fetching existing events for city:', error)
    return []
  }
}

export function deduplicateWithinBatch(events: ExtractedEvent[]): ExtractedEvent[] {
  const seen = new Set<string>()
  const result: ExtractedEvent[] = []
  for (const event of events) {
    const key = `${normalize(event.title)}|${event.city_slug}|${event.date}`
    if (!seen.has(key)) {
      seen.add(key)
      result.push(event)
    }
  }
  return result
}

export async function createMinedEventDb(params: CreateEventParams, adminUserId: string, eventUrl?: string, active: boolean = false): Promise<EventDto> {
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
   let colombiaTime = time || '08:00'

   const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/
   if (!timeRegex.test(colombiaTime)) {
     console.warn(`[Procesador de Eventos] Hora inválida '${colombiaTime}' para evento '${title}', usando 08:00 por defecto`)
     colombiaTime = '08:00'
   }

   const [hours, minutes] = colombiaTime.split(':').map(Number)
   let utcHours = hours + 5
   let utcDate = date

   if (utcHours >= 24) {
     utcHours -= 24
     const dateObj = new Date(date + 'T00:00:00')
     dateObj.setDate(dateObj.getDate() + 1)
     utcDate = dateObj.toISOString().split('T')[0]
   }

   const startsAt = `${utcDate}T${utcHours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00.000Z`

  await query(
    `INSERT INTO events (id, city_id, category_id, title, description, venue, address, starts_at, price_cents, currency, image, created_by, active, event_url)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
    [eventId, cityId, categoryId, title, description, location, address, startsAt, price, currency, image, adminUserId, active, eventUrl]
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
    tags: [],
    created_by: r.created_by ?? undefined,
    event_url: r.event_url ?? undefined,
    active: r.active
  }
  return event
}

export async function processExtractedEvents(extractedEvents: ExtractedEvent[], adminUserId: string): Promise<EventDto[]> {
  const storedEvents: EventDto[] = []
  const skippedEvents: string[] = []

  console.log(`[Procesador de Eventos] Procesando ${extractedEvents.length} eventos extraídos`)

  // STEP 1: Validate required fields + date range filter
  const validCandidates: ExtractedEvent[] = []
  for (const extractedEvent of extractedEvents) {
    if (!extractedEvent.time) extractedEvent.time = '08:00'
    if (!extractedEvent.title || !extractedEvent.date || !extractedEvent.category_slug || !extractedEvent.city_slug) {
      skippedEvents.push(`${extractedEvent.title} - Missing required fields`)
      continue
    }
    if (isEventInPast(extractedEvent.date)) {
      skippedEvents.push(`${extractedEvent.title} - Evento pasado (${extractedEvent.date})`)
      continue
    }
    if (isEventTooFarInFuture(extractedEvent.date)) {
      skippedEvents.push(`${extractedEvent.title} - Evento muy lejano (${extractedEvent.date})`)
      continue
    }
    validCandidates.push(extractedEvent)
  }

  // STEP 2: Within-batch deduplication
  console.log(`[Procesador de Eventos] Deduplicación iniciada (${validCandidates.length} candidatos)`)
  const uniqueCandidates = deduplicateWithinBatch(validCandidates)

  // STEP 3: DB exact-match duplicate check
  const nonDbDuplicateCandidates: ExtractedEvent[] = []
  for (const candidate of uniqueCandidates) {
    const isDuplicate = await isDuplicateEvent(candidate.title, candidate.location, candidate.date)
    if (isDuplicate) {
      skippedEvents.push(`${candidate.title} - Duplicado`)
      continue
    }
    nonDbDuplicateCandidates.push(candidate)
  }

  // STEP 4: Semantic deduplication via LLM (gated by city+date+time)
  const citySlugs = [...new Set(nonDbDuplicateCandidates.map(e => e.city_slug))]
  const existingByCity = new Map<string, ExistingEventSummary[]>()
  for (const citySlug of citySlugs) {
    const existing = await fetchExistingEventsForCity(citySlug)
    existingByCity.set(citySlug, existing)
  }

  const duplicateIndices = new Set<number>()
  // Group candidates by city+date+time so each LLM call targets one exact collision bucket
  const groupsByCityDateTime = new Map<string, Array<{ index: number; event: ExtractedEvent }>>()
  nonDbDuplicateCandidates.forEach((event, index) => {
    const key = `${event.city_slug}|${event.date}|${event.time}`
    if (!groupsByCityDateTime.has(key)) groupsByCityDateTime.set(key, [])
    groupsByCityDateTime.get(key)!.push({ index, event })
  })

  for (const [key, group] of groupsByCityDateTime) {
    const [citySlug, date, time] = key.split('|')
    const cityExisting = existingByCity.get(citySlug) ?? []
    const matchingExisting = cityExisting.filter(
      e => e.date === date && timeMatches(time, e.time)
    )
    if (matchingExisting.length === 0) continue

    const candidates = group.map(g => ({
      index: g.index,
      title: g.event.title,
      location: g.event.location,
      date: g.event.date,
      time: g.event.time,
    }))

    const results = await checkSemanticDuplicates(candidates, matchingExisting)
    for (const result of results) {
      if (result.isDuplicate) {
        duplicateIndices.add(result.candidateIndex)
        skippedEvents.push(`${nonDbDuplicateCandidates[result.candidateIndex].title} - Duplicado semántico`)
      }
    }
  }

  const semanticallyUniqueCandidates = nonDbDuplicateCandidates.filter(
    (_, index) => !duplicateIndices.has(index)
  )
  console.log(`[Procesador de Eventos] Deduplicación completada (${semanticallyUniqueCandidates.length} candidatos finales)`)

  // STEP 5: Enrichment (bounded parallel — each candidate is independent;
  // dedup already ran, so fetch + LLM + insert can safely overlap).
  const ENRICHMENT_CONCURRENCY = 5

  type ProcessingResult =
    | { kind: 'stored'; event: EventDto }
    | { kind: 'skipped'; reason: string }

  async function processCandidate(candidate: ExtractedEvent): Promise<ProcessingResult> {
    try {
      const eventData = convertExtractedEventToDbFormat(candidate)
      let active = false

      if (candidate.event_url && candidate.event_url !== candidate.source_url) {
        const fetchResult = await fetchHtmlContent(candidate.event_url)
        if (fetchResult.success && fetchResult.fullHtml) {
          const pageHtml = fetchResult.fullHtml
          console.log(`[Procesador de Eventos] HTML limpio para enriquecimiento: ${pageHtml.length.toLocaleString()} caracteres (~${Math.ceil(pageHtml.length / 4).toLocaleString()} tokens)`)
          const enrichResult = await enrichEventFromHtml(pageHtml, candidate, candidate.event_url)
          // Enriched time takes priority over the original when the detail page shows a
          // real time (e.g. the original was a sentinel like 08:00/00:00).
          const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/
          const enrichedTime = enrichResult.enrichedFields.time
          const timeIsValid = enrichedTime !== undefined && timeRegex.test(enrichedTime)
          const effectiveTime = timeIsValid ? enrichedTime : candidate.time
          // Permanent log: title, date, time, confirmation result, and the reason
          console.log(`[Procesador de Eventos] "${candidate.title}" | date=${candidate.date} | time=${candidate.time} | time_efectiva=${effectiveTime} | confirmed=${enrichResult.dateTimeConfirmed} | razón: ${enrichResult.confirmationReason}`)
          if (enrichResult.success) {
            if (enrichResult.enrichedFields.title) eventData.title = enrichResult.enrichedFields.title
            if (enrichResult.enrichedFields.description) eventData.description = enrichResult.enrichedFields.description
            if (enrichResult.enrichedFields.location) eventData.location = enrichResult.enrichedFields.location
            if (enrichResult.enrichedFields.address) eventData.address = enrichResult.enrichedFields.address
            if (enrichResult.enrichedFields.Price !== undefined) eventData.price = enrichResult.enrichedFields.Price
            if (enrichResult.enrichedFields.image_url) eventData.image = enrichResult.enrichedFields.image_url
            if (timeIsValid) eventData.time = enrichedTime
            const hasSentinelTime = effectiveTime === '08:00' || effectiveTime === '00:00'
            active = enrichResult.dateTimeConfirmed && !hasSentinelTime
          } else {
            console.warn(`[Procesador de Eventos] Enriquecimiento falló para "${candidate.title}": ${enrichResult.error}`)
          }
        } else {
          console.warn(`[Procesador de Eventos] Fetch falló para evento URL "${candidate.event_url}": ${fetchResult.error}`)
        }
      }
      if (!eventData.location || !eventData.address) {
        active = false
      }

      // STEP 6: Store in database
      const storedEvent = await createMinedEventDb(eventData, adminUserId, candidate.event_url, active)
      console.log(`[Procesador de Eventos] Evento almacenado exitosamente: ${candidate.title} (active=${active})`)
      return { kind: 'stored', event: storedEvent }
    } catch (error) {
      console.error(`[Procesador de Eventos] Error al procesar evento: ${candidate.title}`, error)
      return { kind: 'skipped', reason: `${candidate.title} - Error: ${error instanceof Error ? error.message : 'Unknown error'}` }
    }
  }

  // Results come back in input order, so stored/skipped bookkeeping stays deterministic.
  const results = await mapWithConcurrency(semanticallyUniqueCandidates, ENRICHMENT_CONCURRENCY, processCandidate)
  for (const result of results) {
    if (result.kind === 'stored') storedEvents.push(result.event)
    else skippedEvents.push(result.reason)
  }

  console.log(`[Procesador de Eventos] Procesamiento completado. Almacenados: ${storedEvents.length}, Omitidos: ${skippedEvents.length}`)
  if (skippedEvents.length > 0) {
    console.log(`[Procesador de Eventos] Eventos omitidos:`, skippedEvents)
  }

  return storedEvents
}
