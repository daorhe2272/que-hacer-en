import { query } from './client'

export type ListParams = {
  city?: string
  category?: string
  q?: string
  from?: string
  to?: string
  minPrice?: number
  maxPrice?: number
  page?: number
  limit?: number
  sort?: 'date' | 'price'
  order?: 'asc' | 'desc'
}

function normalize(text: string): string {
  return text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

export interface EventRowDto {
  id: string
  title: string
  description: string
  location: string | null
  address: string | null
  price: number
  currency: string
  date: string
  time: string
  category: string
  city: string
}

export interface EventDto {
  id: string
  title: string
  description: string
  date: string
  time: string
  location: string
  address: string
  category: string
  price: number
  currency: string
  image: string
  organizer: string
  capacity: number
  tags: string[]
  status: 'active' | 'cancelled' | 'postponed' | 'sold_out'
}

export async function listEventsDb(params: ListParams): Promise<{ events: EventDto[], total: number }>{
  const { city, category, q, from, to, minPrice, maxPrice, page = 1, limit = 20, sort, order = 'asc' } = params

  const where: string[] = []
  const args: unknown[] = []
  let i = 1
  if (city) { where.push(`c.slug = $${i++}`); args.push(city) }
  if (category) { where.push(`ct.slug = $${i++}`); args.push(normalize(category)) }
  if (q) {
    const term = `%${normalize(q)}%`
    where.push(`(
      e.title_norm LIKE $${i} OR
      e.description_norm LIKE $${i} OR
      e.venue_norm LIKE $${i} OR
      EXISTS (
        SELECT 1 FROM event_tags et JOIN tags t ON t.id = et.tag_id
        WHERE et.event_id = e.id AND t.name_norm LIKE $${i}
      )
    )`)
    args.push(term); i++
  }
  if (from) { where.push(`e.starts_at::date >= $${i++}`); args.push(from) }
  if (to) { where.push(`e.starts_at::date <= $${i++}`); args.push(to) }
  if (typeof minPrice === 'number') { where.push(`e.price_cents >= $${i++}`); args.push(minPrice) }
  if (typeof maxPrice === 'number') { where.push(`e.price_cents <= $${i++}`); args.push(maxPrice) }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : ''

  let orderSql = `ORDER BY e.starts_at ${order === 'desc' ? 'DESC' : 'ASC'}, e.id ASC`
  if (sort === 'price') orderSql = `ORDER BY e.price_cents ${order === 'desc' ? 'DESC' : 'ASC'}, e.id ASC`

  const offset = (page - 1) * limit

  const countRes = await query<{ count: string }>(
    `SELECT COUNT(*)::text AS count
     FROM events e
     JOIN cities c ON c.id = e.city_id
     JOIN categories ct ON ct.id = e.category_id
     ${whereSql}`, args
  )
  const total = Number(countRes.rows[0]?.count || '0')

  const rows = await query<EventRowDto>(
    `SELECT e.id,
            e.title,
            e.description,
            e.venue as location,
            e.address,
            e.price_cents as price,
            e.currency,
            to_char(e.starts_at AT TIME ZONE 'UTC', 'YYYY-MM-DD') as date,
            to_char(e.starts_at AT TIME ZONE 'UTC', 'HH24:MI') as time,
            ct.label as category,
            c.slug as city
     FROM events e
     JOIN cities c ON c.id = e.city_id
     JOIN categories ct ON ct.id = e.category_id
     ${whereSql}
     ${orderSql}
     LIMIT ${limit} OFFSET ${offset}`, args
  )

  const events: EventDto[] = rows.rows.map(r => ({
    id: r.id,
    title: r.title,
    description: r.description,
    date: r.date,
    time: r.time,
    location: r.location ?? '',
    address: r.address ?? '',
    category: r.category,
    price: r.price,
    currency: r.currency,
    image: '',
    organizer: '',
    capacity: 0,
    tags: [],
    status: 'active'
  }))

  return { events, total }
}

import crypto from 'crypto'
function toUuidFromLegacyId(id: string): string {
  const hex = crypto.createHash('sha1').update(id).digest('hex')
  const ns = hex.slice(0, 32)
  return `${ns.slice(0,8)}-${ns.slice(8,12)}-${ns.slice(12,16)}-${ns.slice(16,20)}-${ns.slice(20)}`
}

export async function getEventByLegacyIdDb(legacyId: string): Promise<EventDto | null> {
  const id = toUuidFromLegacyId(legacyId)
  const res = await query<EventRowDto>(
    `SELECT e.id,
            e.title,
            e.description,
            e.venue as location,
            e.address,
            e.price_cents as price,
            e.currency,
            to_char(e.starts_at AT TIME ZONE 'UTC', 'YYYY-MM-DD') as date,
            to_char(e.starts_at AT TIME ZONE 'UTC', 'HH24:MI') as time,
            ct.label as category,
            c.slug as city
     FROM events e
     JOIN cities c ON c.id = e.city_id
     JOIN categories ct ON ct.id = e.category_id
     WHERE e.id = $1
     LIMIT 1`, [id]
  )
  const r = res.rows[0]
  if (!r) return null
  const event: EventDto = {
    id: r.id,
    title: r.title,
    description: r.description,
    date: r.date,
    time: r.time,
    location: r.location ?? '',
    address: r.address ?? '',
    category: r.category,
    price: r.price,
    currency: r.currency,
    image: '',
    organizer: '',
    capacity: 0,
    tags: [],
    status: 'active'
  }
  return event
}

export async function listEventsByCityDb(city: string): Promise<EventDto[] | null> {
  const cityRes = await query<{ id: number }>(`SELECT id FROM cities WHERE slug = $1`, [city])
  if (cityRes.rows.length === 0) return null
  const rows = await query<Omit<EventRowDto, 'city'>>(
    `SELECT e.id,
            e.title,
            e.description,
            e.venue as location,
            e.address,
            e.price_cents as price,
            e.currency,
            to_char(e.starts_at AT TIME ZONE 'UTC', 'YYYY-MM-DD') as date,
            to_char(e.starts_at AT TIME ZONE 'UTC', 'HH24:MI') as time,
            ct.label as category
     FROM events e
     JOIN categories ct ON ct.id = e.category_id
     WHERE e.city_id = $1
     ORDER BY e.starts_at ASC, e.id ASC`, [cityRes.rows[0].id]
  )
  return rows.rows.map(r => ({
    id: r.id,
    title: r.title,
    description: r.description,
    date: r.date,
    time: r.time,
    location: r.location ?? '',
    address: r.address ?? '',
    category: r.category,
    price: r.price,
    currency: r.currency,
    image: '',
    organizer: '',
    capacity: 0,
    tags: [],
    status: 'active'
  }))
}


