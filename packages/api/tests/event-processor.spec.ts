import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals'
import { QueryResult } from 'pg'
import { query } from '../src/db/client'
import { convertExtractedEventToDbFormat, createMinedEventDb, processExtractedEvents } from '../src/utils/event-processor'
import { ExtractedEvent } from '../src/event-schema'
import { CreateEventParams, EventDto } from '../src/db/repository'

// Mock the database client
jest.mock('../src/db/client', () => ({
  query: jest.fn()
}))

// Helper function to create properly typed QueryResult objects
function createMockQueryResult<T extends Record<string, any> = any>(rows: T[], rowCount: number = rows.length): QueryResult<T> {
  return {
    rows,
    rowCount,
    command: '',
    oid: 0,
    fields: []
  }
}

describe('event-processor', () => {
  const mockQuery = jest.mocked(query)

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('convertExtractedEventToDbFormat', () => {
    it('should convert extracted event to database format correctly', () => {
      const extractedEvent: ExtractedEvent = {
        source_url: 'https://example.com',
        event_url: 'https://example.com/event1',
        title: 'Test Event',
        description: 'A test event description',
        date: '2024-12-01',
        time: '20:00',
        location: 'Test Venue',
        address: 'Test Address',
        category_slug: 'musica',
        city_slug: 'bogota',
        Price: 50000,
        image_url: 'https://example.com/image.jpg'
      }

      const result = convertExtractedEventToDbFormat(extractedEvent)

      expect(result).toEqual({
        title: 'Test Event',
        description: 'A test event description',
        date: '2024-12-01',
        time: '20:00',
        location: 'Test Venue',
        address: 'Test Address',
        category: 'musica',
        city: 'bogota',
        price: 50000,
        currency: 'COP',
        image: 'https://example.com/image.jpg',
        tags: []
      })
    })

    it('should handle null price correctly', () => {
      const extractedEvent: ExtractedEvent = {
        source_url: 'https://example.com',
        event_url: 'https://example.com/event1',
        title: 'Free Event',
        description: 'A free event',
        date: '2024-12-01',
        time: '20:00',
        location: 'Test Venue',
        address: 'Test Address',
        category_slug: 'musica',
        city_slug: 'bogota',
        Price: null,
        image_url: null
      }

      const result = convertExtractedEventToDbFormat(extractedEvent)

      expect(result.price).toBeNull()
      expect(result.image).toBeUndefined()
    })
  })

  describe('createMinedEventDb', () => {
    const adminUserId = 'admin-user-id'
    const eventParams: CreateEventParams = {
      title: 'Test Event',
      description: 'A test event',
      date: '2024-12-01',
      time: '20:00',
      location: 'Test Venue',
      address: 'Test Address',
      category: 'musica',
      city: 'bogota',
      price: 50000,
      currency: 'COP',
      image: 'https://example.com/image.jpg',
      tags: ['tag1', 'tag2']
    }

    it('should create mined event successfully', async () => {
      const mockEvent: EventDto = {
        id: 'test-event-id',
        title: 'Test Event',
        description: 'A test event',
        utcTimestamp: '2024-12-01T01:00:00.000Z',
        location: 'Test Venue',
        address: 'Test Address',
        category: 'Música',
        city: 'bogota',
        price: 50000,
        currency: 'COP',
        image: 'https://example.com/image.jpg',
        tags: [],
        created_by: adminUserId,
        event_url: 'https://example.com/event',
        active: false
      }

      // Mock city lookup
      mockQuery.mockImplementationOnce(() => Promise.resolve({ rows: [{ id: 1 }], rowCount: 1, command: '', oid: 0, fields: [] } as QueryResult<any>))
      // Mock category lookup
      mockQuery.mockImplementationOnce(() => Promise.resolve({ rows: [{ id: 1 }], rowCount: 1, command: '', oid: 0, fields: [] } as QueryResult<any>))
      // Mock insert event
      mockQuery.mockImplementationOnce(() => Promise.resolve({ rows: [], rowCount: 1, command: '', oid: 0, fields: [] } as QueryResult<any>))
      // Mock tag1: insert, select, insert event_tags
      mockQuery.mockImplementationOnce(() => Promise.resolve({ rows: [], rowCount: 1, command: '', oid: 0, fields: [] } as QueryResult<any>))
      mockQuery.mockImplementationOnce(() => Promise.resolve({ rows: [{ id: 1 }], rowCount: 1, command: '', oid: 0, fields: [] } as QueryResult<any>))
      mockQuery.mockImplementationOnce(() => Promise.resolve({ rows: [], rowCount: 1, command: '', oid: 0, fields: [] } as QueryResult<any>))
      // Mock tag2: insert, select, insert event_tags
      mockQuery.mockImplementationOnce(() => Promise.resolve({ rows: [], rowCount: 1, command: '', oid: 0, fields: [] } as QueryResult<any>))
      mockQuery.mockImplementationOnce(() => Promise.resolve({ rows: [{ id: 2 }], rowCount: 1, command: '', oid: 0, fields: [] } as QueryResult<any>))
      mockQuery.mockImplementationOnce(() => Promise.resolve({ rows: [], rowCount: 1, command: '', oid: 0, fields: [] } as QueryResult<any>))
      // Mock getEventByIdDb
      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: 'test-event-id',
          title: 'Test Event',
          description: 'A test event',
          venue: 'Test Venue',
          address: 'Test Address',
          price_cents: 50000,
          currency: 'COP',
          starts_at: '2024-12-01T01:00:00.000Z',
          label: 'Música',
          slug: 'bogota',
          image: 'https://example.com/image.jpg',
          created_by: adminUserId,
          event_url: 'https://example.com/event',
          active: false
        }],
        rowCount: 1,
        command: '',
        oid: 0,
        fields: []
      } as any)

      const result = await createMinedEventDb(eventParams, adminUserId, 'https://example.com/event')

      expect(result).toEqual(mockEvent)
      expect(mockQuery).toHaveBeenCalledTimes(10)
    })

    it('should throw error when city not found', async () => {
      mockQuery.mockResolvedValueOnce(createMockQueryResult([]))

      await expect(createMinedEventDb(eventParams, adminUserId)).rejects.toThrow('Ciudad no encontrada')
    })

    it('should throw error when category not found', async () => {
      mockQuery.mockResolvedValueOnce(createMockQueryResult([{ id: 1 }]))
      mockQuery.mockResolvedValueOnce(createMockQueryResult([]))

      await expect(createMinedEventDb(eventParams, adminUserId)).rejects.toThrow('Categoría no encontrada')
    })

    it('should handle events without tags', async () => {
      const paramsWithoutTags = { ...eventParams, tags: [] }

      mockQuery.mockImplementationOnce(() => Promise.resolve(createMockQueryResult([{ id: 1 }])) as any)
      mockQuery.mockImplementationOnce(() => Promise.resolve(createMockQueryResult([{ id: 1 }])) as any)
      mockQuery.mockImplementationOnce(() => Promise.resolve(createMockQueryResult([])) as any)
      mockQuery.mockImplementationOnce(() => Promise.resolve(createMockQueryResult([{
        id: 'test-event-id',
        title: 'Test Event',
        description: 'A test event',
        venue: 'Test Venue',
        address: 'Test Address',
        price_cents: 50000,
        currency: 'COP',
        starts_at: '2024-12-01T01:00:00.000Z',
        label: 'Música',
        slug: 'bogota',
        image: 'https://example.com/image.jpg',
        created_by: adminUserId,
        event_url: 'https://example.com/event',
        active: true
      }])) as any)

      const result = await createMinedEventDb(paramsWithoutTags, adminUserId)

      expect(result.tags).toEqual([])
      expect(mockQuery).toHaveBeenCalledTimes(4)
    })

    it('should throw error when getEventByIdDb returns null', async () => {
      mockQuery.mockResolvedValueOnce(createMockQueryResult([{ id: 1 }]))
      mockQuery.mockResolvedValueOnce(createMockQueryResult([{ id: 1 }]))
      mockQuery.mockResolvedValueOnce(createMockQueryResult([]))
      mockQuery.mockResolvedValueOnce(createMockQueryResult([]))
      mockQuery.mockResolvedValueOnce(createMockQueryResult([{ id: 1 }]))
      mockQuery.mockResolvedValueOnce(createMockQueryResult([]))
      mockQuery.mockResolvedValueOnce(createMockQueryResult([]))
      mockQuery.mockResolvedValueOnce(createMockQueryResult([{ id: 2 }]))
      mockQuery.mockResolvedValueOnce(createMockQueryResult([]))
      mockQuery.mockResolvedValueOnce(createMockQueryResult([]))

      await expect(createMinedEventDb(eventParams, adminUserId)).rejects.toThrow('Error al crear el evento minado')
    })

    it('should handle null fields in database response', async () => {
      const paramsWithoutTags = { ...eventParams, tags: [] }

      mockQuery.mockResolvedValueOnce(createMockQueryResult([{ id: 1 }]))
      mockQuery.mockResolvedValueOnce(createMockQueryResult([{ id: 1 }]))
      mockQuery.mockResolvedValueOnce(createMockQueryResult([]))
      mockQuery.mockResolvedValueOnce(createMockQueryResult([{
        id: 'test-event-id',
        title: 'Test Event',
        description: 'A test event',
        venue: null,
        address: null,
        price_cents: null,
        currency: 'COP',
        starts_at: '2024-12-01T01:00:00.000Z',
        label: 'Música',
        slug: 'bogota',
        image: null,
        created_by: null,
        event_url: null,
        active: false
      }]))

      const result = await createMinedEventDb(paramsWithoutTags, adminUserId)

      expect(result.location).toBe('')
      expect(result.address).toBe('')
      expect(result.image).toBe('')
      expect(result.created_by).toBeUndefined()
      expect(result.event_url).toBeUndefined()
      expect(result.price).toBeNull()
    })
  })

  describe('processExtractedEvents', () => {
    const adminUserId = 'admin-user-id'
    // Use a date far in the future to avoid any timezone issues
    const futureDate = '2027-06-15'
    const validExtractedEvent: ExtractedEvent = {
      source_url: 'https://example.com',
      event_url: 'https://example.com/event1',
      title: 'Valid Event',
      description: 'A valid event',
      date: futureDate,
      time: '20:00',
      location: 'Test Venue',
      address: 'Test Address',
      category_slug: 'musica',
      city_slug: 'bogota',
      Price: 50000,
      image_url: 'https://example.com/image.jpg'
    }

    beforeEach(() => {
      jest.spyOn(console, 'log').mockImplementation(() => undefined)
      jest.spyOn(console, 'warn').mockImplementation(() => undefined)
      jest.spyOn(console, 'error').mockImplementation(() => undefined)
    })

    afterEach(() => {
      jest.restoreAllMocks()
    })

    it('should process valid events successfully', async () => {
      const extractedEvents = [validExtractedEvent]

      // Mock isDuplicateEvent (no duplicate)
      mockQuery.mockResolvedValueOnce(createMockQueryResult([]))
      // Mock createMinedEventDb calls
      mockQuery.mockResolvedValueOnce(createMockQueryResult([{ id: 1 }]))
      mockQuery.mockResolvedValueOnce(createMockQueryResult([{ id: 1 }]))
      mockQuery.mockResolvedValueOnce(createMockQueryResult([]))
      mockQuery.mockResolvedValueOnce(createMockQueryResult([{
        id: 'test-event-id',
        title: 'Valid Event',
        description: 'A valid event',
        venue: 'Test Venue',
        address: 'Test Address',
        price_cents: 50000,
        currency: 'COP',
        starts_at: '2027-06-15T01:00:00.000Z',
        label: 'Música',
        slug: 'bogota',
        image: 'https://example.com/image.jpg',
        created_by: adminUserId,
        event_url: 'https://example.com/event1',
        active: false
      }]))

      const result = await processExtractedEvents(extractedEvents, adminUserId)

      expect(result).toHaveLength(1)
      expect(result[0].title).toBe('Valid Event')
    })

    it('should skip events with missing required fields', async () => {
      const invalidEvent: ExtractedEvent = {
        ...validExtractedEvent,
        title: ''
      }

      const result = await processExtractedEvents([invalidEvent], adminUserId)

      expect(result).toHaveLength(0)
    })

    it('should skip duplicate events', async () => {
      const extractedEvents = [validExtractedEvent]

      // Mock isDuplicateEvent (duplicate found)
      mockQuery.mockResolvedValueOnce(createMockQueryResult([{ exists: true }]))

      const result = await processExtractedEvents(extractedEvents, adminUserId)

      expect(result).toHaveLength(0)
    })

    it('should handle processing errors gracefully', async () => {
      const extractedEvents = [validExtractedEvent]

      // Mock isDuplicateEvent (no duplicate)
      mockQuery.mockResolvedValueOnce(createMockQueryResult([]))
      // Mock createMinedEventDb to throw error
      mockQuery.mockRejectedValueOnce(new Error('Database error'))

      const result = await processExtractedEvents(extractedEvents, adminUserId)

      expect(result).toHaveLength(0)
    })

    it('should handle isDuplicateEvent errors gracefully', async () => {
      const extractedEvents = [validExtractedEvent]

      // Mock isDuplicateEvent to throw error (should return false and continue)
      mockQuery.mockRejectedValueOnce(new Error('Database connection error'))
      // Mock createMinedEventDb calls (event should be processed normally)
      mockQuery.mockResolvedValueOnce(createMockQueryResult([{ id: 1 }]))
      mockQuery.mockResolvedValueOnce(createMockQueryResult([{ id: 1 }]))
      mockQuery.mockResolvedValueOnce(createMockQueryResult([]))
      mockQuery.mockResolvedValueOnce(createMockQueryResult([{
        id: 'test-event-id',
        title: 'Valid Event',
        description: 'A valid event',
        venue: 'Test Venue',
        address: 'Test Address',
        price_cents: 50000,
        currency: 'COP',
        starts_at: '2027-06-15T01:00:00.000Z',
        label: 'Música',
        slug: 'bogota',
        image: 'https://example.com/image.jpg',
        created_by: adminUserId,
        event_url: 'https://example.com/event1',
        active: false
      }]))

      const result = await processExtractedEvents(extractedEvents, adminUserId)

      expect(result).toHaveLength(1)
      expect(result[0].title).toBe('Valid Event')
    })

    it('should handle non-Error exceptions', async () => {
      const extractedEvents = [validExtractedEvent]

      mockQuery.mockResolvedValueOnce(createMockQueryResult([]))
      mockQuery.mockRejectedValueOnce('String error')

      const result = await processExtractedEvents(extractedEvents, adminUserId)

      expect(result).toHaveLength(0)
    })

    it('should process multiple events with mixed results', async () => {
      const validEvent2 = { ...validExtractedEvent, title: 'Valid Event 2' }
      const invalidEvent = { ...validExtractedEvent, title: '' }
      const duplicateEvent = { ...validExtractedEvent, title: 'Duplicate Event' }

      // First event (valid)
      mockQuery.mockResolvedValueOnce(createMockQueryResult([]))
      mockQuery.mockResolvedValueOnce(createMockQueryResult([{ id: 1 }]))
      mockQuery.mockResolvedValueOnce(createMockQueryResult([{ id: 1 }]))
      mockQuery.mockResolvedValueOnce(createMockQueryResult([]))
      mockQuery.mockResolvedValueOnce(createMockQueryResult([{
        id: 'event-1',
        title: 'Valid Event 2',
        description: 'A valid event',
        venue: 'Test Venue',
        address: 'Test Address',
        price_cents: 50000,
        currency: 'COP',
        starts_at: '2027-06-15T01:00:00.000Z',
        label: 'Música',
        slug: 'bogota',
        image: 'https://example.com/image.jpg',
        created_by: adminUserId,
        event_url: 'https://example.com/event1',
        active: false
      }]))

      // Second event (invalid - skipped)
      // Third event (duplicate - skipped)
      mockQuery.mockResolvedValueOnce(createMockQueryResult([{ exists: true }]))

      const result = await processExtractedEvents([validEvent2, invalidEvent, duplicateEvent], adminUserId)

      expect(result).toHaveLength(1)
      expect(result[0].title).toBe('Valid Event 2')
    })

    it('should log processing summary', async () => {
      const logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined)

      const extractedEvents = [validExtractedEvent]

      // Mock successful processing
      mockQuery.mockResolvedValueOnce(createMockQueryResult([]))
      mockQuery.mockResolvedValueOnce(createMockQueryResult([{ id: 1 }]))
      mockQuery.mockResolvedValueOnce(createMockQueryResult([{ id: 1 }]))
      mockQuery.mockResolvedValueOnce(createMockQueryResult([]))
      mockQuery.mockResolvedValueOnce(createMockQueryResult([{
        id: 'test-event-id',
        title: 'Valid Event',
        description: 'A valid event',
        venue: 'Test Venue',
        address: 'Test Address',
        price_cents: 50000,
        currency: 'COP',
        starts_at: '2027-06-15T01:00:00.000Z',
        label: 'Música',
        slug: 'bogota',
        image: 'https://example.com/image.jpg',
        created_by: adminUserId,
        event_url: 'https://example.com/event1',
        active: false
      }]))

      await processExtractedEvents(extractedEvents, adminUserId)

      expect(logSpy).toHaveBeenCalledWith('[Procesador de Eventos] Procesando 1 eventos extraídos')
      expect(logSpy).toHaveBeenCalledWith('[Procesador de Eventos] Evento almacenado exitosamente: Valid Event')
      expect(logSpy).toHaveBeenCalledWith('[Procesador de Eventos] Procesamiento completado. Almacenados: 1, Omitidos: 0')
    })

    it('should log skipped events when there are failures', async () => {
      const logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined)

      const invalidEvent = { ...validExtractedEvent, title: '' }

      await processExtractedEvents([invalidEvent], adminUserId)

      expect(logSpy).toHaveBeenCalledWith('[Procesador de Eventos] Procesando 1 eventos extraídos')
      expect(logSpy).toHaveBeenCalledWith('[Procesador de Eventos] Procesamiento completado. Almacenados: 0, Omitidos: 1')
      expect(logSpy).toHaveBeenCalledWith('[Procesador de Eventos] Eventos omitidos:', [' - Missing required fields'])
    })
  })
})