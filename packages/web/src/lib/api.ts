import type { Event } from '@/types/event'

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4001'

export type UserProfile = { id: string, email: string | null, role: 'attendee' | 'organizer' | 'admin' }

async function buildAuthHeadersClient(): Promise<HeadersInit> {
  const headers: HeadersInit = {}
  if (typeof window !== 'undefined') {
    try {
      const { getSupabaseBrowserClient } = await import('@/lib/supabase/client')
      const supabase = getSupabaseBrowserClient()
      const { data } = await supabase.auth.getSession()
      const token = (data.session as { access_token?: string } | null | undefined)?.access_token
      if (token) headers['Authorization'] = `Bearer ${token}`
    } catch {}
  }
  return headers
}

export async function fetchEventsByCity(city: string): Promise<Event[]> {
  try {
    const headers = await buildAuthHeadersClient()
    const res = await fetch(`${BASE_URL}/api/events/${city}`, { cache: 'no-store', headers })
    if (!res.ok) return []
    const data = await res.json()
    return data.events as Event[]
  } catch {
    return []
  }
}

export type ApiEventsResult = { events: Event[]; pagination?: { page: number; limit: number; total: number; totalPages: number }; error?: string }

export async function fetchAllEvents(params?: { city?: string; category?: string; q?: string; from?: string; to?: string; minPrice?: number; maxPrice?: number; page?: number; limit?: number; sort?: 'date' | 'price'; order?: 'asc' | 'desc' }): Promise<ApiEventsResult> {
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
    const url = `${BASE_URL}/api/events${query ? `?${query}` : ''}`
    const headers = await buildAuthHeadersClient()
    const res = await fetch(url, { cache: 'no-store', headers })
    if (!res.ok) return { events: [], error: 'Error al cargar eventos' }
    const data = await res.json()
    return { events: data.events as Event[], pagination: data.pagination, error: undefined }
  } catch {
    return { events: [], error: 'No se pudo conectar con el servidor' }
  }
}

export async function fetchEventById(id: string): Promise<Event | null> {
  try {
    const headers = await buildAuthHeadersClient()
    const res = await fetch(`${BASE_URL}/api/events/id/${id}`, { cache: 'no-store', headers })
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

export async function getUserProfile(): Promise<UserProfile | null> {
  try {
    const headers = await buildAuthHeadersClient()
    const res = await fetch(`${BASE_URL}/api/users/me`, { cache: 'no-store', headers })
    if (!res.ok) return null
    const data = await res.json()
    return data as UserProfile
  } catch {
    return null
  }
}

export async function getUserFavorites(): Promise<{ events: Event[], pagination?: { page: number; limit: number; total: number; totalPages: number } }> {
  try {
    const headers = await buildAuthHeadersClient()
    console.log('Favorites API call - headers:', headers)
    console.log('Favorites API call - URL:', `${BASE_URL}/api/users/favorites`)
    
    const res = await fetch(`${BASE_URL}/api/users/favorites`, { cache: 'no-store', headers })
    console.log('Favorites API response status:', res.status)
    
    if (!res.ok) {
      const errorText = await res.text()
      console.log('Favorites API error response:', errorText)
      throw new Error(`Error al cargar favoritos (${res.status}): ${errorText}`)
    }
    const data = await res.json()
    return { events: data.events || [], pagination: data.pagination }
  } catch (err) {
    console.error('getUserFavorites error:', err)
    throw new Error(err instanceof Error ? err.message : 'Error al cargar favoritos')
  }
}

export type EventFormData = {
  title: string
  description: string
  date: string
  time: string
  location: string
  address: string
  category: string
  city: string
  price: number
  currency: string
  image?: string
  organizer: string
  capacity: number
  tags: string[]
  status: string
}

export type CreateEventResult = {
  success: boolean
  event?: Event
  error?: string
  validationErrors?: Record<string, string[]>
}

export async function createEvent(eventData: EventFormData): Promise<CreateEventResult> {
  try {
    const headers = await buildAuthHeadersClient() as Record<string, string>
    headers['Content-Type'] = 'application/json'
    
    const res = await fetch(`${BASE_URL}/api/events`, {
      method: 'POST',
      headers,
      body: JSON.stringify(eventData)
    })
    
    const data = await res.json()
    
    if (!res.ok) {
      if (res.status === 400 && data.details) {
        // Handle validation errors from Zod
        return {
          success: false,
          error: data.error || 'Error de validación',
          validationErrors: data.details.fieldErrors
        }
      }
      return {
        success: false,
        error: data.error || `Error del servidor (${res.status})`
      }
    }
    
    return {
      success: true,
      event: data.event
    }
  } catch (err) {
    return {
      success: false,
      error: 'Error de conexión. Por favor intenta de nuevo.'
    }
  }
}


