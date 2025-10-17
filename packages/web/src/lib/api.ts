import type { Event } from '@/types/event'

// Client-side API base URL (goes through Next.js API routes)
const CLIENT_API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'

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

/**
 * Client-side function to fetch events by city
 * Goes through Next.js API routes (proxy)
 */
export async function fetchEventsByCity(city: string): Promise<Event[]> {
  try {
    const headers = await buildAuthHeadersClient()
    const res = await fetch(`${CLIENT_API_URL}/api/events/${city}`, { cache: 'no-store', headers })
    if (!res.ok) return []
    const data = await res.json()
    return data.events as Event[]
  } catch {
    return []
  }
}

export type ApiEventsResult = { events: Event[]; pagination?: { page: number; limit: number; total: number; totalPages: number }; error?: string }

/**
 * Client-side function to fetch all events with filters
 * Goes through Next.js API routes (proxy)
 */
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
    const url = `${CLIENT_API_URL}/api/events${query ? `?${query}` : ''}`
    const headers = await buildAuthHeadersClient()
    const res = await fetch(url, { cache: 'no-store', headers })
    if (!res.ok) return { events: [], error: 'Error al cargar eventos' }
    const data = await res.json()
    return { events: data.events as Event[], pagination: data.pagination, error: undefined }
  } catch {
    return { events: [], error: 'No se pudo conectar con el servidor' }
  }
}

/**
 * Client-side function to fetch event by ID
 * Goes through Next.js API routes (proxy)
 */
export async function fetchEventById(id: string): Promise<Event | null> {
  try {
    const headers = await buildAuthHeadersClient()
    const res = await fetch(`${CLIENT_API_URL}/api/events/id/${id}`, { cache: 'no-store', headers })
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

/**
 * Client-side function to fetch event for editing (requires ownership)
 * Goes through Next.js API routes (proxy)
 */
export async function fetchEventForEdit(id: string): Promise<Event | null> {
  try {
    const headers = await buildAuthHeadersClient()
    const res = await fetch(`${CLIENT_API_URL}/api/events/manage/${id}`, { cache: 'no-store', headers })
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

/**
 * Client-side function to get user profile
 * Goes through Next.js API routes (proxy)
 */
export async function getUserProfile(): Promise<UserProfile | null> {
  try {
    const headers = await buildAuthHeadersClient()
    const res = await fetch(`${CLIENT_API_URL}/api/users/me`, { cache: 'no-store', headers })
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
    console.log('Favorites API call - URL:', `${CLIENT_API_URL}/api/users/favorites`)

    const res = await fetch(`${CLIENT_API_URL}/api/users/favorites`, { cache: 'no-store', headers })
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

export async function getUserEvents(): Promise<{ events: Event[], pagination?: { page: number; limit: number; total: number; totalPages: number } }> {
  try {
    const headers = await buildAuthHeadersClient()
    const res = await fetch(`${CLIENT_API_URL}/api/events/manage`, { cache: 'no-store', headers })

    if (!res.ok) {
      const errorText = await res.text()
      throw new Error(`Error al cargar mis eventos (${res.status}): ${errorText}`)
    }
    const data = await res.json()
    return { events: data.events || [], pagination: data.pagination }
  } catch (err) {
    console.error('getUserEvents error:', err)
    throw new Error(err instanceof Error ? err.message : 'Error al cargar mis eventos')
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
  price: number | null  // null means unknown/undefined, 0 means free
  currency: string
  image?: string
  tags: string[]
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

    const res = await fetch(`${CLIENT_API_URL}/api/events`, {
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

export type UpdateEventResult = {
  success: boolean
  event?: Event
  error?: string
  validationErrors?: Record<string, string[]>
}

export async function updateEvent(eventId: string, eventData: Partial<EventFormData>): Promise<UpdateEventResult> {
  try {
    const headers = await buildAuthHeadersClient() as Record<string, string>
    headers['Content-Type'] = 'application/json'

    const res = await fetch(`${CLIENT_API_URL}/api/events/uuid/${eventId}`, {
      method: 'PUT',
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

export async function getAdminStats(): Promise<{ totalUsers: number; activeEvents: number }> {
  try {
    const headers = await buildAuthHeadersClient()
    const res = await fetch(`${CLIENT_API_URL}/api/admin/stats`, { cache: 'no-store', headers })

    if (!res.ok) {
      throw new Error(`Error al cargar estadísticas de admin (${res.status})`)
    }
    return res.json()
  } catch (err) {
    console.error('getAdminStats error:', err)
    throw new Error(err instanceof Error ? err.message : 'Error al cargar estadísticas de admin')
  }
}

// Data Sources API functions
export type DataSource = {
  id: string
  url: string
  city_id: number | null
  city_name?: string
  city_slug?: string
  source_type: 'regular' | 'occasional'
  last_mined: string | null
  mining_status: 'pending' | 'in_progress' | 'completed' | 'failed'
  active: boolean
  created_at: string
  updated_at: string
  created_by: string
}

export type DataSourcesResult = {
  data_sources: DataSource[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export type CreateDataSourceData = {
  url: string
  city_slug?: string
  source_type: 'regular' | 'occasional'
}

export type UpdateDataSourceData = {
  url?: string
  city_slug?: string
  source_type?: 'regular' | 'occasional'
  active?: boolean
}

export async function getDataSources(params?: {
  city?: string
  source_type?: 'regular' | 'occasional'
  active?: boolean
  page?: number
  limit?: number
}): Promise<DataSourcesResult> {
  try {
    const usp = new URLSearchParams()
    if (params?.city) usp.set('city', params.city)
    if (params?.source_type) usp.set('source_type', params.source_type)
    if (params?.active !== undefined) usp.set('active', String(params.active))
    if (params?.page) usp.set('page', String(params.page))
    if (params?.limit) usp.set('limit', String(params.limit))

    const query = usp.toString()
    const url = `${CLIENT_API_URL}/api/data-sources${query ? `?${query}` : ''}`

    const headers = await buildAuthHeadersClient()
    const res = await fetch(url, { cache: 'no-store', headers })

    if (!res.ok) {
      throw new Error(`Error al cargar fuentes de datos (${res.status})`)
    }

    const data = await res.json()
    return data as DataSourcesResult
  } catch (err) {
    console.error('getDataSources error:', err)
    throw new Error(err instanceof Error ? err.message : 'Error al cargar fuentes de datos')
  }
}

export async function createDataSource(data: CreateDataSourceData): Promise<DataSource> {
  try {
    const headers = await buildAuthHeadersClient() as Record<string, string>
    headers['Content-Type'] = 'application/json'

    const res = await fetch(`${CLIENT_API_URL}/api/data-sources`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data)
    })

    if (!res.ok) {
      const errorData = await res.json()
      throw new Error(errorData.error || `Error al crear fuente de datos (${res.status})`)
    }

    return res.json()
  } catch (err) {
    console.error('createDataSource error:', err)
    throw new Error(err instanceof Error ? err.message : 'Error al crear fuente de datos')
  }
}

export async function updateDataSource(id: string, data: UpdateDataSourceData): Promise<DataSource> {
  try {
    const headers = await buildAuthHeadersClient() as Record<string, string>
    headers['Content-Type'] = 'application/json'

    const res = await fetch(`${CLIENT_API_URL}/api/data-sources/${id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(data)
    })

    if (!res.ok) {
      const errorData = await res.json()
      throw new Error(errorData.error || `Error al actualizar fuente de datos (${res.status})`)
    }

    return res.json()
  } catch (err) {
    console.error('updateDataSource error:', err)
    throw new Error(err instanceof Error ? err.message : 'Error al actualizar fuente de datos')
  }
}

export async function deleteDataSource(id: string): Promise<void> {
  try {
    const headers = await buildAuthHeadersClient()

    const res = await fetch(`${CLIENT_API_URL}/api/data-sources/${id}`, {
      method: 'DELETE',
      headers
    })

    if (!res.ok) {
      const errorData = await res.json()
      throw new Error(errorData.error || `Error al eliminar fuente de datos (${res.status})`)
    }
  } catch (err) {
    console.error('deleteDataSource error:', err)
    throw new Error(err instanceof Error ? err.message : 'Error al eliminar fuente de datos')
  }
}

export async function triggerDataSourceMining(id: string): Promise<{ message: string; data_source_id: string }> {
  try {
    const headers = await buildAuthHeadersClient()

    const res = await fetch(`${CLIENT_API_URL}/api/data-sources/${id}/mine`, {
      method: 'POST',
      headers
    })

    if (!res.ok) {
      const errorData = await res.json()
      throw new Error(errorData.error || `Error al iniciar minería (${res.status})`)
    }

    return res.json()
  } catch (err) {
    console.error('triggerDataSourceMining error:', err)
    throw new Error(err instanceof Error ? err.message : 'Error al iniciar minería')
  }
}

export type City = {
  id: number
  slug: string
  name: string
}

export async function getCities(): Promise<City[]> {
  try {
    const headers = await buildAuthHeadersClient()
    const res = await fetch(`${CLIENT_API_URL}/api/events/cities`, { cache: 'no-store', headers })

    if (!res.ok) {
      throw new Error(`Error al cargar ciudades (${res.status})`)
    }

    const data = await res.json()
    return data.cities as City[]
  } catch (err) {
    console.error('getCities error:', err)
    throw new Error(err instanceof Error ? err.message : 'Error al cargar ciudades')
  }
}

export async function getInactiveEvents(params?: { city?: string; q?: string; page?: number; limit?: number }): Promise<{ events: Event[], pagination?: { page: number; limit: number; total: number; totalPages: number } }> {
  try {
    const headers = await buildAuthHeadersClient()
    const usp = new URLSearchParams()
    if (params?.city) usp.set('city', params.city)
    if (params?.q) usp.set('q', params.q)
    if (params?.page) usp.set('page', String(params.page))
    if (params?.limit) usp.set('limit', String(params.limit))
    const query = usp.toString()
    const url = `${CLIENT_API_URL}/api/admin/events/inactive${query ? `?${query}` : ''}`

    const res = await fetch(url, { cache: 'no-store', headers })

    if (!res.ok) {
      throw new Error(`Error al cargar eventos inactivos (${res.status})`)
    }

    const data = await res.json()
    return { events: data.events || [], pagination: data.pagination }
  } catch (err) {
    console.error('getInactiveEvents error:', err)
    throw new Error(err instanceof Error ? err.message : 'Error al cargar eventos inactivos')
  }
}

export async function deleteEvent(eventId: string): Promise<void> {
  try {
    const headers = await buildAuthHeadersClient()

    const res = await fetch(`${CLIENT_API_URL}/api/events/manage/${eventId}`, {
      method: 'DELETE',
      headers
    })

    if (!res.ok) {
      const errorData = await res.json()
      throw new Error(errorData.error || `Error al eliminar evento (${res.status})`)
    }
  } catch (err) {
    console.error('deleteEvent error:', err)
    throw new Error(err instanceof Error ? err.message : 'Error al eliminar evento')
  }
}

