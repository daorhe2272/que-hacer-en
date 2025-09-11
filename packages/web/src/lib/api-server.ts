import type { Event } from '@/types/event'

// Server-side API calls (direct to Express API)
const SERVER_API_URL = process.env.INTERNAL_API_URL || 'http://localhost:4001'

export type ApiEventsResult = { 
  events: Event[]
  pagination?: { page: number; limit: number; total: number; totalPages: number }
  error?: string 
}

/**
 * Server-side function to fetch events by city
 * Used in SSR and server components
 */
export async function fetchEventsByCityServer(city: string): Promise<Event[]> {
  try {
    const res = await fetch(`${SERVER_API_URL}/api/events/${city}`, { 
      cache: 'no-store'
    })
    if (!res.ok) return []
    const data = await res.json()
    return data.events as Event[]
  } catch {
    return []
  }
}

/**
 * Server-side function to fetch all events with filters
 * Used in SSR and server components
 */
export async function fetchAllEventsServer(params?: {
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
}): Promise<ApiEventsResult> {
  try {
    const usp = new URLSearchParams()
    if (params?.city) usp.set('city', params.city)
    if (params?.category) usp.set('category', params.category)
    if (params?.q) usp.set('q', params.q)
    if (params?.from) usp.set('from', params.from)
    if (params?.to) usp.set('to', params.to)
    if (typeof params?.minPrice === 'number') usp.set('minPrice', String(params.minPrice))
    if (typeof params?.maxPrice === 'number') usp.set('maxPrice', String(params.maxPrice))
    if (params?.page) usp.set('page', String(params.page))
    if (params?.limit) usp.set('limit', String(params.limit))
    if (params?.sort) usp.set('sort', params.sort)
    if (params?.order) usp.set('order', params.order)
    
    const query = usp.toString()
    const url = `${SERVER_API_URL}/api/events${query ? `?${query}` : ''}`
    
    const res = await fetch(url, { cache: 'no-store' })
    if (!res.ok) return { events: [], error: 'Error al cargar eventos' }
    
    const data = await res.json()
    return { 
      events: data.events as Event[], 
      pagination: data.pagination, 
      error: undefined 
    }
  } catch {
    return { events: [], error: 'No se pudo conectar con el servidor' }
  }
}

/**
 * Server-side function to fetch event by ID
 * Used in SSR and server components
 */
export async function fetchEventByIdServer(id: string): Promise<Event | null> {
  try {
    const res = await fetch(`${SERVER_API_URL}/api/events/id/${id}`, { 
      cache: 'no-store' 
    })
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}