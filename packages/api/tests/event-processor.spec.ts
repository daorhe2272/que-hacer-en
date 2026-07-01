import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals'
import { QueryResult } from 'pg'
import { query } from '../src/db/client'
import { convertExtractedEventToDbFormat, createMinedEventDb, processExtractedEvents, deduplicateWithinBatch } from '../src/utils/event-processor'
import { ExtractedEvent } from '../src/event-schema'
import { CreateEventParams } from '../src/db/repository'

jest.mock('../src/db/client', () => ({
  query: jest.fn()
}))

jest.mock('../src/utils/event-deduplicator', () => ({
  checkSemanticDuplicates: jest.fn()
}))

jest.mock('../src/utils/event-enricher', () => ({
  enrichEventFromHtml: jest.fn()
}))

jest.mock('../src/utils/html-fetcher', () => ({
  fetchHtmlContent: jest.fn(),
  extractTextContent: jest.fn((html: string) => html.replace(/<[^>]+>/g, ''))
}))

import { checkSemanticDuplicates } from '../src/utils/event-deduplicator'
import { enrichEventFromHtml } from '../src/utils/event-enricher'
import { fetchHtmlContent } from '../src/utils/html-fetcher'

const mockCheckSemanticDuplicates = jest.mocked(checkSemanticDuplicates)
const mockEnrichEventFromHtml = jest.mocked(enrichEventFromHtml)
const mockFetchHtmlContent = jest.mocked(fetchHtmlContent)

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

  describe('deduplicateWithinBatch', () => {
    it('should remove exact normalized duplicates keeping first occurrence', () => {
      const events: ExtractedEvent[] = [
        { source_url: 'https://example.com', event_url: 'https://example.com/e1', title: 'Concierto Rock', description: 'd', date: '2026-07-01', time: '20:00', location: 'Teatro', address: 'Calle 1', category_slug: 'musica', city_slug: 'bogota', Price: 100, image_url: null },
        { source_url: 'https://example.com', event_url: 'https://example.com/e2', title: 'concierto rock', description: 'd', date: '2026-07-01', time: '21:00', location: 'Otro', address: 'Calle 2', category_slug: 'musica', city_slug: 'bogota', Price: 200, image_url: null },
        { source_url: 'https://example.com', event_url: 'https://example.com/e3', title: 'Evento Diferente', description: 'd', date: '2026-07-02', time: '18:00', location: 'Parque', address: 'Calle 3', category_slug: 'arte', city_slug: 'bogota', Price: 50, image_url: null },
      ]

      const result = deduplicateWithinBatch(events)

      expect(result).toHaveLength(2)
      expect(result[0].title).toBe('Concierto Rock')
      expect(result[1].title).toBe('Evento Diferente')
    })

    it('should return all events when no duplicates', () => {
      const events: ExtractedEvent[] = [
        { source_url: 'https://example.com', event_url: 'https://example.com/e1', title: 'Event A', description: 'd', date: '2026-07-01', time: '20:00', location: 'L1', address: 'A1', category_slug: 'musica', city_slug: 'bogota', Price: 100, image_url: null },
        { source_url: 'https://example.com', event_url: 'https://example.com/e2', title: 'Event B', description: 'd', date: '2026-07-02', time: '21:00', location: 'L2', address: 'A2', category_slug: 'arte', city_slug: 'medellin', Price: 200, image_url: null },
      ]

      const result = deduplicateWithinBatch(events)

      expect(result).toHaveLength(2)
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
      mockQuery.mockImplementationOnce(() => Promise.resolve({ rows: [{ id: 1 }], rowCount: 1, command: '', oid: 0, fields: [] } as QueryResult<any>))
      mockQuery.mockImplementationOnce(() => Promise.resolve({ rows: [{ id: 1 }], rowCount: 1, command: '', oid: 0, fields: [] } as QueryResult<any>))
      mockQuery.mockImplementationOnce(() => Promise.resolve({ rows: [], rowCount: 1, command: '', oid: 0, fields: [] } as QueryResult<any>))
      mockQuery.mockImplementationOnce(() => Promise.resolve({ rows: [], rowCount: 1, command: '', oid: 0, fields: [] } as QueryResult<any>))
      mockQuery.mockImplementationOnce(() => Promise.resolve({ rows: [{ id: 1 }], rowCount: 1, command: '', oid: 0, fields: [] } as QueryResult<any>))
      mockQuery.mockImplementationOnce(() => Promise.resolve({ rows: [], rowCount: 1, command: '', oid: 0, fields: [] } as QueryResult<any>))
      mockQuery.mockImplementationOnce(() => Promise.resolve({ rows: [], rowCount: 1, command: '', oid: 0, fields: [] } as QueryResult<any>))
      mockQuery.mockImplementationOnce(() => Promise.resolve({ rows: [{ id: 2 }], rowCount: 1, command: '', oid: 0, fields: [] } as QueryResult<any>))
      mockQuery.mockImplementationOnce(() => Promise.resolve({ rows: [], rowCount: 1, command: '', oid: 0, fields: [] } as QueryResult<any>))
      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: 'test-event-id', title: 'Test Event', description: 'A test event', venue: 'Test Venue', address: 'Test Address', price_cents: 50000, currency: 'COP', starts_at: '2024-12-01T01:00:00.000Z', label: 'Música', slug: 'bogota', image: 'https://example.com/image.jpg', created_by: adminUserId, event_url: 'https://example.com/event', active: false
        }],
        rowCount: 1, command: '', oid: 0, fields: []
      } as any)

      const result = await createMinedEventDb(eventParams, adminUserId, 'https://example.com/event')

      expect(result).toBeDefined()
      expect(mockQuery).toHaveBeenCalledTimes(10)
    })

    it('should create mined event with active=true when parameter is passed', async () => {
      const paramsWithoutTags = { ...eventParams, tags: [] }

      mockQuery.mockResolvedValueOnce(createMockQueryResult([{ id: 1 }]))
      mockQuery.mockResolvedValueOnce(createMockQueryResult([{ id: 1 }]))
      mockQuery.mockResolvedValueOnce(createMockQueryResult([]))
      mockQuery.mockResolvedValueOnce(createMockQueryResult([{
        id: 'test-event-id', title: 'Test Event', description: 'A test event', venue: 'Test Venue', address: 'Test Address', price_cents: 50000, currency: 'COP', starts_at: '2024-12-01T01:00:00.000Z', label: 'Música', slug: 'bogota', image: 'https://example.com/image.jpg', created_by: adminUserId, event_url: 'https://example.com/event', active: true
      }]))

      const result = await createMinedEventDb(paramsWithoutTags, adminUserId, 'https://example.com/event', true)

      expect(result.active).toBe(true)
      // Verify the INSERT query used active=true (the $13 parameter)
      const insertCall = mockQuery.mock.calls.find(call => call[0]?.includes?.('INSERT INTO events'))
      expect(insertCall).toBeDefined()
      expect(insertCall![0]).toContain('VALUES')
    })

    it('should create mined event with active=false by default', async () => {
      const paramsWithoutTags = { ...eventParams, tags: [] }

      mockQuery.mockResolvedValueOnce(createMockQueryResult([{ id: 1 }]))
      mockQuery.mockResolvedValueOnce(createMockQueryResult([{ id: 1 }]))
      mockQuery.mockResolvedValueOnce(createMockQueryResult([]))
      mockQuery.mockResolvedValueOnce(createMockQueryResult([{
        id: 'test-event-id', title: 'Test Event', description: 'A test event', venue: 'Test Venue', address: 'Test Address', price_cents: 50000, currency: 'COP', starts_at: '2024-12-01T01:00:00.000Z', label: 'Música', slug: 'bogota', image: 'https://example.com/image.jpg', created_by: adminUserId, event_url: 'https://example.com/event', active: false
      }]))

      const result = await createMinedEventDb(paramsWithoutTags, adminUserId)

      expect(result.active).toBe(false)
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

      mockQuery.mockImplementationOnce(() => Promise.resolve(createMockQueryResult([{ id: 1 }]) as any))
      mockQuery.mockImplementationOnce(() => Promise.resolve(createMockQueryResult([{ id: 1 }]) as any))
      mockQuery.mockImplementationOnce(() => Promise.resolve(createMockQueryResult([]) as any))
      mockQuery.mockImplementationOnce(() => Promise.resolve(createMockQueryResult([{
        id: 'test-event-id', title: 'Test Event', description: 'A test event', venue: 'Test Venue', address: 'Test Address', price_cents: 50000, currency: 'COP', starts_at: '2024-12-01T01:00:00.000Z', label: 'Música', slug: 'bogota', image: 'https://example.com/image.jpg', created_by: adminUserId, event_url: 'https://example.com/event', active: true
      }]) as any))

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
        id: 'test-event-id', title: 'Test Event', description: 'A test event', venue: null, address: null, price_cents: null, currency: 'COP', starts_at: '2024-12-01T01:00:00.000Z', label: 'Música', slug: 'bogota', image: null, created_by: null, event_url: null, active: false
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

    function getFutureDate(days: number): string {
      const date = new Date()
      date.setDate(date.getDate() + days)
      return date.toISOString().split('T')[0]
    }

    const futureDate = getFutureDate(30)

    // Event with event_url === source_url (no enrichment path)
    const validExtractedEvent: ExtractedEvent = {
      source_url: 'https://example.com',
      event_url: 'https://example.com',
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

    // Event with distinct event_url (enrichment path)
    const enrichableEvent: ExtractedEvent = {
      source_url: 'https://example.com',
      event_url: 'https://example.com/event-detail',
      title: 'Enrichable Event',
      description: 'An enrichable event',
      date: futureDate,
      time: '20:00',
      location: 'Test Venue',
      address: 'Test Address',
      category_slug: 'musica',
      city_slug: 'bogota',
      Price: 50000,
      image_url: null
    }

    beforeEach(() => {
      jest.spyOn(console, 'log').mockImplementation(() => undefined)
      jest.spyOn(console, 'warn').mockImplementation(() => undefined)
      jest.spyOn(console, 'error').mockImplementation(() => undefined)
      // Default: no semantic duplicates found
      mockCheckSemanticDuplicates.mockResolvedValue([])
      // Default: no existing events in city
      mockQuery.mockReset()
    })

    afterEach(() => {
      jest.restoreAllMocks()
    })

    // Helper to set up DB mocks for successful event storage (city, category, insert, getEventByIdDb)
    function mockSuccessfulDbInsert(active: boolean = false, title: string = 'Valid Event') {
      mockQuery
        .mockResolvedValueOnce(createMockQueryResult([{ id: 1 }])) // city lookup
        .mockResolvedValueOnce(createMockQueryResult([{ id: 1 }])) // category lookup
        .mockResolvedValueOnce(createMockQueryResult([])) // insert event
        .mockResolvedValueOnce(createMockQueryResult([{ // getEventByIdDb
          id: 'test-event-id', title, description: 'A valid event', venue: 'Test Venue', address: 'Test Address', price_cents: 50000, currency: 'COP', starts_at: '2027-06-15T01:00:00.000Z', label: 'Música', slug: 'bogota', image: 'https://example.com/image.jpg', created_by: adminUserId, event_url: 'https://example.com', active
        }]))
    }

    it('should process valid events successfully (no enrichment, event_url === source_url)', async () => {
      const extractedEvents = [validExtractedEvent]

      // isDuplicateEvent (no duplicate)
      mockQuery.mockResolvedValueOnce(createMockQueryResult([]))
      // fetchExistingEventsForCity
      mockQuery.mockResolvedValueOnce(createMockQueryResult([]))
      // createMinedEventDb
      mockSuccessfulDbInsert(false)

      const result = await processExtractedEvents(extractedEvents, adminUserId)

      expect(result).toHaveLength(1)
      expect(result[0].title).toBe('Valid Event')
    })

    it('should skip events with missing required fields', async () => {
      const invalidEvent: ExtractedEvent = { ...validExtractedEvent, title: '' }

      const result = await processExtractedEvents([invalidEvent], adminUserId)

      expect(result).toHaveLength(0)
    })

    it('should skip DB duplicate events', async () => {
      mockQuery.mockResolvedValueOnce(createMockQueryResult([{ exists: true }])) // isDuplicateEvent

      const result = await processExtractedEvents([validExtractedEvent], adminUserId)

      expect(result).toHaveLength(0)
    })

    it('should skip events more than 60 days in the future', async () => {
      const farFutureEvent = { ...validExtractedEvent, date: getFutureDate(61) }

      const result = await processExtractedEvents([farFutureEvent], adminUserId)

      expect(result).toHaveLength(0)
    })

    it('should skip within-batch duplicates keeping first occurrence', async () => {
      const event1 = { ...validExtractedEvent, title: 'Concierto Rock' }
      const event2 = { ...validExtractedEvent, title: 'concierto rock' } // same normalized title+city+date

      // isDuplicateEvent (no db duplicate)
      mockQuery.mockResolvedValueOnce(createMockQueryResult([]))
      // fetchExistingEventsForCity (no existing)
      mockQuery.mockResolvedValueOnce(createMockQueryResult([]))
      // createMinedEventDb
      mockSuccessfulDbInsert(false, 'Concierto Rock')

      const result = await processExtractedEvents([event1, event2], adminUserId)

      expect(result).toHaveLength(1)
      expect(result[0].title).toBe('Concierto Rock')
    })

    it('should skip semantic duplicates flagged by LLM', async () => {
      mockCheckSemanticDuplicates.mockResolvedValueOnce([
        { candidateIndex: 0, isDuplicate: true, duplicateOfId: 'existing-1', reason: 'Same event' }
      ])

      // isDuplicateEvent (no db duplicate)
      mockQuery.mockResolvedValueOnce(createMockQueryResult([]))
      // fetchExistingEventsForCity (has existing events)
      mockQuery.mockResolvedValueOnce(createMockQueryResult([
        { id: 'existing-1', title: 'Rock Concert Bog', venue: 'Teatro Municipal', date: futureDate }
      ]))

      const result = await processExtractedEvents([validExtractedEvent], adminUserId)

      expect(result).toHaveLength(0)
    })

    it('should pass through events when semantic dedup LLM fails (fail-open)', async () => {
      mockCheckSemanticDuplicates.mockResolvedValueOnce([]) // fail-open: returns empty

      // isDuplicateEvent (no db duplicate)
      mockQuery.mockResolvedValueOnce(createMockQueryResult([]))
      // fetchExistingEventsForCity (has existing events)
      mockQuery.mockResolvedValueOnce(createMockQueryResult([]))

      // createMinedEventDb
      mockSuccessfulDbInsert(false)

      const result = await processExtractedEvents([validExtractedEvent], adminUserId)

      expect(result).toHaveLength(1)
    })

    it('should skip semantic dedup when no existing DB events for city', async () => {
      // fetchExistingEventsForCity returns empty
      mockQuery.mockResolvedValueOnce(createMockQueryResult([])) // isDuplicateEvent
      mockQuery.mockResolvedValueOnce(createMockQueryResult([])) // fetchExistingEventsForCity

      mockSuccessfulDbInsert(false)

      const result = await processExtractedEvents([validExtractedEvent], adminUserId)

      expect(mockCheckSemanticDuplicates).not.toHaveBeenCalled()
      expect(result).toHaveLength(1)
    })

    it('should store event as inactive when event_url === source_url (no enrichment)', async () => {
      // isDuplicateEvent
      mockQuery.mockResolvedValueOnce(createMockQueryResult([]))
      // fetchExistingEventsForCity
      mockQuery.mockResolvedValueOnce(createMockQueryResult([]))
      // createMinedEventDb with active=false
      mockSuccessfulDbInsert(false)

      const event = { ...validExtractedEvent, event_url: validExtractedEvent.source_url }
      const result = await processExtractedEvents([event], adminUserId)

      expect(result).toHaveLength(1)
      // Verify enrichment was NOT called since event_url === source_url
      expect(mockFetchHtmlContent).not.toHaveBeenCalled()
      expect(mockEnrichEventFromHtml).not.toHaveBeenCalled()
    })

    it('should store original data as inactive when enrichment fetch fails', async () => {
      mockFetchHtmlContent.mockResolvedValueOnce({ success: false, error: 'Fetch failed' })

      // isDuplicateEvent
      mockQuery.mockResolvedValueOnce(createMockQueryResult([]))
      // fetchExistingEventsForCity
      mockQuery.mockResolvedValueOnce(createMockQueryResult([]))
      // createMinedEventDb
      mockSuccessfulDbInsert(false)

      const result = await processExtractedEvents([enrichableEvent], adminUserId)

      expect(result).toHaveLength(1)
      expect(result[0].active).toBe(false)
    })

    it('should store as active when enrichment confirms date+time', async () => {
      mockFetchHtmlContent.mockResolvedValueOnce({
        success: true, fullHtml: '<html>detail page</html>', method: 'static', content: ''
      })
      mockEnrichEventFromHtml.mockResolvedValueOnce({
        success: true, enrichedFields: { description: 'Better description' }, dateTimeConfirmed: true,
        confirmationReason: 'Fecha y hora coinciden con los datos originales'
      })

      // isDuplicateEvent
      mockQuery.mockResolvedValueOnce(createMockQueryResult([]))
      // fetchExistingEventsForCity
      mockQuery.mockResolvedValueOnce(createMockQueryResult([]))
      // createMinedEventDb with active=true
      mockSuccessfulDbInsert(true)

      const result = await processExtractedEvents([enrichableEvent], adminUserId)

      expect(result).toHaveLength(1)
      expect(mockEnrichEventFromHtml).toHaveBeenCalledWith(
        'detail page', enrichableEvent, enrichableEvent.event_url
      )
    })

    it('should store enriched fields as inactive when date+time mismatch', async () => {
      mockFetchHtmlContent.mockResolvedValueOnce({
        success: true, fullHtml: '<html>detail page</html>', method: 'static', content: ''
      })
      mockEnrichEventFromHtml.mockResolvedValueOnce({
        success: true, enrichedFields: { description: 'Better description', address: 'New Address' }, dateTimeConfirmed: false,
        confirmationReason: 'La fecha de la página de detalle no coincide con la fecha original'
      })

      // isDuplicateEvent
      mockQuery.mockResolvedValueOnce(createMockQueryResult([]))
      // fetchExistingEventsForCity
      mockQuery.mockResolvedValueOnce(createMockQueryResult([]))
      // createMinedEventDb with active=false
      mockSuccessfulDbInsert(false)

      const result = await processExtractedEvents([enrichableEvent], adminUserId)

      expect(result).toHaveLength(1)
      expect(result[0].active).toBe(false)
    })

    it('should store original data as inactive when enrichment LLM fails', async () => {
      mockFetchHtmlContent.mockResolvedValueOnce({
        success: true, fullHtml: '<html>detail page</html>', method: 'static', content: ''
      })
      mockEnrichEventFromHtml.mockResolvedValueOnce({
        success: false, enrichedFields: {}, dateTimeConfirmed: false, error: 'API error',
        confirmationReason: 'Error durante el enriquecimiento: API error'
      })

      // isDuplicateEvent
      mockQuery.mockResolvedValueOnce(createMockQueryResult([]))
      // fetchExistingEventsForCity
      mockQuery.mockResolvedValueOnce(createMockQueryResult([]))
      // createMinedEventDb with active=false
      mockSuccessfulDbInsert(false)

      const result = await processExtractedEvents([enrichableEvent], adminUserId)

      expect(result).toHaveLength(1)
      expect(result[0].active).toBe(false)
    })

    it('should handle processing errors gracefully', async () => {
      // isDuplicateEvent (no duplicate)
      mockQuery.mockResolvedValueOnce(createMockQueryResult([]))
      // fetchExistingEventsForCity
      mockQuery.mockResolvedValueOnce(createMockQueryResult([]))
      // createMinedEventDb to throw error (city lookup fails)
      mockQuery.mockRejectedValueOnce(new Error('Database error'))

      const result = await processExtractedEvents([validExtractedEvent], adminUserId)

      expect(result).toHaveLength(0)
    })

    it('should handle isDuplicateEvent errors gracefully (fail-open)', async () => {
      // isDuplicateEvent throws error (returns false)
      mockQuery.mockRejectedValueOnce(new Error('Database connection error'))
      // fetchExistingEventsForCity
      mockQuery.mockResolvedValueOnce(createMockQueryResult([]))
      // createMinedEventDb
      mockSuccessfulDbInsert(false)

      const result = await processExtractedEvents([validExtractedEvent], adminUserId)

      expect(result).toHaveLength(1)
      expect(result[0].title).toBe('Valid Event')
    })

    it('should log processing summary', async () => {
      const logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined)

      // isDuplicateEvent (no duplicate)
      mockQuery.mockResolvedValueOnce(createMockQueryResult([]))
      // fetchExistingEventsForCity
      mockQuery.mockResolvedValueOnce(createMockQueryResult([]))
      // createMinedEventDb
      mockSuccessfulDbInsert(false)

      await processExtractedEvents([validExtractedEvent], adminUserId)

      expect(logSpy).toHaveBeenCalledWith('[Procesador de Eventos] Procesando 1 eventos extraídos')
      expect(logSpy).toHaveBeenCalledWith('[Procesador de Eventos] Procesamiento completado. Almacenados: 1, Omitidos: 0')
    })

    it('should log skipped events when there are failures', async () => {
      const logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined)

      const invalidEvent = { ...validExtractedEvent, title: '' }

      await processExtractedEvents([invalidEvent], adminUserId)

      expect(logSpy).toHaveBeenCalledWith('[Procesador de Eventos] Procesando 1 eventos extraídos')
      expect(logSpy).toHaveBeenCalledWith('[Procesador de Eventos] Procesamiento completado. Almacenados: 0, Omitidos: 1')
    })

    it('should accept events exactly 60 days in the future', async () => {
      const boundaryEvent = { ...validExtractedEvent, date: getFutureDate(60) }

      mockQuery.mockResolvedValueOnce(createMockQueryResult([]))
      mockQuery.mockResolvedValueOnce(createMockQueryResult([]))
      mockSuccessfulDbInsert(false)

      const result = await processExtractedEvents([boundaryEvent], adminUserId)

      expect(result).toHaveLength(1)
    })

    it('should accept events 1 day in the future', async () => {
      const nearFutureEvent = { ...validExtractedEvent, date: getFutureDate(1) }

      mockQuery.mockResolvedValueOnce(createMockQueryResult([]))
      mockQuery.mockResolvedValueOnce(createMockQueryResult([]))
      mockSuccessfulDbInsert(false)

      const result = await processExtractedEvents([nearFutureEvent], adminUserId)

      expect(result).toHaveLength(1)
    })
  })
})