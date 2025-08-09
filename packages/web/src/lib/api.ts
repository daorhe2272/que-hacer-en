import type { Event } from '@/types/event'

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4001'

export async function fetchEventsByCity(city: string): Promise<Event[]> {
  try {
    const res = await fetch(`${BASE_URL}/api/events/${city}`, { cache: 'no-store' })
    if (!res.ok) return []
    const data = await res.json()
    return data.events as Event[]
  } catch {
    return []
  }
}

export type ApiEventsResult = { events: Event[]; pagination?: { page: number; limit: number; total: number; totalPages: number }; error?: string }

export async function fetchAllEvents(params?: { city?: string; category?: string; q?: string; page?: number; limit?: number; sort?: 'date' | 'price'; order?: 'asc' | 'desc' }): Promise<ApiEventsResult> {
  try {
    const usp = new URLSearchParams()
    if (params?.city) usp.set('city', params.city)
    if (params?.category) usp.set('category', params.category)
    if (params?.q) usp.set('q', params.q)
    if (params?.page) usp.set('page', String(params.page))
    if (params?.limit) usp.set('limit', String(params.limit))
    if (params?.sort) usp.set('sort', params.sort)
    if (params?.order) usp.set('order', params.order)
    const query = usp.toString()
    const url = `${BASE_URL}/api/events${query ? `?${query}` : ''}`
    const res = await fetch(url, { cache: 'no-store' })
    if (!res.ok) return { events: [], error: 'Error al cargar eventos' }
    const data = await res.json()
    return { events: data.events as Event[], pagination: data.pagination, error: undefined }
  } catch {
    return { events: [], error: 'No se pudo conectar con el servidor' }
  }
}

export async function fetchEventById(id: string): Promise<Event | null> {
  try {
    const res = await fetch(`${BASE_URL}/api/events/id/${id}`, { cache: 'no-store' })
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}


