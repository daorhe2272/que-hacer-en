import type { EventDto } from '../../src/db/repository'

// Note: fs and path imports removed as we're using hardcoded mock data instead of reading events.json

// Mock test data derived from events.json
export const mockEvents: EventDto[] = [
  // Bogotá events
  {
    id: 'bg-001-uuid',
    title: 'Festival Rock al Parque',
    description: 'El festival de rock más importante de Latinoamérica regresa con bandas nacionales e internacionales en el Parque Simón Bolívar.',
    utcTimestamp: '2024-07-15T19:00:00.000Z',
    location: 'Parque Simón Bolívar',
    address: 'Carrera 60 con Calle 63, Bogotá',
    category: 'Música',
    city: 'bogota',
    price: 0,
    currency: 'COP',
    image: 'https://example.com/rock-al-parque.jpg',
    tags: ['rock', 'festival', 'gratis', 'aire libre'],
    
  },
  {
    id: 'bg-002-uuid',
    title: 'Obra: El Avaro',
    description: 'La clásica comedia de Molière llega al Teatro Colón con una puesta en escena moderna y divertida.',
    utcTimestamp: '2024-03-23T01:00:00.000Z',
    location: 'Teatro Colón',
    address: 'Calle 10 # 5-32, La Candelaria, Bogotá',
    category: 'Teatro',
    city: 'bogota',
    price: 85000,
    currency: 'COP',
    image: 'https://example.com/avaro-teatro.jpg',
    tags: ['teatro', 'clásico', 'comedia'],
    
  },
  // Medellín event
  {
    id: 'med-001-uuid',
    title: 'Festival de las Flores',
    description: 'La tradicional celebración de Medellín con desfiles de silleteros, eventos culturales y mucha música.',
    utcTimestamp: '2024-08-05T21:00:00.000Z',
    location: 'Centro de Medellín',
    address: 'Parque Berrio, Medellín',
    category: 'Cultural',
    city: 'medellin',
    price: 0,
    currency: 'COP',
    image: 'https://example.com/festival-flores.jpg',
    tags: ['tradición', 'flores', 'silleteros', 'gratis'],
    
  },
  // Tie-breaking test events - identical date and time
  {
    id: 'bg-tie-1-uuid',
    title: 'Tie Breaking Test Event A',
    description: 'Event with identical date/time as another event to test tie-breaking logic.',
    utcTimestamp: '2025-01-01T04:59:00.000Z',
    location: 'Test Location A',
    address: 'Test Address A',
    category: 'Música',
    city: 'bogota',
    price: 50000,
    currency: 'COP',
    image: 'https://example.com/tie-test-a.jpg',
    tags: ['tie-test', 'sorting'],
    
  },
  {
    id: 'bg-tie-2-uuid',
    title: 'Tie Breaking Test Event B',
    description: 'Event with identical date/time as another event to test tie-breaking logic.',
    utcTimestamp: '2025-01-01T04:59:00.000Z',
    location: 'Test Location B',
    address: 'Test Address B',
    category: 'Música',
    city: 'bogota',
    price: 50000,
    currency: 'COP',
    image: 'https://example.com/tie-test-b.jpg',
    tags: ['tie-test', 'sorting'],
    
  }
]

export const mockUsers = {
  attendee: { id: 'test-user-attendee', email: 'attendee@test.com', role: 'attendee' },
  organizer: { id: 'test-user-organizer', email: 'organizer@test.com', role: 'organizer' },
  admin: { id: 'test-user-admin', email: 'admin@test.com', role: 'admin' }
}

// Mock cities data
export const mockCities = [
  { id: 1, slug: 'bogota', name: 'Bogotá' },
  { id: 2, slug: 'medellin', name: 'Medellín' },
  { id: 3, slug: 'cali', name: 'Cali' },
  { id: 4, slug: 'barranquilla', name: 'Barranquilla' },
  { id: 5, slug: 'cartagena', name: 'Cartagena' }
]

// Mock categories data
export const mockCategories = [
  { id: 1, slug: 'musica', label: 'Música' },
  { id: 2, slug: 'teatro', label: 'Teatro' },
  { id: 3, slug: 'cultural', label: 'Cultural' },
  { id: 4, slug: 'arte', label: 'Arte' },
  { id: 5, slug: 'gastronomia', label: 'Gastronomía' }
]

// Mock data sources data
export const mockDataSources = [
  {
    id: 'ds-001',
    url: 'https://example.com/events1',
    city_id: 1,
    city_name: 'Bogotá',
    city_slug: 'bogota',
    source_type: 'regular',
    last_mined: '2024-01-01T00:00:00.000Z',
    mining_status: 'completed',
    active: true,
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-01T00:00:00.000Z',
    created_by: 'admin-id'
  },
  {
    id: 'ds-002',
    url: 'https://example.com/events2',
    city_id: null,
    city_name: null,
    city_slug: null,
    source_type: 'occasional',
    last_mined: null,
    mining_status: 'pending',
    active: true,
    created_at: '2024-01-02T00:00:00.000Z',
    updated_at: '2024-01-02T00:00:00.000Z',
    created_by: 'admin-id'
  }
]

export interface MockQueryResult<T = any> {
  rows: T[]
  rowCount: number | null
}

// Database query mocker
export function createMockQuery() {
  return jest.fn().mockImplementation(<T = any>(sql: string, args: any[] = []): MockQueryResult<T> => {
    // Mock different query patterns
    if (sql.includes('SELECT COUNT(*)')) {
      return { rows: [{ count: '3' } as T], rowCount: 1 }
    }
    
    if (sql.includes('FROM cities WHERE slug')) {
      const citySlug = args[0]
      const city = mockCities.find(c => c.slug === citySlug)
      return city ? { rows: [city as T], rowCount: 1 } : { rows: [], rowCount: 0 }
    }
    
    if (sql.includes('FROM categories WHERE slug')) {
      const categorySlug = args[0]
      const category = mockCategories.find(c => c.slug === categorySlug)
      return category ? { rows: [category as T], rowCount: 1 } : { rows: [], rowCount: 0 }
    }
    
    if (sql.includes('FROM events e') && sql.includes('JOIN')) {
      // Mock event listing queries
      return { rows: mockEvents.slice(0, 2) as T[], rowCount: 2 }
    }
    
    if (sql.includes('INSERT INTO events')) {
      return { rows: [], rowCount: 1 }
    }
    
    if (sql.includes('UPDATE events')) {
      return { rows: [], rowCount: 1 }
    }
    
    if (sql.includes('DELETE FROM events')) {
      return { rows: [], rowCount: 1 }
    }

    // Data sources queries
    if (sql.includes('SELECT COUNT(*)') && sql.includes('FROM data_sources')) {
      return { rows: [{ count: '2' } as T], rowCount: 1 }
    }

    if (sql.includes('FROM data_sources ds') && sql.includes('LEFT JOIN cities c')) {
      // Mock data sources listing
      return { rows: mockDataSources as T[], rowCount: 2 }
    }

    if (sql.includes('SELECT id FROM cities WHERE slug')) {
      const citySlug = args[0]
      const city = mockCities.find(c => c.slug === citySlug)
      return city ? { rows: [city as T], rowCount: 1 } : { rows: [], rowCount: 0 }
    }

    if (sql.includes('SELECT id FROM data_sources WHERE url')) {
      // Mock duplicate check
      return { rows: [], rowCount: 0 }
    }

    if (sql.includes('INSERT INTO data_sources')) {
      const newDataSource = {
        id: 'ds-new',
        url: args[0],
        city_id: args[1],
        source_type: args[2],
        last_mined: null,
        mining_status: 'pending',
        active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        created_by: args[3]
      }
      return { rows: [newDataSource as T], rowCount: 1 }
    }

    if (sql.includes('SELECT created_by FROM data_sources WHERE id')) {
      return { rows: [{ created_by: 'admin-id' } as T], rowCount: 1 }
    }

    if (sql.includes('UPDATE data_sources SET')) {
      return { rows: [mockDataSources[0] as T], rowCount: 1 }
    }

    if (sql.includes('DELETE FROM data_sources')) {
      return { rows: [], rowCount: 1 }
    }

    if (sql.includes('SELECT url, active FROM data_sources WHERE id')) {
      return { rows: [{ url: 'https://example.com/test', active: true } as T], rowCount: 1 }
    }

    if (sql.includes('UPDATE data_sources SET mining_status')) {
      return { rows: [], rowCount: 1 }
    }

    if (sql.includes('SELECT name FROM cities WHERE id')) {
      const cityId = args[0]
      const city = mockCities.find(c => c.id === cityId)
      return city ? { rows: [{ name: city.name } as T], rowCount: 1 } : { rows: [], rowCount: 0 }
    }

    // Default empty result
    return { rows: [], rowCount: 0 }
  })
}

// Mock request helpers
export function mockRequest(overrides: any = {}) {
  return {
    query: {},
    params: {},
    body: {},
    headers: {},
    user: undefined,
    correlationId: 'test-correlation-id',
    ...overrides
  } as any
}

export function mockResponse() {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    setHeader: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
    end: jest.fn().mockReturnThis()
  }
  return res as any
}

export function mockNext() {
  return jest.fn()
}