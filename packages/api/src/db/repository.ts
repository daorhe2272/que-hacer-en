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
  price: number | null
  currency: string
  utc_timestamp: string
  category: string
  city: string
  image: string | null
  created_by: string | null
  event_url: string | null
  active: boolean
}

export interface EventDto {
  id: string
  title: string
  description: string
  utcTimestamp: string
  location: string
  address: string
  category: string
  city: string
  price: number | null
  currency: string
  image: string
  organizer: string
  tags: string[]
  status: 'active' | 'cancelled' | 'postponed' | 'sold_out'
  created_by?: string
  event_url?: string
  active?: boolean
}

export async function listEventsDb(params: ListParams): Promise<{ events: EventDto[], total: number }>{
  const { city, category, q, from, to, minPrice, maxPrice, page = 1, limit = 20, sort, order = 'asc' } = params

  const where: string[] = ['(e.starts_at AT TIME ZONE \'America/Bogota\')::date >= (CURRENT_TIMESTAMP AT TIME ZONE \'America/Bogota\')::date']
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
            e.image,
            e.starts_at as utc_timestamp,
            ct.label as category,
            c.slug as city,
            e.created_by,
            e.event_url,
            e.active
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
    utcTimestamp: r.utc_timestamp,
    location: r.location ?? '',
    address: r.address ?? '',
    category: r.category,
    city: r.city,
    price: r.price,
    currency: r.currency,
    image: r.image ?? '',
    organizer: '',
    tags: [],
    status: 'active',
    created_by: r.created_by ?? undefined,
    event_url: r.event_url ?? undefined,
    active: r.active
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
     LIMIT 1`, [id]
  )
  const r = res.rows[0]
  if (!r) return null
  const event: EventDto = {
    id: r.id,
    title: r.title,
    description: r.description,
    utcTimestamp: r.utc_timestamp,
    location: r.location ?? '',
    address: r.address ?? '',
    category: r.category,
    city: r.city,
    price: r.price,
    currency: r.currency,
    image: r.image ?? '',
    organizer: '',
    tags: [],
    status: 'active',
    event_url: r.event_url ?? undefined,
    active: r.active
  }
  return event
}

export async function listEventsByCityDb(city: string): Promise<EventDto[] | null> {
  const cityRes = await query<{ id: number }>(`SELECT id FROM cities WHERE slug = $1`, [city])
  if (cityRes.rows.length === 0) return null
  const rows = await query<EventRowDto>(
    `SELECT e.id,
            e.title,
            e.description,
            e.venue as location,
            e.address,
            e.price_cents as price,
            e.currency,
            e.image,
            e.starts_at as utc_timestamp,
            ct.label as category,
            c.slug as city,
            e.created_by,
            e.event_url,
            e.active
     FROM events e
     JOIN categories ct ON ct.id = e.category_id
     JOIN cities c ON c.id = e.city_id
     WHERE e.city_id = $1 AND (e.starts_at AT TIME ZONE 'America/Bogota')::date >= (CURRENT_TIMESTAMP AT TIME ZONE 'America/Bogota')::date
     ORDER BY e.starts_at ASC, e.id ASC`, [cityRes.rows[0].id]
  )
  return rows.rows.map(r => ({
    id: r.id,
    title: r.title,
    description: r.description,
    utcTimestamp: r.utc_timestamp,
    location: r.location ?? '',
    address: r.address ?? '',
    category: r.category,
    city: r.city,
    price: r.price,
    currency: r.currency,
    image: r.image ?? '',
    organizer: '',
    tags: [],
    status: 'active',
    created_by: r.created_by ?? undefined,
    event_url: r.event_url ?? undefined,
    active: r.active
  }))
}

export interface CreateEventParams {
  title: string
  description: string
  date: string
  time: string
  location: string
  address: string
  category: string
  city: string
  price: number | null
  currency: string
  image?: string
  tags?: string[]
  status?: 'active' | 'cancelled' | 'postponed' | 'sold_out'
}

export interface UpdateEventParams extends Partial<CreateEventParams> {
  id: string
  utcTimestamp?: string
}

export async function createEventDb(params: CreateEventParams, organizerId: string): Promise<EventDto> {

   const {
     title, description, date, time, location, address,
     category, city, price, currency, image, tags = []
   } = params

  const cityRes = await query<{ id: number }>(`SELECT id FROM cities WHERE slug = $1`, [city])
  if (cityRes.rows.length === 0) {
    throw new Error('Ciudad no encontrada')
  }
  const cityId = cityRes.rows[0].id

  const categoryRes = await query<{ id: number }>(`SELECT id FROM categories WHERE slug = $1`, [normalize(category)])
  if (categoryRes.rows.length === 0) {
    throw new Error('Categoría no encontrada')
  }
  const categoryId = categoryRes.rows[0].id

  const eventId = crypto.randomUUID()
  // Convert Colombian time to UTC for storage
  const startsAt = `${date}T${time}:00-05:00`

  await query(
    `INSERT INTO events (id, city_id, category_id, title, description, venue, address, starts_at, price_cents, currency, image, created_by, active)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
    [eventId, cityId, categoryId, title, description, location, address, startsAt, price, currency, image, organizerId, true]
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
    throw new Error('Error al crear el evento')
  }
  return event
}

export async function updateEventDb(params: UpdateEventParams, organizerId: string): Promise<EventDto | null> {
  const { id, title, description, date, time, location, address, category, city, price, currency, image, tags, utcTimestamp } = params

  // Check if event exists and verify ownership or admin role
  const ownershipCheck = await query<{ created_by: string | null, user_role: string }>(
    `SELECT e.created_by, u.role as user_role
     FROM events e
     LEFT JOIN users u ON u.id = $2
     WHERE e.id = $1`,
    [id, organizerId]
  )
  
  if (ownershipCheck.rows.length === 0) {
    return null // Event doesn't exist
  }
  
  const { created_by, user_role } = ownershipCheck.rows[0]
  
  // Allow access if user owns the event OR is admin
  const hasAccess = created_by === organizerId || user_role === 'admin'
  if (!hasAccess) {
    throw new Error('No tienes permiso para editar este evento')
  }

  const updates: string[] = []
  const values: unknown[] = []
  let paramIndex = 1

  if (title !== undefined) {
    updates.push(`title = $${paramIndex++}`)
    values.push(title)
  }
  if (description !== undefined) {
    updates.push(`description = $${paramIndex++}`)
    values.push(description)
  }
  if (location !== undefined) {
    updates.push(`venue = $${paramIndex++}`)
    values.push(location)
  }
  if (address !== undefined) {
    updates.push(`address = $${paramIndex++}`)
    values.push(address)
  }
  if (price !== undefined) {
    updates.push(`price_cents = $${paramIndex++}`)
    values.push(price)
  }
  if (currency !== undefined) {
    updates.push(`currency = $${paramIndex++}`)
    values.push(currency)
  }
  if (date !== undefined && time !== undefined) {
    updates.push(`starts_at = $${paramIndex++}`)
    // Convert Colombian time to UTC for storage
    values.push(`${date}T${time}:00-05:00`)
  } else if (utcTimestamp !== undefined) {
    updates.push(`starts_at = $${paramIndex++}`)
    values.push(utcTimestamp)
  }
  
  if (city !== undefined) {
    const cityRes = await query<{ id: number }>(`SELECT id FROM cities WHERE slug = $1`, [city])
    if (cityRes.rows.length === 0) {
      throw new Error('Ciudad no encontrada')
    }
    updates.push(`city_id = $${paramIndex++}`)
    values.push(cityRes.rows[0].id)
  }

  if (category !== undefined) {
    const categoryRes = await query<{ id: number }>(`SELECT id FROM categories WHERE slug = $1`, [normalize(category)])
    if (categoryRes.rows.length === 0) {
      throw new Error('Categoría no encontrada')
    }
    updates.push(`category_id = $${paramIndex++}`)
    values.push(categoryRes.rows[0].id)
  }
  if (image !== undefined) {
    updates.push(`image = $${paramIndex++}`)
    values.push(image)
  }

  if (updates.length > 0) {
    values.push(id)
    await query(
      `UPDATE events SET ${updates.join(', ')} WHERE id = $${paramIndex}`,
      values
    )
  }

  if (tags !== undefined) {
    await query(`DELETE FROM event_tags WHERE event_id = $1`, [id])
    
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
            [id, tagRes.rows[0].id]
          )
        }
      }
    }
  }

  return await getEventByIdDb(id)
}

export async function deleteEventDb(eventId: string, organizerId: string): Promise<boolean> {
  // Check if event exists and verify ownership or admin role
  const ownershipCheck = await query<{ created_by: string | null, user_role: string }>(
    `SELECT e.created_by, u.role as user_role
     FROM events e
     LEFT JOIN users u ON u.id = $2
     WHERE e.id = $1`,
    [eventId, organizerId]
  )
  
  if (ownershipCheck.rows.length === 0) {
    return false // Event doesn't exist
  }
  
  const { created_by, user_role } = ownershipCheck.rows[0]
  
  // Allow access if user owns the event OR is admin
  const hasAccess = created_by === organizerId || user_role === 'admin'
  if (!hasAccess) {
    throw new Error('No tienes permiso para eliminar este evento')
  }
  
  const result = await query(`DELETE FROM events WHERE id = $1`, [eventId])
  return (result.rowCount ?? 0) > 0
}

export async function getEventByIdDb(eventId: string): Promise<EventDto | null> {
  const res = await query<EventRowDto>(
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
            e.created_by
     FROM events e
     JOIN cities c ON c.id = e.city_id
     JOIN categories ct ON ct.id = e.category_id
     WHERE e.id = $1
     LIMIT 1`, [eventId]
  )
  const r = res.rows[0]
  if (!r) return null

  const tagsRes = await query<{ name: string }>(
    `SELECT t.name FROM tags t
     JOIN event_tags et ON t.id = et.tag_id
     WHERE et.event_id = $1`, [eventId]
  )

  const event: EventDto = {
    id: r.id,
    title: r.title,
    description: r.description,
    utcTimestamp: r.utc_timestamp,
    location: r.location ?? '',
    address: r.address ?? '',
    category: r.category,
    city: r.city,
    price: r.price,
    currency: r.currency,
    image: r.image ?? '',
    organizer: '',
    tags: tagsRes.rows.map(t => t.name),
    status: 'active',
    created_by: r.created_by ?? undefined,
    event_url: r.event_url ?? undefined,
    active: r.active
  }
  return event
}

export async function getEventForEditDb(eventId: string, userId: string): Promise<EventDto | null> {
  // Check if event exists and verify ownership or admin role
  const ownershipCheck = await query<{ created_by: string | null, user_role: string, category_slug: string }>(
    `SELECT e.created_by, u.role as user_role, ct.slug as category_slug
     FROM events e
     LEFT JOIN users u ON u.id = $2
     LEFT JOIN categories ct ON ct.id = e.category_id
     WHERE e.id = $1`,
    [eventId, userId]
  )
  
  if (ownershipCheck.rows.length === 0) {
    return null // Event doesn't exist
  }
  
  const { created_by, user_role, category_slug } = ownershipCheck.rows[0]
  
  // Allow access if user owns the event OR is admin
  const hasAccess = created_by === userId || user_role === 'admin'
  if (!hasAccess) {
    return null // No permission
  }

  // Get event details and override category with slug for form editing
  const event = await getEventByIdDb(eventId)
  if (!event) return null
  
  // Return event with category slug instead of label for form compatibility
  return {
    ...event,
    category: category_slug
  }
}

export async function listOrganizerEventsDb(organizerId: string, params: ListParams): Promise<{ events: EventDto[], total: number }> {
  const { city, category, q, from, to, minPrice, maxPrice, page = 1, limit = 20, sort, order = 'asc' } = params

  // Filter by organizer (user's own events) and exclude past events
  const where: string[] = ['e.created_by = $1', '(e.starts_at AT TIME ZONE \'America/Bogota\')::date >= (CURRENT_TIMESTAMP AT TIME ZONE \'America/Bogota\')::date']
  const args: unknown[] = [organizerId]
  let i = 2

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
     ${whereSql}
     ${orderSql}
     LIMIT ${limit} OFFSET ${offset}`, args
  )

  const events: EventDto[] = []
  for (const r of rows.rows) {
    const tagsRes = await query<{ name: string }>(
      `SELECT t.name FROM tags t 
       JOIN event_tags et ON t.id = et.tag_id 
       WHERE et.event_id = $1`, [r.id]
    )

    events.push({
      id: r.id,
      title: r.title,
      description: r.description,
      utcTimestamp: r.utc_timestamp,
      location: r.location ?? '',
      address: r.address ?? '',
      category: r.category,
      city: r.city,
      price: r.price,
      currency: r.currency,
      image: r.image ?? '',
      organizer: '',
      tags: tagsRes.rows.map(t => t.name),
      status: 'active',
      created_by: r.created_by ?? undefined,
      event_url: r.event_url ?? undefined,
      active: r.active
    })
  }

  return { events, total }
}

export async function addToFavoritesDb(userId: string, eventId: string): Promise<boolean> {
  try {
    await query(
      `INSERT INTO favorites (user_id, event_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [userId, eventId]
    )
    return true
  } catch (err) {
    return false
  }
}

export async function removeFromFavoritesDb(userId: string, eventId: string): Promise<boolean> {
  try {
    const result = await query(
      `DELETE FROM favorites WHERE user_id = $1 AND event_id = $2`,
      [userId, eventId]
    )
    return (result.rowCount ?? 0) > 0
  } catch (err) {
    return false
  }
}

export async function getUserFavoritesDb(userId: string, params: ListParams): Promise<{ events: EventDto[], total: number }> {
  const { city, category, q, from, to, minPrice, maxPrice, page = 1, limit = 20, sort, order = 'asc' } = params

  const where: string[] = ['f.user_id = $1', '(e.starts_at AT TIME ZONE \'America/Bogota\')::date >= (CURRENT_TIMESTAMP AT TIME ZONE \'America/Bogota\')::date']
  const args: unknown[] = [userId]
  let i = 2

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

  const whereSql = `WHERE ${where.join(' AND ')}`

  let orderSql = `ORDER BY f.created_at ${order === 'desc' ? 'DESC' : 'ASC'}, e.id ASC`
  if (sort === 'date') orderSql = `ORDER BY e.starts_at ${order === 'desc' ? 'DESC' : 'ASC'}, e.id ASC`
  if (sort === 'price') orderSql = `ORDER BY e.price_cents ${order === 'desc' ? 'DESC' : 'ASC'}, e.id ASC`

  const offset = (page - 1) * limit

  const countRes = await query<{ count: string }>(
    `SELECT COUNT(*)::text AS count
     FROM favorites f
     JOIN events e ON e.id = f.event_id
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
            e.starts_at as utc_timestamp,
            ct.label as category,
            c.slug as city,
            e.image,
            e.created_by,
            e.event_url,
            e.active
     FROM favorites f
     JOIN events e ON e.id = f.event_id
     JOIN cities c ON c.id = e.city_id
     JOIN categories ct ON ct.id = e.category_id
     ${whereSql}
     ${orderSql}
     LIMIT ${limit} OFFSET ${offset}`, args
  )

  const events: EventDto[] = []
  for (const r of rows.rows) {
    const tagsRes = await query<{ name: string }>(
      `SELECT t.name FROM tags t 
       JOIN event_tags et ON t.id = et.tag_id 
       WHERE et.event_id = $1`, [r.id]
    )

    events.push({
      id: r.id,
      title: r.title,
      description: r.description,
      utcTimestamp: r.utc_timestamp,
      location: r.location ?? '',
      address: r.address ?? '',
      category: r.category,
      city: r.city,
      price: r.price,
      currency: r.currency,
      image: r.image ?? '',
      organizer: '',
      tags: tagsRes.rows.map(t => t.name),
      status: 'active',
      created_by: r.created_by ?? undefined,
      event_url: r.event_url ?? undefined,
      active: r.active
    })
  }

  return { events, total }
}

export async function isEventFavoritedDb(userId: string, eventId: string): Promise<boolean> {
  try {
    const result = await query<{ exists: boolean }>(
      `SELECT EXISTS(SELECT 1 FROM favorites WHERE user_id = $1 AND event_id = $2) as exists`,
      [userId, eventId]
    )
    return result.rows[0]?.exists || false
  } catch (err) {
    return false
  }
}

export async function getAdminStatsDb(): Promise<{ totalUsers: number; activeEvents: number }> {
  try {
    // Get total users
    const usersResult = await query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM users`
    )
    const totalUsers = Number(usersResult.rows[0]?.count || '0')

    // Get active events (future events)
    const eventsResult = await query<{ count: string }>(
      `SELECT COUNT(*)::text AS count
       FROM events e
       JOIN cities c ON c.id = e.city_id
       JOIN categories ct ON ct.id = e.category_id
       WHERE (e.starts_at AT TIME ZONE 'America/Bogota')::date >= (CURRENT_TIMESTAMP AT TIME ZONE 'America/Bogota')::date`
    )
    const activeEvents = Number(eventsResult.rows[0]?.count || '0')

    return { totalUsers, activeEvents }
  } catch (err) {
    return { totalUsers: 0, activeEvents: 0 }
  }
}

