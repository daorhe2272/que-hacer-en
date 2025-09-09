import type { EventDto } from '../../src/db/repository'

// Note: fs and path imports removed as we're using hardcoded mock data instead of reading events.json

// Mock test data derived from events.json
export const mockEvents: EventDto[] = [
  // Bogotá events
  {
    id: 'bg-001-uuid',
    title: 'Festival Rock al Parque',
    description: 'El festival de rock más importante de Latinoamérica regresa con bandas nacionales e internacionales en el Parque Simón Bolívar.',
    date: '2024-07-15',
    time: '14:00',
    location: 'Parque Simón Bolívar',
    address: 'Carrera 60 con Calle 63, Bogotá',
    category: 'Música',
    price: 0,
    currency: 'COP',
    image: 'https://example.com/rock-al-parque.jpg',
    organizer: 'IDARTES',
    capacity: 100000,
    tags: ['rock', 'festival', 'gratis', 'aire libre'],
    status: 'active'
  },
  {
    id: 'bg-002-uuid',
    title: 'Obra: El Avaro',
    description: 'La clásica comedia de Molière llega al Teatro Colón con una puesta en escena moderna y divertida.',
    date: '2024-03-22',
    time: '20:00',
    location: 'Teatro Colón',
    address: 'Calle 10 # 5-32, La Candelaria, Bogotá',
    category: 'Teatro',
    price: 85000,
    currency: 'COP',
    image: 'https://example.com/avaro-teatro.jpg',
    organizer: 'Teatro Colón',
    capacity: 895,
    tags: ['teatro', 'clásico', 'comedia'],
    status: 'active'
  },
  // Medellín event
  {
    id: 'med-001-uuid',
    title: 'Festival de las Flores',
    description: 'La tradicional celebración de Medellín con desfiles de silleteros, eventos culturales y mucha música.',
    date: '2024-08-05',
    time: '16:00',
    location: 'Centro de Medellín',
    address: 'Parque Berrio, Medellín',
    category: 'Cultural',
    price: 0,
    currency: 'COP',
    image: 'https://example.com/festival-flores.jpg',
    organizer: 'Alcaldía de Medellín',
    capacity: 50000,
    tags: ['tradición', 'flores', 'silleteros', 'gratis'],
    status: 'active'
  },
  // Tie-breaking test events - identical date and time
  {
    id: 'bg-tie-1-uuid',
    title: 'Tie Breaking Test Event A',
    description: 'Event with identical date/time as another event to test tie-breaking logic.',
    date: '2024-12-31',
    time: '23:59',
    location: 'Test Location A',
    address: 'Test Address A',
    category: 'Música',
    price: 50000,
    currency: 'COP',
    image: 'https://example.com/tie-test-a.jpg',
    organizer: 'Tie Test Organizer A',
    capacity: 100,
    tags: ['tie-test', 'sorting'],
    status: 'active'
  },
  {
    id: 'bg-tie-2-uuid',
    title: 'Tie Breaking Test Event B',
    description: 'Event with identical date/time as another event to test tie-breaking logic.',
    date: '2024-12-31',
    time: '23:59',
    location: 'Test Location B',
    address: 'Test Address B',
    category: 'Música',
    price: 50000,
    currency: 'COP',
    image: 'https://example.com/tie-test-b.jpg',
    organizer: 'Tie Test Organizer B',
    capacity: 100,
    tags: ['tie-test', 'sorting'],
    status: 'active'
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