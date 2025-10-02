import { jest } from '@jest/globals'
import { 
  listEventsDb, 
  getEventByLegacyIdDb, 
  listEventsByCityDb,
  createEventDb,
  updateEventDb,
  deleteEventDb,
  getEventByIdDb,
  listOrganizerEventsDb,
  addToFavoritesDb,
  removeFromFavoritesDb,
  getUserFavoritesDb,
  isEventFavoritedDb
} from '../src/db/repository'
import { query } from '../src/db/client'
import { mockEvents, createMockQuery } from './test-helpers/mock-database'

// Mock the database client
const mockQuery = createMockQuery()
jest.mocked(query).mockImplementation(mockQuery)

describe('Repository Functions', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('normalize function', () => {
    // We need to test the internal normalize function through public APIs
    it('should handle search queries with accents correctly', async () => {
      mockQuery.mockImplementation((sql: string, _args: any[]) => {
        if (sql.includes('SELECT COUNT(*)')) {
          return { rows: [{ count: '1' }], rowCount: 1 }
        }
        if (sql.includes('FROM events e')) {
          return { rows: [mockEvents[0]], rowCount: 1 }
        }
        return { rows: [], rowCount: 0 }
      })

      await listEventsDb({ q: 'música' })
      
      // Verify that the query was called with normalized search term
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('LIKE'),
        expect.arrayContaining([expect.stringContaining('%musica%')])
      )
    })
  })

  describe('listEventsDb', () => {
    it('should return events with basic pagination', async () => {
      mockQuery
        .mockImplementationOnce(() => ({ rows: [{ count: '5' }], rowCount: 1 }))
        .mockImplementationOnce(() => ({ rows: mockEvents.slice(0, 2), rowCount: 2 }))

      const result = await listEventsDb({ page: 1, limit: 20 })

      expect(result).toEqual({
        events: expect.arrayContaining([
          expect.objectContaining({ 
            id: mockEvents[0].id,
            title: mockEvents[0].title
          })
        ]),
        total: 5
      })
    })

    it('should filter by city', async () => {
      mockQuery
        .mockImplementationOnce(() => ({ rows: [{ count: '1' }], rowCount: 1 }))
        .mockImplementationOnce(() => ({ rows: [mockEvents[0]], rowCount: 1 }))

      const result = await listEventsDb({ city: 'bogota' })

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('c.slug = $1'),
        expect.arrayContaining(['bogota'])
      )
      expect(result.events).toHaveLength(1)
    })

    it('should filter by category', async () => {
      mockQuery
        .mockImplementationOnce(() => ({ rows: [{ count: '1' }], rowCount: 1 }))
        .mockImplementationOnce(() => ({ rows: [mockEvents[0]], rowCount: 1 }))

      await listEventsDb({ category: 'música' })

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('ct.slug = $1'),
        expect.arrayContaining(['musica'])
      )
    })

    it('should filter by search query', async () => {
      mockQuery
        .mockImplementationOnce(() => ({ rows: [{ count: '1' }], rowCount: 1 }))
        .mockImplementationOnce(() => ({ rows: [mockEvents[0]], rowCount: 1 }))

      await listEventsDb({ q: 'festival' })

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('e.title_norm LIKE'),
        expect.arrayContaining(['%festival%'])
      )
    })

    it('should filter by date range', async () => {
      mockQuery
        .mockImplementationOnce(() => ({ rows: [{ count: '1' }], rowCount: 1 }))
        .mockImplementationOnce(() => ({ rows: [mockEvents[0]], rowCount: 1 }))

      await listEventsDb({ from: '2024-07-01', to: '2024-07-31' })

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('e.starts_at::date >= $1 AND e.starts_at::date <= $2'),
        expect.arrayContaining(['2024-07-01', '2024-07-31'])
      )
    })

    it('should filter by price range', async () => {
      mockQuery
        .mockImplementationOnce(() => ({ rows: [{ count: '1' }], rowCount: 1 }))
        .mockImplementationOnce(() => ({ rows: [mockEvents[1]], rowCount: 1 }))

      await listEventsDb({ minPrice: 50000, maxPrice: 100000 })

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('e.price_cents >= $1 AND e.price_cents <= $2'),
        expect.arrayContaining([50000, 100000])
      )
    })

    it('should sort by date ascending', async () => {
      mockQuery
        .mockImplementationOnce(() => ({ rows: [{ count: '2' }], rowCount: 1 }))
        .mockImplementationOnce(() => ({ rows: mockEvents, rowCount: 2 }))

      await listEventsDb({ sort: 'date', order: 'asc' })

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY e.starts_at ASC, e.id ASC'),
        expect.any(Array)
      )
    })

    it('should sort by price descending', async () => {
      mockQuery
        .mockImplementationOnce(() => ({ rows: [{ count: '2' }], rowCount: 1 }))
        .mockImplementationOnce(() => ({ rows: mockEvents, rowCount: 2 }))

      await listEventsDb({ sort: 'price', order: 'desc' })

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY e.price_cents DESC, e.id ASC'),
        expect.any(Array)
      )
    })

    it('should handle pagination correctly', async () => {
      mockQuery
        .mockImplementationOnce(() => ({ rows: [{ count: '10' }], rowCount: 1 }))
        .mockImplementationOnce(() => ({ rows: mockEvents, rowCount: 2 }))

      await listEventsDb({ page: 2, limit: 5 })

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT 5 OFFSET 5'),
        expect.any(Array)
      )
    })
  })

  describe('getEventByLegacyIdDb', () => {
    it('should return event for valid legacy ID', async () => {
      const mockEventRow = {
        id: 'some-uuid',
        title: 'Test Event',
        description: 'Test Description',
        location: 'Test Location',
        address: 'Test Address',
        price: 50000,
        currency: 'COP',
        utc_timestamp: '2024-12-02T01:00:00.000Z',
        category: 'Música',
        city: 'bogota',
        image: 'test.jpg'
      }

      mockQuery.mockImplementationOnce(() => ({ rows: [mockEventRow], rowCount: 1 }))

      const result = await getEventByLegacyIdDb('bg-001')

      expect(result).toEqual({
        id: 'some-uuid',
        title: 'Test Event',
        description: 'Test Description',
        utcTimestamp: '2024-12-02T01:00:00.000Z',
        location: 'Test Location',
        address: 'Test Address',
        category: 'Música',
        city: 'bogota',
        price: 50000,
        currency: 'COP',
        image: 'test.jpg',
        organizer: '',
        tags: [],
        status: 'active',
        created_by: undefined
      })
    })

    it('should return null for non-existent legacy ID', async () => {
      mockQuery.mockImplementationOnce(() => ({ rows: [], rowCount: 0 }))

      const result = await getEventByLegacyIdDb('non-existent')
      expect(result).toBeNull()
    })

    it('should handle null values from database (lines 174-179)', async () => {
      // Mock database returning null values for location, address, and image
      const mockEventRowWithNulls = {
        id: 'some-uuid',
        title: 'Test Event',
        description: 'Test Description',
        utc_timestamp: '2024-12-02T01:00:00.000Z',
        location: null,  // This triggers line 174: location: r.location ?? ''
        address: null,   // This triggers line 175: address: r.address ?? ''
        category: 'Música',
        price: 50000,
        currency: 'COP',
        image: null      // This triggers line 179: image: r.image ?? ''
      }

      mockQuery.mockImplementationOnce(() => ({ rows: [mockEventRowWithNulls], rowCount: 1 }))

      const result = await getEventByLegacyIdDb('bg-001')

      expect(result).toEqual({
        id: 'some-uuid',
        title: 'Test Event',
        description: 'Test Description',
        utcTimestamp: '2024-12-02T01:00:00.000Z',
        location: '',  // Should be empty string due to null coalescing
        address: '',   // Should be empty string due to null coalescing
        category: 'Música',
        price: 50000,
        currency: 'COP',
        image: '',     // Should be empty string due to null coalescing
        organizer: '',
        tags: [],
        status: 'active',
        created_by: undefined
      })
      // This test should cover lines 174, 175, and 179
    })
  })

  describe('listEventsByCityDb', () => {
    it('should return events for valid city', async () => {
      mockQuery
        .mockImplementationOnce(() => ({ rows: [{ id: 1 }], rowCount: 1 })) // City exists
        .mockImplementationOnce(() => ({ rows: [mockEvents[0]], rowCount: 1 })) // Events query

      const result = await listEventsByCityDb('bogota')

      expect(result).toHaveLength(1)
      expect(result![0]).toEqual(expect.objectContaining({
        title: mockEvents[0].title
      }))
    })

    it('should return null for invalid city', async () => {
      mockQuery.mockImplementationOnce(() => ({ rows: [], rowCount: 0 }))

      const result = await listEventsByCityDb('invalid-city')
      expect(result).toBeNull()
    })

    it('should handle null values from database in listEventsByCityDb (lines 214-219)', async () => {
      // Mock database returning null values for location, address, and image
      const mockEventRowWithNulls = {
        id: 'some-uuid',
        title: 'Test Event',
        description: 'Test Description',
        utc_timestamp: '2024-12-02T01:00:00.000Z',
        location: null,  // This triggers line 214: location: r.location ?? ''
        address: null,   // This triggers line 215: address: r.address ?? ''
        category: 'Música',
        price: 50000,
        currency: 'COP',
        image: null      // This triggers line 219: image: r.image ?? ''
      }

      mockQuery
        .mockImplementationOnce(() => ({ rows: [{ id: 1 }], rowCount: 1 })) // City exists
        .mockImplementationOnce(() => ({ rows: [mockEventRowWithNulls], rowCount: 1 })) // Events query with nulls

      const result = await listEventsByCityDb('bogota')

      expect(result).toHaveLength(1)
      expect(result![0]).toEqual(expect.objectContaining({
        id: 'some-uuid',
        title: 'Test Event',
        description: 'Test Description',
        utcTimestamp: '2024-12-02T01:00:00.000Z',
        location: '',  // Should be empty string due to null coalescing
        address: '',   // Should be empty string due to null coalescing
        category: 'Música',
        price: 50000,
        currency: 'COP',
        image: '',     // Should be empty string due to null coalescing
        organizer: '',
        tags: [],
        status: 'active',
        created_by: undefined
      }))
      // This test should cover lines 214, 215, and 219 in listEventsByCityDb
    })
  })

  describe('createEventDb', () => {
    const validEventData = {
      title: 'New Test Event',
      description: 'Test event description',
      date: '2024-12-01',
      time: '20:00',
      location: 'Test Venue',
      address: 'Test Address',
      category: 'musica',
      city: 'bogota',
      price: 50000,
      currency: 'COP',
      organizer: 'Test Organizer',
      capacity: 100,
      tags: ['test', 'music']
    }

    it('should create event successfully', async () => {
      // Mock city lookup
      mockQuery.mockImplementationOnce(() => ({ rows: [{ id: 1 }], rowCount: 1 }))
      // Mock category lookup
      mockQuery.mockImplementationOnce(() => ({ rows: [{ id: 1 }], rowCount: 1 }))
      // Mock event insertion
      mockQuery.mockImplementationOnce(() => ({ rows: [], rowCount: 1 }))
      // Mock tag insertion and lookup (2 tags)
      mockQuery.mockImplementationOnce(() => ({ rows: [], rowCount: 1 }))
      mockQuery.mockImplementationOnce(() => ({ rows: [{ id: 1 }], rowCount: 1 }))
      mockQuery.mockImplementationOnce(() => ({ rows: [], rowCount: 1 }))
      mockQuery.mockImplementationOnce(() => ({ rows: [], rowCount: 1 }))
      mockQuery.mockImplementationOnce(() => ({ rows: [{ id: 2 }], rowCount: 1 }))
      mockQuery.mockImplementationOnce(() => ({ rows: [], rowCount: 1 }))
      // Mock getEventByIdDb
      mockQuery.mockImplementationOnce(() => ({ rows: [mockEvents[0]], rowCount: 1 }))
      mockQuery.mockImplementationOnce(() => ({ rows: [{ name: 'test' }, { name: 'music' }], rowCount: 2 }))

      const result = await createEventDb(validEventData, 'organizer-id')

      expect(result).toEqual(expect.objectContaining({
        title: mockEvents[0].title
      }))
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO events'),
        expect.any(Array)
      )
    })

    it('should throw error for invalid city', async () => {
      mockQuery.mockImplementationOnce(() => ({ rows: [], rowCount: 0 }))

      await expect(createEventDb(validEventData, 'organizer-id'))
        .rejects.toThrow('Ciudad no encontrada')
    })

    it('should throw error for invalid category', async () => {
      mockQuery
        .mockImplementationOnce(() => ({ rows: [{ id: 1 }], rowCount: 1 })) // Valid city
        .mockImplementationOnce(() => ({ rows: [], rowCount: 0 })) // Invalid category

      await expect(createEventDb(validEventData, 'organizer-id'))
        .rejects.toThrow('Categoría no encontrada')
    })

    it('should throw error if event cannot be retrieved after creation', async () => {
      const eventDataWithoutTags = { ...validEventData, tags: [] }
      
      // Mock city lookup
      mockQuery.mockImplementationOnce(() => ({ rows: [{ id: 1 }], rowCount: 1 }))
      // Mock category lookup
      mockQuery.mockImplementationOnce(() => ({ rows: [{ id: 1 }], rowCount: 1 }))
      // Mock event insertion
      mockQuery.mockImplementationOnce(() => ({ rows: [], rowCount: 1 }))
      // Mock getEventByIdDb first query returning null (this triggers line 295)
      mockQuery.mockImplementationOnce(() => ({ rows: [], rowCount: 0 }))

      await expect(createEventDb(eventDataWithoutTags, 'organizer-id'))
        .rejects.toThrow('Error al crear el evento')
    })

    it('should handle undefined tags parameter using default value (line 253)', async () => {
      // Create event data WITHOUT tags property to trigger default value assignment
      const { tags, ...eventDataWithoutTagsProperty } = validEventData
      
      // Mock city lookup
      mockQuery.mockImplementationOnce(() => ({ rows: [{ id: 1 }], rowCount: 1 }))
      // Mock category lookup
      mockQuery.mockImplementationOnce(() => ({ rows: [{ id: 1 }], rowCount: 1 }))
      // Mock event insertion
      mockQuery.mockImplementationOnce(() => ({ rows: [], rowCount: 1 }))
      // Mock getEventByIdDb (no tag queries since tags = [])
      mockQuery.mockImplementationOnce(() => ({ rows: [mockEvents[0]], rowCount: 1 }))
      mockQuery.mockImplementationOnce(() => ({ rows: [], rowCount: 0 }))

      const result = await createEventDb(eventDataWithoutTagsProperty, 'organizer-id')

      expect(result).toEqual(expect.objectContaining({
        title: mockEvents[0].title,
        tags: [] // Should be empty array due to default value
      }))
      // This test should cover line 253: tags = [] (default parameter value)
    })
  })

  describe('updateEventDb', () => {
    const updateData = {
      id: 'test-event-id',
      title: 'Updated Title',
      price: 75000
    }

    it('should update event successfully for owner', async () => {
      // Mock ownership check
      mockQuery.mockImplementationOnce(() => ({ 
        rows: [{ created_by: 'organizer-id', user_role: 'organizer' }], 
        rowCount: 1 
      }))
      // Mock update query
      mockQuery.mockImplementationOnce(() => ({ rows: [], rowCount: 1 }))
      // Mock getEventByIdDb
      mockQuery.mockImplementationOnce(() => ({ rows: [mockEvents[0]], rowCount: 1 }))
      mockQuery.mockImplementationOnce(() => ({ rows: [], rowCount: 0 }))

      const result = await updateEventDb(updateData, 'organizer-id')

      expect(result).toEqual(expect.objectContaining({
        title: mockEvents[0].title
      }))
    })

    it('should update event successfully for admin', async () => {
      // Mock ownership check
      mockQuery.mockImplementationOnce(() => ({ 
        rows: [{ created_by: 'other-user', user_role: 'admin' }], 
        rowCount: 1 
      }))
      // Mock update query
      mockQuery.mockImplementationOnce(() => ({ rows: [], rowCount: 1 }))
      // Mock getEventByIdDb
      mockQuery.mockImplementationOnce(() => ({ rows: [mockEvents[0]], rowCount: 1 }))
      mockQuery.mockImplementationOnce(() => ({ rows: [], rowCount: 0 }))

      const result = await updateEventDb(updateData, 'admin-id')

      expect(result).not.toBeNull()
    })

    it('should return null for non-existent event', async () => {
      mockQuery.mockImplementationOnce(() => ({ rows: [], rowCount: 0 }))

      const result = await updateEventDb(updateData, 'organizer-id')
      expect(result).toBeNull()
    })

    it('should throw error for unauthorized user', async () => {
      mockQuery.mockImplementationOnce(() => ({ 
        rows: [{ created_by: 'other-user', user_role: 'organizer' }], 
        rowCount: 1 
      }))

      await expect(updateEventDb(updateData, 'wrong-user'))
        .rejects.toThrow('No tienes permiso para editar este evento')
    })

    it('should update event description field', async () => {
      const updateDataWithDescription = {
        id: 'test-event-id',
        description: 'Updated description'
      }

      // Mock ownership check
      mockQuery.mockImplementationOnce(() => ({ 
        rows: [{ created_by: 'organizer-id', user_role: 'organizer' }], 
        rowCount: 1 
      }))
      // Mock update query (covers lines 333-334)
      mockQuery.mockImplementationOnce(() => ({ rows: [], rowCount: 1 }))
      // Mock getEventByIdDb
      mockQuery.mockImplementationOnce(() => ({ rows: [mockEvents[0]], rowCount: 1 }))
      mockQuery.mockImplementationOnce(() => ({ rows: [], rowCount: 0 }))

      const result = await updateEventDb(updateDataWithDescription, 'organizer-id')

      expect(result).not.toBeNull()
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('description = $1'),
        expect.arrayContaining(['Updated description', 'test-event-id'])
      )
    })

    it('should update event location field', async () => {
      const updateDataWithLocation = {
        id: 'test-event-id',
        location: 'Updated venue'
      }

      // Mock ownership check
      mockQuery.mockImplementationOnce(() => ({ 
        rows: [{ created_by: 'organizer-id', user_role: 'organizer' }], 
        rowCount: 1 
      }))
      // Mock update query (covers lines 337-338)
      mockQuery.mockImplementationOnce(() => ({ rows: [], rowCount: 1 }))
      // Mock getEventByIdDb
      mockQuery.mockImplementationOnce(() => ({ rows: [mockEvents[0]], rowCount: 1 }))
      mockQuery.mockImplementationOnce(() => ({ rows: [], rowCount: 0 }))

      const result = await updateEventDb(updateDataWithLocation, 'organizer-id')

      expect(result).not.toBeNull()
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('venue = $1'),
        expect.arrayContaining(['Updated venue', 'test-event-id'])
      )
    })

    it('should update event address field', async () => {
      const updateDataWithAddress = {
        id: 'test-event-id',
        address: 'Updated address'
      }

      // Mock ownership check
      mockQuery.mockImplementationOnce(() => ({ 
        rows: [{ created_by: 'organizer-id', user_role: 'organizer' }], 
        rowCount: 1 
      }))
      // Mock update query (covers lines 341-342)
      mockQuery.mockImplementationOnce(() => ({ rows: [], rowCount: 1 }))
      // Mock getEventByIdDb
      mockQuery.mockImplementationOnce(() => ({ rows: [mockEvents[0]], rowCount: 1 }))
      mockQuery.mockImplementationOnce(() => ({ rows: [], rowCount: 0 }))

      const result = await updateEventDb(updateDataWithAddress, 'organizer-id')

      expect(result).not.toBeNull()
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('address = $1'),
        expect.arrayContaining(['Updated address', 'test-event-id'])
      )
    })

    it('should update event currency field', async () => {
      const updateDataWithCurrency = {
        id: 'test-event-id',
        currency: 'USD'
      }

      // Mock ownership check
      mockQuery.mockImplementationOnce(() => ({ 
        rows: [{ created_by: 'organizer-id', user_role: 'organizer' }], 
        rowCount: 1 
      }))
      // Mock update query (covers lines 349-350)
      mockQuery.mockImplementationOnce(() => ({ rows: [], rowCount: 1 }))
      // Mock getEventByIdDb
      mockQuery.mockImplementationOnce(() => ({ rows: [mockEvents[0]], rowCount: 1 }))
      mockQuery.mockImplementationOnce(() => ({ rows: [], rowCount: 0 }))

      const result = await updateEventDb(updateDataWithCurrency, 'organizer-id')

      expect(result).not.toBeNull()
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('currency = $1'),
        expect.arrayContaining(['USD', 'test-event-id'])
      )
    })

    it('should update event utcTimestamp field', async () => {
      const updateDataWithDateTime = {
        id: 'test-event-id',
        utcTimestamp: '2024-12-25T23:30:00.000Z'
      }

      // Mock ownership check
      mockQuery.mockImplementationOnce(() => ({ 
        rows: [{ created_by: 'organizer-id', user_role: 'organizer' }], 
        rowCount: 1 
      }))
      // Mock update query (covers lines 353-354)
      mockQuery.mockImplementationOnce(() => ({ rows: [], rowCount: 1 }))
      // Mock getEventByIdDb
      mockQuery.mockImplementationOnce(() => ({ rows: [mockEvents[0]], rowCount: 1 }))
      mockQuery.mockImplementationOnce(() => ({ rows: [], rowCount: 0 }))

      const result = await updateEventDb(updateDataWithDateTime, 'organizer-id')

      expect(result).not.toBeNull()
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('starts_at = $1'),
        expect.arrayContaining(['2024-12-25T23:30:00.000Z', 'test-event-id'])
      )
    })

    it('should update event city field successfully', async () => {
      const updateDataWithCity = {
        id: 'test-event-id',
        city: 'medellin'
      }

      // Mock ownership check
      mockQuery.mockImplementationOnce(() => ({ 
        rows: [{ created_by: 'organizer-id', user_role: 'organizer' }], 
        rowCount: 1 
      }))
      // Mock city lookup (covers lines 358, 362-363)
      mockQuery.mockImplementationOnce(() => ({ rows: [{ id: 2 }], rowCount: 1 }))
      // Mock update query
      mockQuery.mockImplementationOnce(() => ({ rows: [], rowCount: 1 }))
      // Mock getEventByIdDb
      mockQuery.mockImplementationOnce(() => ({ rows: [mockEvents[0]], rowCount: 1 }))
      mockQuery.mockImplementationOnce(() => ({ rows: [], rowCount: 0 }))

      const result = await updateEventDb(updateDataWithCity, 'organizer-id')

      expect(result).not.toBeNull()
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT id FROM cities WHERE slug = $1'),
        ['medellin']
      )
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('city_id = $1'),
        expect.arrayContaining([2, 'test-event-id'])
      )
    })

    it('should throw error for invalid city in update', async () => {
      const updateDataWithInvalidCity = {
        id: 'test-event-id',
        city: 'invalid-city'
      }

      // Mock ownership check
      mockQuery.mockImplementationOnce(() => ({ 
        rows: [{ created_by: 'organizer-id', user_role: 'organizer' }], 
        rowCount: 1 
      }))
      // Mock city lookup returning no results (covers lines 359-360)
      mockQuery.mockImplementationOnce(() => ({ rows: [], rowCount: 0 }))

      await expect(updateEventDb(updateDataWithInvalidCity, 'organizer-id'))
        .rejects.toThrow('Ciudad no encontrada')
    })

    it('should update event category field successfully', async () => {
      const updateDataWithCategory = {
        id: 'test-event-id',
        category: 'deportes'
      }

      // Mock ownership check
      mockQuery.mockImplementationOnce(() => ({ 
        rows: [{ created_by: 'organizer-id', user_role: 'organizer' }], 
        rowCount: 1 
      }))
      // Mock category lookup (covers lines 367, 371-372)
      mockQuery.mockImplementationOnce(() => ({ rows: [{ id: 3 }], rowCount: 1 }))
      // Mock update query
      mockQuery.mockImplementationOnce(() => ({ rows: [], rowCount: 1 }))
      // Mock getEventByIdDb
      mockQuery.mockImplementationOnce(() => ({ rows: [mockEvents[0]], rowCount: 1 }))
      mockQuery.mockImplementationOnce(() => ({ rows: [], rowCount: 0 }))

      const result = await updateEventDb(updateDataWithCategory, 'organizer-id')

      expect(result).not.toBeNull()
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT id FROM categories WHERE slug = $1'),
        ['deportes']
      )
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('category_id = $1'),
        expect.arrayContaining([3, 'test-event-id'])
      )
    })

    it('should throw error for invalid category in update', async () => {
      const updateDataWithInvalidCategory = {
        id: 'test-event-id',
        category: 'invalid-category'
      }

      // Mock ownership check
      mockQuery.mockImplementationOnce(() => ({ 
        rows: [{ created_by: 'organizer-id', user_role: 'organizer' }], 
        rowCount: 1 
      }))
      // Mock category lookup returning no results (covers lines 368-369)
      mockQuery.mockImplementationOnce(() => ({ rows: [], rowCount: 0 }))

      await expect(updateEventDb(updateDataWithInvalidCategory, 'organizer-id'))
        .rejects.toThrow('Categoría no encontrada')
    })

    it('should update event image field', async () => {
      const updateDataWithImage = {
        id: 'test-event-id',
        image: 'https://example.com/new-image.jpg'
      }

      // Mock ownership check
      mockQuery.mockImplementationOnce(() => ({ 
        rows: [{ created_by: 'organizer-id', user_role: 'organizer' }], 
        rowCount: 1 
      }))
      // Mock update query (covers lines 375-376)
      mockQuery.mockImplementationOnce(() => ({ rows: [], rowCount: 1 }))
      // Mock getEventByIdDb
      mockQuery.mockImplementationOnce(() => ({ rows: [mockEvents[0]], rowCount: 1 }))
      mockQuery.mockImplementationOnce(() => ({ rows: [], rowCount: 0 }))

      const result = await updateEventDb(updateDataWithImage, 'organizer-id')

      expect(result).not.toBeNull()
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('image = $1'),
        expect.arrayContaining(['https://example.com/new-image.jpg', 'test-event-id'])
      )
    })

    it('should update event tags with empty array', async () => {
      const updateDataWithEmptyTags = {
        id: 'test-event-id',
        tags: []
      }

      // Mock ownership check
      mockQuery.mockImplementationOnce(() => ({ 
        rows: [{ created_by: 'organizer-id', user_role: 'organizer' }], 
        rowCount: 1 
      }))
      // Mock delete existing tags (covers line 388)
      mockQuery.mockImplementationOnce(() => ({ rows: [], rowCount: 1 }))
      // Mock getEventByIdDb
      mockQuery.mockImplementationOnce(() => ({ rows: [mockEvents[0]], rowCount: 1 }))
      mockQuery.mockImplementationOnce(() => ({ rows: [], rowCount: 0 }))

      const result = await updateEventDb(updateDataWithEmptyTags, 'organizer-id')

      expect(result).not.toBeNull()
      expect(mockQuery).toHaveBeenCalledWith(
        'DELETE FROM event_tags WHERE event_id = $1',
        ['test-event-id']
      )
    })

    it('should update event tags with new tags', async () => {
      const updateDataWithTags = {
        id: 'test-event-id',
        tags: ['rock', 'festival']
      }

      // Mock ownership check
      mockQuery.mockImplementationOnce(() => ({ 
        rows: [{ created_by: 'organizer-id', user_role: 'organizer' }], 
        rowCount: 1 
      }))
      // Mock delete existing tags (covers line 388)
      mockQuery.mockImplementationOnce(() => ({ rows: [], rowCount: 1 }))
      // Mock tag insertion and lookup for 'rock' (covers lines 392-398)
      mockQuery.mockImplementationOnce(() => ({ rows: [], rowCount: 1 }))
      mockQuery.mockImplementationOnce(() => ({ rows: [{ id: 1 }], rowCount: 1 }))
      mockQuery.mockImplementationOnce(() => ({ rows: [], rowCount: 1 }))
      // Mock tag insertion and lookup for 'festival'
      mockQuery.mockImplementationOnce(() => ({ rows: [], rowCount: 1 }))
      mockQuery.mockImplementationOnce(() => ({ rows: [{ id: 2 }], rowCount: 1 }))
      mockQuery.mockImplementationOnce(() => ({ rows: [], rowCount: 1 }))
      // Mock getEventByIdDb
      mockQuery.mockImplementationOnce(() => ({ rows: [mockEvents[0]], rowCount: 1 }))
      mockQuery.mockImplementationOnce(() => ({ rows: [{ name: 'rock' }, { name: 'festival' }], rowCount: 2 }))

      const result = await updateEventDb(updateDataWithTags, 'organizer-id')

      expect(result).not.toBeNull()
      expect(mockQuery).toHaveBeenCalledWith(
        'DELETE FROM event_tags WHERE event_id = $1',
        ['test-event-id']
      )
      expect(mockQuery).toHaveBeenCalledWith(
        'INSERT INTO tags (name) VALUES ($1) ON CONFLICT (name) DO NOTHING',
        ['rock']
      )
      expect(mockQuery).toHaveBeenCalledWith(
        'INSERT INTO tags (name) VALUES ($1) ON CONFLICT (name) DO NOTHING',
        ['festival']
      )
    })
  })

  describe('deleteEventDb', () => {
    it('should delete event successfully for owner', async () => {
      mockQuery
        .mockImplementationOnce(() => ({ 
          rows: [{ created_by: 'organizer-id', user_role: 'organizer' }], 
          rowCount: 1 
        }))
        .mockImplementationOnce(() => ({ rows: [], rowCount: 1 }))

      const result = await deleteEventDb('test-event-id', 'organizer-id')
      expect(result).toBe(true)
    })

    it('should return false for non-existent event', async () => {
      mockQuery.mockImplementationOnce(() => ({ rows: [], rowCount: 0 }))

      const result = await deleteEventDb('non-existent', 'organizer-id')
      expect(result).toBe(false)
    })

    it('should throw error for unauthorized user', async () => {
      mockQuery.mockImplementationOnce(() => ({ 
        rows: [{ created_by: 'other-user', user_role: 'organizer' }], 
        rowCount: 1 
      }))

      await expect(deleteEventDb('test-event-id', 'wrong-user'))
        .rejects.toThrow('No tienes permiso para eliminar este evento')
    })

    it('should handle null rowCount from database (line 433)', async () => {
      // Mock ownership check
      mockQuery.mockImplementationOnce(() => ({ 
        rows: [{ created_by: 'organizer-id', user_role: 'organizer' }], 
        rowCount: 1 
      }))
      // Mock DELETE query returning null rowCount (triggers line 433: result.rowCount ?? 0)
      mockQuery.mockImplementationOnce(() => ({ rows: [], rowCount: null }))

      const result = await deleteEventDb('test-event-id', 'organizer-id')
      
      // Should return false since (null ?? 0) > 0 is false
      expect(result).toBe(false)
      // This test should cover line 433: return (result.rowCount ?? 0) > 0
    })
  })

  describe('getEventByIdDb', () => {
    it('should return event with tags', async () => {
      const mockEventRow = mockEvents[0]
      mockQuery
        .mockImplementationOnce(() => ({ rows: [mockEventRow], rowCount: 1 }))
        .mockImplementationOnce(() => ({ rows: [{ name: 'rock' }, { name: 'festival' }], rowCount: 2 }))

      const result = await getEventByIdDb('test-event-id')

      expect(result).toEqual(expect.objectContaining({
        title: mockEventRow.title,
        tags: ['rock', 'festival']
      }))
    })

    it('should return null for non-existent event', async () => {
      mockQuery.mockImplementationOnce(() => ({ rows: [], rowCount: 0 }))

      const result = await getEventByIdDb('non-existent')
      expect(result).toBeNull()
    })

    it('should handle null values from database in getEventByIdDb (lines 471-476)', async () => {
      // Mock database returning null values for location, address, and image
      const mockEventRowWithNulls = {
        id: 'some-uuid',
        title: 'Test Event',
        description: 'Test Description',
        utc_timestamp: '2024-12-02T01:00:00.000Z',
        location: null,  // This triggers line 471: location: r.location ?? ''
        address: null,   // This triggers line 472: address: r.address ?? ''
        category: 'Música',
        price: 50000,
        currency: 'COP',
        image: null      // This triggers line 476: image: r.image ?? ''
      }

      mockQuery
        .mockImplementationOnce(() => ({ rows: [mockEventRowWithNulls], rowCount: 1 })) // Event query
        .mockImplementationOnce(() => ({ rows: [{ name: 'rock' }], rowCount: 1 })) // Tags query

      const result = await getEventByIdDb('test-event-id')

      expect(result).toEqual(expect.objectContaining({
        id: 'some-uuid',
        title: 'Test Event',
        description: 'Test Description',
        utcTimestamp: '2024-12-02T01:00:00.000Z',
        location: '',  // Should be empty string due to null coalescing
        address: '',   // Should be empty string due to null coalescing
        category: 'Música',
        price: 50000,
        currency: 'COP',
        image: '',     // Should be empty string due to null coalescing
        organizer: '',
        tags: ['rock'],
        status: 'active',
        created_by: undefined
      }))
      // This test should cover lines 471, 472, and 476 in getEventByIdDb
    })
  })

  describe('Favorites functionality', () => {
    describe('addToFavoritesDb', () => {
      it('should add event to favorites successfully', async () => {
        mockQuery.mockImplementationOnce(() => ({ rows: [], rowCount: 1 }))

        const result = await addToFavoritesDb('user-id', 'event-id')
        expect(result).toBe(true)
      })

      it('should handle database errors gracefully', async () => {
        mockQuery.mockImplementationOnce(() => { throw new Error('DB Error') })

        const result = await addToFavoritesDb('user-id', 'event-id')
        expect(result).toBe(false)
      })
    })

    describe('removeFromFavoritesDb', () => {
      it('should remove event from favorites successfully', async () => {
        mockQuery.mockImplementationOnce(() => ({ rows: [], rowCount: 1 }))

        const result = await removeFromFavoritesDb('user-id', 'event-id')
        expect(result).toBe(true)
      })

      it('should return false when favorite not found', async () => {
        mockQuery.mockImplementationOnce(() => ({ rows: [], rowCount: 0 }))

        const result = await removeFromFavoritesDb('user-id', 'event-id')
        expect(result).toBe(false)
      })

      it('should return false when database error occurs', async () => {
        mockQuery.mockImplementationOnce(() => { throw new Error('Database error') })

        const result = await removeFromFavoritesDb('user-id', 'event-id')
        expect(result).toBe(false)
      })
    })

    describe('getUserFavoritesDb', () => {
      it('should return user favorites with pagination', async () => {
        mockQuery
          .mockImplementationOnce(() => ({ rows: [{ count: '2' }], rowCount: 1 }))
          .mockImplementationOnce(() => ({ rows: mockEvents.slice(0, 2), rowCount: 2 }))
          .mockImplementationOnce(() => ({ rows: [{ name: 'tag1' }], rowCount: 1 }))
          .mockImplementationOnce(() => ({ rows: [{ name: 'tag2' }], rowCount: 1 }))

        const result = await getUserFavoritesDb('user-id', { page: 1, limit: 20 })

        expect(result.events).toHaveLength(2)
        expect(result.total).toBe(2)
      })

      it('should return user favorites with search query', async () => {
        mockQuery
          .mockImplementationOnce(() => ({ rows: [{ count: '1' }], rowCount: 1 }))
          .mockImplementationOnce(() => ({ rows: [mockEvents[0]], rowCount: 1 }))
          .mockImplementationOnce(() => ({ rows: [{ name: 'rock' }], rowCount: 1 }))

        const result = await getUserFavoritesDb('user-id', { q: 'concert' })

        expect(result.events).toHaveLength(1)
        expect(result.total).toBe(1)
        expect(mockQuery).toHaveBeenCalledWith(
          expect.stringContaining('f.user_id = $1'),
          expect.arrayContaining(['user-id', '%concert%'])
        )
        expect(mockQuery).toHaveBeenCalledWith(
          expect.stringMatching(/title_norm LIKE.*description_norm LIKE.*venue_norm LIKE.*EXISTS/s),
          expect.anything()
        )
      })

      it('should return user favorites with city filter (line 611)', async () => {
        mockQuery
          .mockImplementationOnce(() => ({ rows: [{ count: '1' }], rowCount: 1 }))
          .mockImplementationOnce(() => ({ rows: [mockEvents[0]], rowCount: 1 }))
          .mockImplementationOnce(() => ({ rows: [{ name: 'rock' }], rowCount: 1 }))

        const result = await getUserFavoritesDb('user-id', { city: 'bogota' })

        expect(result.events).toHaveLength(1)
        expect(result.total).toBe(1)
        expect(mockQuery).toHaveBeenCalledWith(
          expect.stringContaining('f.user_id = $1'),
          expect.arrayContaining(['user-id', 'bogota'])
        )
        expect(mockQuery).toHaveBeenCalledWith(
          expect.stringContaining('c.slug = $2'),
          expect.anything()
        )
        // This test should cover line 611: if (city) { where.push(`c.slug = $${i++}`); args.push(city) }
      })

      it('should return user favorites with category filter (line 612)', async () => {
        mockQuery
          .mockImplementationOnce(() => ({ rows: [{ count: '1' }], rowCount: 1 }))
          .mockImplementationOnce(() => ({ rows: [mockEvents[0]], rowCount: 1 }))
          .mockImplementationOnce(() => ({ rows: [{ name: 'rock' }], rowCount: 1 }))

        const result = await getUserFavoritesDb('user-id', { category: 'música' })

        expect(result.events).toHaveLength(1)
        expect(result.total).toBe(1)
        expect(mockQuery).toHaveBeenCalledWith(
          expect.stringContaining('f.user_id = $1'),
          expect.arrayContaining(['user-id', 'musica']) // normalized category
        )
        expect(mockQuery).toHaveBeenCalledWith(
          expect.stringContaining('ct.slug = $2'),
          expect.anything()
        )
        // This test should cover line 612: if (category) { where.push(`ct.slug = $${i++}`); args.push(normalize(category)) }
      })

      it('should return user favorites with from date filter (line 626)', async () => {
        mockQuery
          .mockImplementationOnce(() => ({ rows: [{ count: '1' }], rowCount: 1 }))
          .mockImplementationOnce(() => ({ rows: [mockEvents[0]], rowCount: 1 }))
          .mockImplementationOnce(() => ({ rows: [{ name: 'rock' }], rowCount: 1 }))

        const result = await getUserFavoritesDb('user-id', { from: '2024-12-01' })

        expect(result.events).toHaveLength(1)
        expect(result.total).toBe(1)
        expect(mockQuery).toHaveBeenCalledWith(
          expect.stringContaining('f.user_id = $1'),
          expect.arrayContaining(['user-id', '2024-12-01'])
        )
        expect(mockQuery).toHaveBeenCalledWith(
          expect.stringContaining('e.starts_at::date >= $2'),
          expect.anything()
        )
        // This test should cover line 626: if (from) { where.push(`e.starts_at::date >= $${i++}`); args.push(from) }
      })

      it('should return user favorites with to date filter (line 627)', async () => {
        mockQuery
          .mockImplementationOnce(() => ({ rows: [{ count: '1' }], rowCount: 1 }))
          .mockImplementationOnce(() => ({ rows: [mockEvents[0]], rowCount: 1 }))
          .mockImplementationOnce(() => ({ rows: [{ name: 'rock' }], rowCount: 1 }))

        const result = await getUserFavoritesDb('user-id', { to: '2024-12-31' })

        expect(result.events).toHaveLength(1)
        expect(result.total).toBe(1)
        expect(mockQuery).toHaveBeenCalledWith(
          expect.stringContaining('f.user_id = $1'),
          expect.arrayContaining(['user-id', '2024-12-31'])
        )
        expect(mockQuery).toHaveBeenCalledWith(
          expect.stringContaining('e.starts_at::date <= $2'),
          expect.anything()
        )
        // This test should cover line 627: if (to) { where.push(`e.starts_at::date <= $${i++}`); args.push(to) }
      })

      it('should return user favorites with minPrice filter (line 628)', async () => {
        mockQuery
          .mockImplementationOnce(() => ({ rows: [{ count: '1' }], rowCount: 1 }))
          .mockImplementationOnce(() => ({ rows: [mockEvents[0]], rowCount: 1 }))
          .mockImplementationOnce(() => ({ rows: [{ name: 'rock' }], rowCount: 1 }))

        const result = await getUserFavoritesDb('user-id', { minPrice: 50000 })

        expect(result.events).toHaveLength(1)
        expect(result.total).toBe(1)
        expect(mockQuery).toHaveBeenCalledWith(
          expect.stringContaining('f.user_id = $1'),
          expect.arrayContaining(['user-id', 50000])
        )
        expect(mockQuery).toHaveBeenCalledWith(
          expect.stringContaining('e.price_cents >= $2'),
          expect.anything()
        )
        // This test should cover line 628: if (typeof minPrice === 'number') { where.push(`e.price_cents >= $${i++}`); args.push(minPrice) }
      })

      it('should return user favorites with maxPrice filter (line 629)', async () => {
        mockQuery
          .mockImplementationOnce(() => ({ rows: [{ count: '1' }], rowCount: 1 }))
          .mockImplementationOnce(() => ({ rows: [mockEvents[0]], rowCount: 1 }))
          .mockImplementationOnce(() => ({ rows: [{ name: 'rock' }], rowCount: 1 }))

        const result = await getUserFavoritesDb('user-id', { maxPrice: 100000 })

        expect(result.events).toHaveLength(1)
        expect(result.total).toBe(1)
        expect(mockQuery).toHaveBeenCalledWith(
          expect.stringContaining('f.user_id = $1'),
          expect.arrayContaining(['user-id', 100000])
        )
        expect(mockQuery).toHaveBeenCalledWith(
          expect.stringContaining('e.price_cents <= $2'),
          expect.anything()
        )
        // This test should cover line 629: if (typeof maxPrice === 'number') { where.push(`e.price_cents <= $${i++}`); args.push(maxPrice) }
      })

      it('should return user favorites with date sorting (line 634)', async () => {
        mockQuery
          .mockImplementationOnce(() => ({ rows: [{ count: '1' }], rowCount: 1 }))
          .mockImplementationOnce(() => ({ rows: [mockEvents[0]], rowCount: 1 }))
          .mockImplementationOnce(() => ({ rows: [{ name: 'rock' }], rowCount: 1 }))

        const result = await getUserFavoritesDb('user-id', { sort: 'date', order: 'desc' })

        expect(result.events).toHaveLength(1)
        expect(result.total).toBe(1)
        expect(mockQuery).toHaveBeenCalledWith(
          expect.stringContaining('ORDER BY e.starts_at DESC, e.id ASC'),
          expect.anything()
        )
        // This test should cover line 634: if (sort === 'date') orderSql = `ORDER BY e.starts_at ${order === 'desc' ? 'DESC' : 'ASC'}, e.id ASC`
      })

      it('should return user favorites with price sorting (line 635)', async () => {
        mockQuery
          .mockImplementationOnce(() => ({ rows: [{ count: '1' }], rowCount: 1 }))
          .mockImplementationOnce(() => ({ rows: [mockEvents[0]], rowCount: 1 }))
          .mockImplementationOnce(() => ({ rows: [{ name: 'rock' }], rowCount: 1 }))

        const result = await getUserFavoritesDb('user-id', { sort: 'price', order: 'asc' })

        expect(result.events).toHaveLength(1)
        expect(result.total).toBe(1)
        expect(mockQuery).toHaveBeenCalledWith(
          expect.stringContaining('ORDER BY e.price_cents ASC, e.id ASC'),
          expect.anything()
        )
        // This test should cover line 635: if (sort === 'price') orderSql = `ORDER BY e.price_cents ${order === 'desc' ? 'DESC' : 'ASC'}, e.id ASC`
      })
    })

    describe('isEventFavoritedDb', () => {
      it('should return true for favorited event', async () => {
        mockQuery.mockImplementationOnce(() => ({ rows: [{ exists: true }], rowCount: 1 }))

        const result = await isEventFavoritedDb('user-id', 'event-id')
        expect(result).toBe(true)
      })

      it('should return false for non-favorited event', async () => {
        mockQuery.mockImplementationOnce(() => ({ rows: [{ exists: false }], rowCount: 1 }))

        const result = await isEventFavoritedDb('user-id', 'event-id')
        expect(result).toBe(false)
      })

      it('should handle database errors gracefully', async () => {
        mockQuery.mockImplementationOnce(() => { throw new Error('DB Error') })

        const result = await isEventFavoritedDb('user-id', 'event-id')
        expect(result).toBe(false)
      })
    })
  })

  describe('listOrganizerEventsDb', () => {
    it('should return organizer events with filters', async () => {
      mockQuery
        .mockImplementationOnce(() => ({ rows: [{ count: '1' }], rowCount: 1 }))
        .mockImplementationOnce(() => ({ rows: [mockEvents[0]], rowCount: 1 }))
        .mockImplementationOnce(() => ({ rows: [{ name: 'rock' }], rowCount: 1 }))

      const result = await listOrganizerEventsDb('organizer-id', { city: 'bogota' })

      expect(result.events).toHaveLength(1)
      expect(result.total).toBe(1)
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('e.created_by = $1'),
        expect.arrayContaining(['organizer-id'])
      )
    })

    it('should return organizer events with search query', async () => {
      mockQuery
        .mockImplementationOnce(() => ({ rows: [{ count: '1' }], rowCount: 1 }))
        .mockImplementationOnce(() => ({ rows: [mockEvents[0]], rowCount: 1 }))
        .mockImplementationOnce(() => ({ rows: [{ name: 'rock' }], rowCount: 1 }))

      const result = await listOrganizerEventsDb('organizer-id', { q: 'festival' })

      expect(result.events).toHaveLength(1)
      expect(result.total).toBe(1)
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('e.created_by = $1'),
        expect.arrayContaining(['organizer-id', '%festival%'])
      )
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringMatching(/title_norm LIKE.*description_norm LIKE.*venue_norm LIKE.*EXISTS/s),
        expect.anything()
      )
    })

    it('should return organizer events with category filter (line 494)', async () => {
      mockQuery
        .mockImplementationOnce(() => ({ rows: [{ count: '1' }], rowCount: 1 }))
        .mockImplementationOnce(() => ({ rows: [mockEvents[0]], rowCount: 1 }))
        .mockImplementationOnce(() => ({ rows: [{ name: 'rock' }], rowCount: 1 }))

      const result = await listOrganizerEventsDb('organizer-id', { category: 'música' })

      expect(result.events).toHaveLength(1)
      expect(result.total).toBe(1)
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('e.created_by = $1'),
        expect.arrayContaining(['organizer-id', 'musica']) // normalized category
      )
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('ct.slug = $2'),
        expect.anything()
      )
      // This test should cover line 494: if (category) { where.push(`ct.slug = $${i++}`); args.push(normalize(category)) }
    })

    it('should return organizer events with comprehensive filters (lines 508-511)', async () => {
      mockQuery
        .mockImplementationOnce(() => ({ rows: [{ count: '1' }], rowCount: 1 }))
        .mockImplementationOnce(() => ({ rows: [mockEvents[0]], rowCount: 1 }))
        .mockImplementationOnce(() => ({ rows: [{ name: 'rock' }], rowCount: 1 }))

      const result = await listOrganizerEventsDb('organizer-id', { 
        from: '2024-12-01', 
        to: '2024-12-31', 
        minPrice: 25000, 
        maxPrice: 75000 
      })

      expect(result.events).toHaveLength(1)
      expect(result.total).toBe(1)
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('e.created_by = $1'),
        expect.arrayContaining(['organizer-id', '2024-12-01', '2024-12-31', 25000, 75000])
      )
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('e.starts_at::date >= $2'),
        expect.anything()
      )
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('e.starts_at::date <= $3'),
        expect.anything()
      )
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('e.price_cents >= $4'),
        expect.anything()
      )
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('e.price_cents <= $5'),
        expect.anything()
      )
      // This test should cover lines 508-511: from, to, minPrice, maxPrice filters
    })

    it('should return organizer events with price sorting (line 516)', async () => {
      mockQuery
        .mockImplementationOnce(() => ({ rows: [{ count: '1' }], rowCount: 1 }))
        .mockImplementationOnce(() => ({ rows: [mockEvents[0]], rowCount: 1 }))
        .mockImplementationOnce(() => ({ rows: [{ name: 'rock' }], rowCount: 1 }))

      const result = await listOrganizerEventsDb('organizer-id', { sort: 'price', order: 'desc' })

      expect(result.events).toHaveLength(1)
      expect(result.total).toBe(1)
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY e.price_cents DESC, e.id ASC'),
        expect.anything()
      )
      // This test should cover line 516: if (sort === 'price') orderSql = `ORDER BY e.price_cents ${order === 'desc' ? 'DESC' : 'ASC'}, e.id ASC`
    })
  })
})