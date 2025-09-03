import { 
  createEventDb,
  updateEventDb,
  deleteEventDb,
  getEventByIdDb,
  listOrganizerEventsDb,
  addToFavoritesDb,
  removeFromFavoritesDb,
  getUserFavoritesDb,
  isEventFavoritedDb,
  listEventsByCityDb,
  listEventsDb,
  getEventByLegacyIdDb
} from '../src/db/repository'

// Mock the database client
jest.mock('../src/db/client')
import { query } from '../src/db/client'
const mockQuery = jest.mocked(query)

// Mock crypto for UUID generation
const mockUUID = '550e8400-e29b-41d4-a716-446655440000'
jest.mock('crypto', () => ({
  randomUUID: () => mockUUID,
  createHash: jest.fn(() => ({
    update: jest.fn(() => ({
      digest: jest.fn(() => 'mocked-hash-0123456789abcdef0123456789abcdef')
    }))
  })),
  default: {
    randomUUID: () => mockUUID,
    createHash: jest.fn(() => ({
      update: jest.fn(() => ({
        digest: jest.fn(() => 'mocked-hash-0123456789abcdef0123456789abcdef')
      }))
    }))
  }
}))

describe('Database Repository Functions', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('createEventDb', () => {
    const eventData = {
      title: 'Test Event',
      description: 'A test event description',
      date: '2024-12-01',
      time: '20:00',
      location: 'Test Venue', 
      address: 'Test Address',
      category: 'musica',
      price: 50000,
      currency: 'COP',
      image: 'https://example.com/image.jpg',
      organizer: 'Test Organizer',
      capacity: 100,
      tags: ['test', 'music'],
      status: 'active' as const,
      city: 'bogota' as const
    }

    it('should throw error when city not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] } as any) // City lookup fails

      await expect(createEventDb(eventData, 'user-123'))
        .rejects.toThrow('Ciudad no encontrada')

      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT id FROM cities WHERE slug = $1',
        ['bogota']
      )
    })

    it('should throw error when category not found', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ id: 1 }] } as any) // City found
        .mockResolvedValueOnce({ rows: [] } as any) // Category not found

      await expect(createEventDb(eventData, 'user-123'))
        .rejects.toThrow('Categoría no encontrada')

      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT id FROM categories WHERE slug = $1',
        ['musica']
      )
    })

    it('should create event successfully with tags', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ id: 1 }] } as any) // City found  
        .mockResolvedValueOnce({ rows: [{ id: 2 }] } as any) // Category found
        .mockResolvedValueOnce({ rows: [] } as any) // Event insert
        .mockResolvedValueOnce({ rows: [] } as any) // Tag 1 insert
        .mockResolvedValueOnce({ rows: [{ id: 10 }] } as any) // Tag 1 select
        .mockResolvedValueOnce({ rows: [] } as any) // Event-tag 1 insert
        .mockResolvedValueOnce({ rows: [] } as any) // Tag 2 insert
        .mockResolvedValueOnce({ rows: [{ id: 11 }] } as any) // Tag 2 select  
        .mockResolvedValueOnce({ rows: [] } as any) // Event-tag 2 insert
        .mockResolvedValueOnce({ // getEventByIdDb event query
          rows: [{
            id: mockUUID,
            title: 'Test Event',
            description: 'A test event description',
            venue: 'Test Venue',
            address: 'Test Address',
            starts_at: '2024-12-01T20:00:00.000Z',
            price_cents: 50000,
            currency: 'COP',
            city: 'bogota',
            category: 'musica',
            date: '2024-12-01',
            time: '20:00',
            location: 'Test Venue',
            price: 50000
          }]
        } as any)
        .mockResolvedValueOnce({ // getEventByIdDb tags query
          rows: [{ name: 'test' }, { name: 'music' }]
        } as any)

      const result = await createEventDb(eventData, 'user-123')
      
      expect(result).toBeDefined()
      expect(result.id).toBe(mockUUID)
      expect(result.title).toBe('Test Event')
    })

    it('should throw error when event creation fails', async () => {
      const eventWithoutTags = { ...eventData, tags: [] } // No tags to avoid tag processing
      
      mockQuery
        .mockResolvedValueOnce({ rows: [{ id: 1 }] } as any) // City found
        .mockResolvedValueOnce({ rows: [{ id: 2 }] } as any) // Category found  
        .mockResolvedValueOnce({ rows: [] } as any) // Event insert
        .mockResolvedValueOnce({ rows: [] } as any) // getEventByIdDb event query returns empty

      await expect(createEventDb(eventWithoutTags, 'user-123'))
        .rejects.toThrow('Error al crear el evento')
    })

    it('should create event without tags', async () => {
      const eventWithoutTags = { ...eventData, tags: [] }
      
      mockQuery
        .mockResolvedValueOnce({ rows: [{ id: 1 }] } as any) // City found
        .mockResolvedValueOnce({ rows: [{ id: 2 }] } as any) // Category found
        .mockResolvedValueOnce({ rows: [] } as any) // Event insert
        .mockResolvedValueOnce({ // getEventByIdDb event query
          rows: [{
            id: mockUUID,
            title: 'Test Event',
            description: 'A test event description',
            venue: 'Test Venue',
            address: 'Test Address', 
            starts_at: '2024-12-01T20:00:00.000Z',
            price_cents: 50000,
            currency: 'COP',
            city: 'bogota',
            category: 'musica',
            date: '2024-12-01',
            time: '20:00',
            location: 'Test Venue',
            price: 50000
          }]
        } as any)
        .mockResolvedValueOnce({ // getEventByIdDb tags query
          rows: []
        } as any)

      const result = await createEventDb(eventWithoutTags, 'user-123')
      expect(result.tags).toEqual([])
    })

    it('should handle undefined tags parameter - targets line 248 default assignment', async () => {
      const eventWithUndefinedTags = { ...eventData }
      delete (eventWithUndefinedTags as any).tags // Remove tags property to trigger default assignment
      
      mockQuery
        .mockResolvedValueOnce({ rows: [{ id: 1 }] } as any) // City found
        .mockResolvedValueOnce({ rows: [{ id: 2 }] } as any) // Category found
        .mockResolvedValueOnce({ rows: [] } as any) // Event insert
        .mockResolvedValueOnce({ // getEventByIdDb event query
          rows: [{
            id: mockUUID,
            title: 'Test Event',
            description: 'A test event description',
            venue: 'Test Venue',
            address: 'Test Address', 
            starts_at: '2024-12-01T20:00:00.000Z',
            price_cents: 50000,
            currency: 'COP',
            city: 'bogota',
            category: 'musica',
            date: '2024-12-01',
            time: '20:00',
            location: 'Test Venue',
            price: 50000
          }]
        } as any)
        .mockResolvedValueOnce({ // getEventByIdDb tags query
          rows: []
        } as any)

      const result = await createEventDb(eventWithUndefinedTags, 'user-123')
      expect(result.tags).toEqual([]) // Should use [] from default assignment
    })
  })

  describe('updateEventDb', () => {
    const updateData = {
      id: mockUUID,
      title: 'Updated Event',
      description: 'Updated description',
      date: '2024-12-01',
      time: '20:00',
      location: 'Updated Venue',
      address: 'Updated Address',
      category: 'musica',
      city: 'bogota' as const,
      price: 60000,
      currency: 'COP',
      tags: ['updated']
    }

    it('should return null when event does not exist', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [] } as any) // getEventByIdDb event query returns empty

      const result = await updateEventDb(updateData, 'user-123')
      expect(result).toBeNull()
    })

    it('should throw error when city not found', async () => {
      mockQuery
        .mockResolvedValueOnce({ // getEventByIdDb event query - event exists
          rows: [{
            id: mockUUID,
            title: 'Existing Event',
            description: 'Description',
            venue: 'Venue',
            address: 'Address',
            starts_at: '2024-12-01T20:00:00.000Z',
            price_cents: 50000,
            currency: 'COP',
            city: 'bogota',
            category: 'musica',
            date: '2024-12-01',
            time: '20:00',
            location: 'Venue',
            price: 50000
          }]
        } as any)
        .mockResolvedValueOnce({ rows: [] } as any) // getEventByIdDb tags query
        .mockResolvedValueOnce({ rows: [] } as any) // City not found

      await expect(updateEventDb(updateData, 'user-123'))
        .rejects.toThrow('Ciudad no encontrada')
    })

    it('should throw error when category not found', async () => {
      mockQuery
        .mockResolvedValueOnce({ // getEventByIdDb event query - event exists
          rows: [{
            id: mockUUID,
            title: 'Existing Event',
            description: 'Description',
            venue: 'Venue',
            address: 'Address',
            starts_at: '2024-12-01T20:00:00.000Z',
            price_cents: 50000,
            currency: 'COP',
            city: 'bogota',
            category: 'musica',
            date: '2024-12-01',
            time: '20:00',
            location: 'Venue',
            price: 50000
          }]
        } as any)
        .mockResolvedValueOnce({ rows: [] } as any) // getEventByIdDb tags query
        .mockResolvedValueOnce({ rows: [{ id: 1 }] } as any) // City found
        .mockResolvedValueOnce({ rows: [] } as any) // Category not found

      await expect(updateEventDb(updateData, 'user-123'))
        .rejects.toThrow('Categoría no encontrada')
    })

    it('should update event with category and tags successfully', async () => {
      mockQuery
        .mockResolvedValueOnce({ // getEventByIdDb event query - event exists
          rows: [{
            id: mockUUID,
            title: 'Existing Event',
            description: 'Description',
            venue: 'Venue',
            address: 'Address',
            starts_at: '2024-12-01T20:00:00.000Z',
            price_cents: 50000,
            currency: 'COP',
            city: 'bogota',
            category: 'musica',
            date: '2024-12-01',
            time: '20:00',
            location: 'Venue',
            price: 50000
          }]
        } as any)
        .mockResolvedValueOnce({ rows: [] } as any) // getEventByIdDb tags query
        .mockResolvedValueOnce({ rows: [{ id: 1 }] } as any) // City found
        .mockResolvedValueOnce({ rows: [{ id: 2 }] } as any) // Category found
        .mockResolvedValueOnce({ rows: [] } as any) // UPDATE events query
        .mockResolvedValueOnce({ rows: [] } as any) // DELETE event_tags
        .mockResolvedValueOnce({ rows: [] } as any) // INSERT tag
        .mockResolvedValueOnce({ rows: [{ id: 10 }] } as any) // SELECT tag id
        .mockResolvedValueOnce({ rows: [] } as any) // INSERT event_tags
        .mockResolvedValueOnce({ // Final getEventByIdDb event query
          rows: [{
            id: mockUUID,
            title: 'Updated Event',
            description: 'Updated description',
            venue: 'Updated Venue',
            address: 'Updated Address',
            starts_at: '2024-12-01T20:00:00.000Z',
            price_cents: 60000,
            currency: 'COP',
            city: 'bogota',
            category: 'musica',
            date: '2024-12-01',
            time: '20:00',
            location: 'Updated Venue',
            price: 60000
          }]
        } as any)
        .mockResolvedValueOnce({ // Final getEventByIdDb tags query
          rows: [{ name: 'updated' }]
        } as any)

      const result = await updateEventDb(updateData, 'user-123')
      
      expect(result).not.toBeNull()
      expect(result?.title).toBe('Updated Event')
      expect(result?.tags).toEqual(['updated'])
      
      // Verify category update was called (note: uses slug not name, and normalized)
      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT id FROM categories WHERE slug = $1',
        ['musica']
      )
      
      // Verify UPDATE query was called
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE events SET'),
        expect.any(Array)
      )
      
      // Verify tag operations
      expect(mockQuery).toHaveBeenCalledWith(
        'DELETE FROM event_tags WHERE event_id = $1',
        [mockUUID]
      )
    })
  })

  describe('deleteEventDb', () => {
    it('should return false when no rows deleted', async () => {
      mockQuery.mockResolvedValueOnce({ rowCount: 0 } as any) // DELETE affects 0 rows

      const result = await deleteEventDb(mockUUID, 'user-123')
      expect(result).toBe(false)
    })

    it('should return true when delete succeeds', async () => {
      mockQuery.mockResolvedValueOnce({ rowCount: 1 } as any) // DELETE affects 1 row

      const result = await deleteEventDb(mockUUID, 'user-123')
      expect(result).toBe(true)
    })

    it('should return false when rowCount is null', async () => {
      mockQuery.mockResolvedValueOnce({ rowCount: null } as any) // DELETE returns null

      const result = await deleteEventDb(mockUUID, 'user-123')
      expect(result).toBe(false)
    })
  })

  describe('getEventByIdDb', () => {
    it('should return null when event not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] } as any)

      const result = await getEventByIdDb(mockUUID)
      expect(result).toBeNull()
    })

    it('should return event when found', async () => {
      mockQuery
        .mockResolvedValueOnce({ // Event query
          rows: [{
            id: mockUUID,
            title: 'Test Event',
            description: 'Description',
            venue: 'Venue',
            address: 'Address',
            starts_at: '2024-12-01T20:00:00.000Z',
            price_cents: 50000,
            currency: 'COP',
            city: 'bogota',
            category: 'musica',
            date: '2024-12-01',
            time: '20:00',
            location: 'Venue',
            price: 50000
          }]
        } as any)
        .mockResolvedValueOnce({ // Tags query
          rows: [{ name: 'test' }, { name: 'music' }]
        } as any)

      const result = await getEventByIdDb(mockUUID)
      expect(result).not.toBeNull()
      expect(result?.id).toBe(mockUUID)
      expect(result?.tags).toEqual(['test', 'music'])
    })

    it('should handle null location and address - targets lines 424-425', async () => {
      mockQuery
        .mockResolvedValueOnce({ // Event query with null location and address
          rows: [{
            id: mockUUID,
            title: 'Test Event',
            description: 'Description',
            venue: 'Venue',
            starts_at: '2024-12-01T20:00:00.000Z',
            price_cents: 50000,
            currency: 'COP',
            city: 'bogota',
            category: 'musica',
            date: '2024-12-01',
            time: '20:00',
            location: null, // Will trigger line 424: r.location ?? ''
            address: null,  // Will trigger line 425: r.address ?? ''
            price: 50000
          }]
        } as any)
        .mockResolvedValueOnce({ // Tags query
          rows: [{ name: 'test' }]
        } as any)

      const result = await getEventByIdDb(mockUUID)
      expect(result).not.toBeNull()
      expect(result?.location).toBe('') // Should use '' from fallback
      expect(result?.address).toBe('')  // Should use '' from fallback
      expect(result?.tags).toEqual(['test'])
    })

    it('should handle undefined location and address - targets lines 424-425', async () => {
      mockQuery
        .mockResolvedValueOnce({ // Event query with undefined location and address
          rows: [{
            id: mockUUID,
            title: 'Test Event',
            description: 'Description',
            venue: 'Venue',
            starts_at: '2024-12-01T20:00:00.000Z',
            price_cents: 50000,
            currency: 'COP',
            city: 'bogota',
            category: 'musica',
            date: '2024-12-01',
            time: '20:00',
            // location: undefined (missing property)
            // address: undefined (missing property)
            price: 50000
          }]
        } as any)
        .mockResolvedValueOnce({ // Tags query
          rows: [{ name: 'test' }]
        } as any)

      const result = await getEventByIdDb(mockUUID)
      expect(result).not.toBeNull()
      expect(result?.location).toBe('') // Should use '' from fallback
      expect(result?.address).toBe('')  // Should use '' from fallback
      expect(result?.tags).toEqual(['test'])
    })
  })

  describe('listOrganizerEventsDb', () => {
    const organizerId = 'user-123'

    it('should handle empty results', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ count: '0' }] } as any) // COUNT
        .mockResolvedValueOnce({ rows: [] } as any) // SELECT events (empty)

      const result = await listOrganizerEventsDb(organizerId, { page: 1, limit: 20 })
      
      expect(result.total).toBe(0)
      expect(result.events).toEqual([])
    })

    it('should use default parameter values - targets line 439 default assignments', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ count: '1' }] } as any) // COUNT
        .mockResolvedValueOnce({ // SELECT events
          rows: [{
            id: mockUUID,
            title: 'Event',
            description: 'Description',
            location: 'Venue',
            address: 'Address',
            date: '2024-12-01',
            time: '20:00',
            price: 50000,
            currency: 'COP',
            city: 'bogota',
            category: 'musica'
          }]
        } as any)
        .mockResolvedValueOnce({ // SELECT tags for first event
          rows: [{ name: 'test' }]
        } as any)

      // Call with empty params object to trigger default assignments
      // page = 1, limit = 20, order = 'asc'
      const result = await listOrganizerEventsDb(organizerId, {})
      
      expect(result.total).toBe(1)
      expect(result.events).toHaveLength(1)
      expect(result.events[0].tags).toEqual(['test'])
      
      // Verify that default values were used in the SQL query
      const selectQuery = mockQuery.mock.calls[1][0]
      
      // Should use default limit 20 and page 1 (offset 0)
      expect(selectQuery).toContain('LIMIT 20')
      expect(selectQuery).toContain('OFFSET 0')
      
      // Should use default order 'asc' (date ascending)
      expect(selectQuery).toContain('ORDER BY e.starts_at ASC')
    })

    it('should return events with filters', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ count: '1' }] } as any) // COUNT
        .mockResolvedValueOnce({ // SELECT events
          rows: [{
            id: mockUUID,
            title: 'Event',
            description: 'Description',
            location: 'Venue',
            address: 'Address',
            date: '2024-12-01',
            time: '20:00',
            price: 50000,
            currency: 'COP',
            city: 'bogota',
            category: 'musica'
          }]
        } as any)
        .mockResolvedValueOnce({ // SELECT tags for first event
          rows: [{ name: 'test' }]
        } as any)

      const result = await listOrganizerEventsDb(organizerId, {
        page: 1,
        limit: 20,
        city: 'bogota',
        q: 'test'
      })
      
      expect(result.total).toBe(1)
      expect(result.events).toHaveLength(1)
      expect(result.events[0].tags).toEqual(['test'])
    })

    it('should handle date and price filters', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ count: '1' }] } as any) // COUNT
        .mockResolvedValueOnce({ // SELECT events
          rows: [{
            id: mockUUID,
            title: 'Filtered Event',
            description: 'Description',
            location: 'Venue',
            address: 'Address',
            date: '2024-06-15',
            time: '19:00',
            price: 30000,
            currency: 'COP',
            city: 'bogota',
            category: 'musica'
          }]
        } as any)
        .mockResolvedValueOnce({ // SELECT tags for event
          rows: [{ name: 'concert' }]
        } as any)

      const result = await listOrganizerEventsDb(organizerId, {
        page: 1,
        limit: 20,
        from: '2024-06-01',
        to: '2024-06-30',
        minPrice: 25000,
        maxPrice: 50000
      })
      
      expect(result.total).toBe(1)
      expect(result.events).toHaveLength(1)
      expect(result.events[0].title).toBe('Filtered Event')
    })

    it('should handle category filter', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ count: '1' }] } as any) // COUNT
        .mockResolvedValueOnce({ // SELECT events
          rows: [{
            id: mockUUID,
            title: 'Music Event',
            description: 'A musical performance',
            location: 'Concert Hall',
            address: 'Main Street 123',
            date: '2024-07-20',
            time: '21:00',
            price: 45000,
            currency: 'COP',
            city: 'bogota',
            category: 'musica'
          }]
        } as any)
        .mockResolvedValueOnce({ // SELECT tags for event
          rows: [{ name: 'concert' }, { name: 'live' }]
        } as any)

      const result = await listOrganizerEventsDb(organizerId, {
        page: 1,
        limit: 20,
        category: 'musica'
      })
      
      expect(result.total).toBe(1)
      expect(result.events).toHaveLength(1)
      expect(result.events[0].category).toBe('musica')
      expect(result.events[0].tags).toEqual(['concert', 'live'])
    })

    it('should handle price sorting with desc order - targets lines 467-468', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ count: '1' }] } as any) // COUNT
        .mockResolvedValueOnce({ // SELECT events
          rows: [{
            id: mockUUID,
            title: 'Expensive Event',
            description: 'High-priced event',
            location: 'Premium Venue', 
            address: 'Elite Street 456',
            date: '2024-08-15',
            time: '19:30',
            price: 75000,
            currency: 'COP',
            city: 'bogota',
            category: 'musica'
          }]
        } as any)
        .mockResolvedValueOnce({ // SELECT tags for event
          rows: [{ name: 'premium' }]
        } as any)

      const result = await listOrganizerEventsDb(organizerId, {
        sort: 'price',
        order: 'desc',
        page: 1,
        limit: 20
      })
      
      expect(result.total).toBe(1)
      expect(result.events).toHaveLength(1)
      expect(result.events[0].title).toBe('Expensive Event')
      
      // Verify the ORDER BY clause includes price_cents DESC
      const selectQuery = mockQuery.mock.calls[1][0]
      expect(selectQuery).toContain('ORDER BY e.price_cents DESC')
    })

    it('should handle price sorting with asc order - targets lines 467-468', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ count: '1' }] } as any) // COUNT
        .mockResolvedValueOnce({ // SELECT events
          rows: [{
            id: mockUUID,
            title: 'Affordable Event',
            description: 'Budget-friendly event',
            location: 'Community Center',
            address: 'Budget Street 789',
            date: '2024-09-10',
            time: '18:00',
            price: 15000,
            currency: 'COP',
            city: 'bogota',
            category: 'cultura'
          }]
        } as any)
        .mockResolvedValueOnce({ // SELECT tags for event
          rows: [{ name: 'affordable' }]
        } as any)

      const result = await listOrganizerEventsDb(organizerId, {
        sort: 'price',
        order: 'asc',
        page: 1,
        limit: 20
      })
      
      expect(result.total).toBe(1)
      expect(result.events).toHaveLength(1)
      expect(result.events[0].title).toBe('Affordable Event')
      
      // Verify the ORDER BY clause includes price_cents ASC
      const selectQuery = mockQuery.mock.calls[1][0]
      expect(selectQuery).toContain('ORDER BY e.price_cents ASC')
    })

    it('should handle null location and address in organizer events - targets lines 515-516', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ count: '1' }] } as any) // COUNT
        .mockResolvedValueOnce({ // SELECT events with null location and address
          rows: [{
            id: mockUUID,
            title: 'Event with null venue',
            description: 'Event without venue details',
            location: null, // Will trigger line 515: r.location ?? ''
            address: null,  // Will trigger line 516: r.address ?? ''
            date: '2024-10-05',
            time: '14:00',
            price: 25000,
            currency: 'COP',
            city: 'bogota',
            category: 'educacion'
          }]
        } as any)
        .mockResolvedValueOnce({ // SELECT tags for event
          rows: [{ name: 'workshop' }]
        } as any)

      const result = await listOrganizerEventsDb(organizerId, {
        page: 1,
        limit: 20
      })
      
      expect(result.total).toBe(1)
      expect(result.events).toHaveLength(1)
      expect(result.events[0].location).toBe('') // Should use '' from fallback
      expect(result.events[0].address).toBe('')  // Should use '' from fallback
      expect(result.events[0].tags).toEqual(['workshop'])
    })

    it('should handle empty count result in organizer events - targets line 479 || "0" fallback', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [] } as any) // COUNT query returns empty rows - triggers || '0'
        .mockResolvedValueOnce({ rows: [] } as any) // SELECT events query returns empty

      const result = await listOrganizerEventsDb(organizerId, { page: 1, limit: 20 })
      
      expect(result.total).toBe(0) // Should use '0' from fallback
      expect(result.events).toEqual([])
    })
  })

  describe('addToFavoritesDb', () => {
    it('should return true when favorite added successfully', async () => {
      mockQuery.mockResolvedValueOnce({ rowCount: 1 } as any)

      const result = await addToFavoritesDb('user-123', 'event-123')
      expect(result).toBe(true)
    })

    it('should return false when database error occurs', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Database error'))

      const result = await addToFavoritesDb('user-123', 'event-123')
      expect(result).toBe(false)
    })
  })

  describe('removeFromFavoritesDb', () => {
    it('should return true when favorite removed successfully', async () => {
      mockQuery.mockResolvedValueOnce({ rowCount: 1 } as any)

      const result = await removeFromFavoritesDb('user-123', 'event-123')
      expect(result).toBe(true)
    })

    it('should return false when favorite remove fails', async () => {
      mockQuery.mockResolvedValueOnce({ rowCount: 0 } as any)

      const result = await removeFromFavoritesDb('user-123', 'event-123')
      expect(result).toBe(false)
    })

    it('should return false when database throws an error', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Database connection error'))

      const result = await removeFromFavoritesDb('user-123', 'event-123')
      expect(result).toBe(false)
    })

    it('should handle null rowCount - targets line 549 ?? 0 fallback', async () => {
      mockQuery.mockResolvedValueOnce({ rowCount: null } as any) // Will trigger line 549: result.rowCount ?? 0

      const result = await removeFromFavoritesDb('user-123', 'event-123')
      expect(result).toBe(false) // (null ?? 0) > 0 = false
    })

  })

  describe('getUserFavoritesDb', () => {
    it('should handle empty favorites', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ count: '0' }] } as any) // COUNT
        .mockResolvedValueOnce({ rows: [] } as any) // SELECT

      const result = await getUserFavoritesDb('user-123', { page: 1, limit: 20 })
      
      expect(result.total).toBe(0)
      expect(result.events).toEqual([])
    })

    it('should return user favorites', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ count: '1' }] } as any) // COUNT
        .mockResolvedValueOnce({ // SELECT events
          rows: [{
            id: mockUUID,
            title: 'Favorite Event',
            description: 'Description',
            location: 'Venue',
            address: 'Address',
            date: '2024-12-01',
            time: '20:00',
            price: 50000,
            currency: 'COP',
            city: 'bogota',
            category: 'musica'
          }]
        } as any)
        .mockResolvedValueOnce({ // SELECT tags for first event
          rows: [{ name: 'favorite' }]
        } as any)

      const result = await getUserFavoritesDb('user-123', { page: 1, limit: 20 })
      
      expect(result.total).toBe(1)
      expect(result.events).toHaveLength(1)
      expect(result.events[0].tags).toEqual(['favorite'])
    })

    it('should handle search query with text search', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ count: '1' }] } as any) // COUNT
        .mockResolvedValueOnce({ // SELECT events with search
          rows: [{
            id: mockUUID,
            title: 'Concert Event',
            description: 'Music concert in the park',
            location: 'Park Venue',
            address: 'Address',
            date: '2024-12-01',
            time: '20:00',
            price: 50000,
            currency: 'COP',
            city: 'bogota',
            category: 'musica'
          }]
        } as any)
        .mockResolvedValueOnce({ // SELECT tags for first event
          rows: [{ name: 'music' }]
        } as any)

      const result = await getUserFavoritesDb('user-123', { 
        page: 1, 
        limit: 20,
        q: 'concert' // This should trigger the search logic lines 565-575
      })
      
      expect(result.total).toBe(1)
      expect(result.events).toHaveLength(1)
      expect(result.events[0].title).toBe('Concert Event')
      
      // Verify that the search query was constructed with LIKE clauses
      const countQuery = mockQuery.mock.calls[0][0]
      expect(countQuery).toContain('e.title_norm LIKE')
      expect(countQuery).toContain('e.description_norm LIKE') 
      expect(countQuery).toContain('e.venue_norm LIKE')
      expect(countQuery).toContain('t.name_norm LIKE')
      
      // Verify the search term was normalized and wrapped with %
      const countParams = mockQuery.mock.calls[0][1]
      expect(countParams).toContain('%concert%')
    })

    it('should use default parameter values - targets line 556 default assignments', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ count: '1' }] } as any) // COUNT
        .mockResolvedValueOnce({ // SELECT events
          rows: [{
            id: mockUUID,
            title: 'Default Params Event',
            description: 'Event tested with default parameters',
            location: 'Default Venue',
            address: 'Default Address',
            date: '2024-12-01',
            time: '20:00',
            price: 40000,
            currency: 'COP',
            city: 'bogota',
            category: 'musica'
          }]
        } as any)
        .mockResolvedValueOnce({ // SELECT tags for event
          rows: [{ name: 'default' }]
        } as any)

      // Call with empty params object to trigger default assignments
      // page = 1, limit = 20, order = 'asc'
      const result = await getUserFavoritesDb('user-123', {})
      
      expect(result.total).toBe(1)
      expect(result.events).toHaveLength(1)
      expect(result.events[0].tags).toEqual(['default'])
      
      // Verify that default values were used in the SQL query
      const selectQuery = mockQuery.mock.calls[1][0]
      
      // Should use default limit 20 and page 1 (offset 0)
      expect(selectQuery).toContain('LIMIT 20')
      expect(selectQuery).toContain('OFFSET 0')
      
      // Should use default order 'asc' (created_at ascending for favorites)
      expect(selectQuery).toContain('ORDER BY f.created_at ASC')
    })

    it('should handle city filter - targets line 562 if (city) branch', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ count: '1' }] } as any) // COUNT
        .mockResolvedValueOnce({ // SELECT events
          rows: [{
            id: mockUUID,
            title: 'City Filtered Event',
            description: 'Event filtered by city',
            location: 'City Venue',
            address: 'City Address',
            date: '2024-12-01',
            time: '20:00',
            price: 35000,
            currency: 'COP',
            city: 'medellin',
            category: 'cultura'
          }]
        } as any)
        .mockResolvedValueOnce({ // SELECT tags for event
          rows: [{ name: 'city-filter' }]
        } as any)

      const result = await getUserFavoritesDb('user-123', { 
        city: 'medellin', // This should trigger line 562: if (city)
        page: 1, 
        limit: 20 
      })
      
      expect(result.total).toBe(1)
      expect(result.events).toHaveLength(1)
      expect(result.events[0].title).toBe('City Filtered Event')
      
      // Verify that city filter was included in WHERE clause
      const countQuery = mockQuery.mock.calls[0][0]
      expect(countQuery).toContain('c.slug = $')
      
      const countParams = mockQuery.mock.calls[0][1]
      expect(countParams).toContain('medellin')
    })

    it('should handle category filter - targets line 563 if (category) branch', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ count: '1' }] } as any) // COUNT
        .mockResolvedValueOnce({ // SELECT events
          rows: [{
            id: mockUUID,
            title: 'Sports Event',
            description: 'Event filtered by category',
            location: 'Sports Venue',
            address: 'Sports Address',
            date: '2024-12-01',
            time: '20:00',
            price: 30000,
            currency: 'COP',
            city: 'bogota',
            category: 'deportes'
          }]
        } as any)
        .mockResolvedValueOnce({ // SELECT tags for event
          rows: [{ name: 'sports' }]
        } as any)

      const result = await getUserFavoritesDb('user-123', { 
        category: 'deportes', // This should trigger line 563: if (category)
        page: 1, 
        limit: 20 
      })
      
      expect(result.total).toBe(1)
      expect(result.events).toHaveLength(1)
      expect(result.events[0].category).toBe('deportes')
      
      // Verify that category filter was included in WHERE clause
      const countQuery = mockQuery.mock.calls[0][0]
      expect(countQuery).toContain('ct.slug = $')
      
      const countParams = mockQuery.mock.calls[0][1]
      expect(countParams).toContain('deportes')
    })
  })

  describe('isEventFavoritedDb', () => {
    it('should return false when not favorited', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ exists: false }] } as any)

      const result = await isEventFavoritedDb('user-123', 'event-123')
      expect(result).toBe(false)
    })

    it('should return true when favorited', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ exists: true }] } as any)

      const result = await isEventFavoritedDb('user-123', 'event-123')
      expect(result).toBe(true)
    })

    it('should return false on database error', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Database error'))

      const result = await isEventFavoritedDb('user-123', 'event-123')
      expect(result).toBe(false)
    })
  })

  describe('listEventsDb', () => {
    it('should handle empty count result triggering || "0" fallback', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [] } as any) // COUNT query returns empty rows - triggers || '0'
        .mockResolvedValueOnce({ rows: [] } as any) // SELECT events query returns empty

      const result = await listEventsDb({ page: 1, limit: 20 })
      
      expect(result.total).toBe(0) // Should use '0' from fallback
      expect(result.events).toEqual([])
    })

    it('should use price sorting with desc order - targets line 82 branch', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ count: '1' }] } as any) // COUNT
        .mockResolvedValueOnce({ // SELECT events
          rows: [{
            id: mockUUID,
            title: 'Price Event',
            description: 'Description',
            location: 'Venue',
            address: 'Address',
            price: 50000,
            currency: 'COP',
            date: '2024-12-01',
            time: '20:00',
            city: 'bogota',
            category: 'musica'
          }]
        } as any)

      const result = await listEventsDb({ sort: 'price', order: 'desc', page: 1, limit: 20 })
      
      expect(result.total).toBe(1)
      expect(result.events).toHaveLength(1)
      
      // Verify the ORDER BY clause includes price_cents DESC
      const selectQuery = mockQuery.mock.calls[1][0]
      expect(selectQuery).toContain('ORDER BY e.price_cents DESC')
    })

    it('should use price sorting with asc order - targets line 82 branch', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ count: '1' }] } as any) // COUNT
        .mockResolvedValueOnce({ // SELECT events
          rows: [{
            id: mockUUID,
            title: 'Price Event',
            description: 'Description',
            location: 'Venue',
            address: 'Address',
            price: 30000,
            currency: 'COP',
            date: '2024-12-01',
            time: '20:00',
            city: 'bogota',
            category: 'musica'
          }]
        } as any)

      const result = await listEventsDb({ sort: 'price', order: 'asc', page: 1, limit: 20 })
      
      expect(result.total).toBe(1)
      expect(result.events).toHaveLength(1)
      
      // Verify the ORDER BY clause includes price_cents ASC
      const selectQuery = mockQuery.mock.calls[1][0]
      expect(selectQuery).toContain('ORDER BY e.price_cents ASC')
    })
  })

  describe('getEventByLegacyIdDb', () => {
    it('should handle null location and address - targets lines 171-172', async () => {
      mockQuery.mockResolvedValueOnce({ // Event query with null location and address
        rows: [{
          id: mockUUID,
          title: 'Test Event',
          description: 'Description',
          location: null, // Will trigger line 171: r.location ?? ''
          address: null,  // Will trigger line 172: r.address ?? ''
          price: 50000,
          currency: 'COP',
          date: '2024-12-01',
          time: '20:00',
          city: 'bogota',
          category: 'musica'
        }]
      } as any)

      const result = await getEventByLegacyIdDb('bg-001')
      expect(result).not.toBeNull()
      expect(result?.location).toBe('') // Should use '' from fallback
      expect(result?.address).toBe('')  // Should use '' from fallback
    })

    it('should handle undefined location and address - targets lines 171-172', async () => {
      mockQuery.mockResolvedValueOnce({ // Event query with undefined location and address
        rows: [{
          id: mockUUID,
          title: 'Test Event',
          description: 'Description',
          // location: undefined (missing property)
          // address: undefined (missing property) 
          price: 50000,
          currency: 'COP',
          date: '2024-12-01',
          time: '20:00',
          city: 'bogota',
          category: 'musica'
        }]
      } as any)

      const result = await getEventByLegacyIdDb('bg-002')
      expect(result).not.toBeNull()
      expect(result?.location).toBe('') // Should use '' from fallback
      expect(result?.address).toBe('')  // Should use '' from fallback
    })
  })

  describe('listEventsByCityDb', () => {
    it('should return null when city not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] } as any) // City lookup fails

      const result = await listEventsByCityDb('unknown-city')
      expect(result).toBeNull()
    })

    it('should return events for valid city', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ id: 1 }] } as any) // City found
        .mockResolvedValueOnce({ // Events query
          rows: [{
            id: mockUUID,
            title: 'City Event',
            description: 'Description',
            location: 'Venue',
            address: 'Address',
            date: '2024-12-01',
            time: '20:00',
            price: 50000,
            currency: 'COP',
            category: 'musica'
          }]
        } as any)

      const result = await listEventsByCityDb('bogota')
      expect(result).not.toBeNull()
      expect(result).toHaveLength(1)
      expect(result?.[0].tags).toEqual([])
    })

    it('should handle null location and address - targets lines 210-211', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ id: 1 }] } as any) // City found
        .mockResolvedValueOnce({ // Events query with null location and address
          rows: [{
            id: mockUUID,
            title: 'City Event',
            description: 'Description',
            location: null, // Will trigger line 210: r.location ?? ''
            address: null,  // Will trigger line 211: r.address ?? ''
            date: '2024-12-01',
            time: '20:00',
            price: 50000,
            currency: 'COP',
            category: 'musica'
          }]
        } as any)

      const result = await listEventsByCityDb('bogota')
      expect(result).not.toBeNull()
      expect(result).toHaveLength(1)
      expect(result?.[0].location).toBe('') // Should use '' from fallback
      expect(result?.[0].address).toBe('')  // Should use '' from fallback
      expect(result?.[0].tags).toEqual([])
    })

    it('should handle undefined location and address - targets lines 210-211', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ id: 1 }] } as any) // City found
        .mockResolvedValueOnce({ // Events query with undefined location and address
          rows: [{
            id: mockUUID,
            title: 'City Event',
            description: 'Description',
            // location: undefined (missing property)
            // address: undefined (missing property)
            date: '2024-12-01',
            time: '20:00',
            price: 50000,
            currency: 'COP',
            category: 'musica'
          }]
        } as any)

      const result = await listEventsByCityDb('bogota')
      expect(result).not.toBeNull()
      expect(result).toHaveLength(1)
      expect(result?.[0].location).toBe('') // Should use '' from fallback
      expect(result?.[0].address).toBe('')  // Should use '' from fallback
      expect(result?.[0].tags).toEqual([])
    })
  })
})