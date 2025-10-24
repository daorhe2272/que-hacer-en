import { jest, describe, it, expect, beforeEach } from '@jest/globals'

// Mock dependencies before importing mining-utils
jest.mock('../src/utils/html-fetcher')
jest.mock('../src/utils/event-extractor')
jest.mock('../src/utils/event-processor')

import { mineUrlDirectly, mineUrlDirectlyStreaming, ProgressCallback } from '../src/utils/mining-utils'
import { fetchHtmlContent } from '../src/utils/html-fetcher'
import { extractEventsFromHtml } from '../src/utils/event-extractor'
import { processExtractedEvents } from '../src/utils/event-processor'
import { ExtractedEvent } from '../src/event-schema'
import { EventDto } from '../src/db/repository'

// Get mocked functions
const mockFetchHtmlContent = jest.mocked(fetchHtmlContent)
const mockExtractEventsFromHtml = jest.mocked(extractEventsFromHtml)
const mockProcessExtractedEvents = jest.mocked(processExtractedEvents)

// Mock console methods
jest.spyOn(console, 'log').mockImplementation(() => undefined)
jest.spyOn(console, 'error').mockImplementation(() => undefined)

describe('mining-utils', () => {
  const testUrl = 'https://example.com/events'
  const testUserId = 'test-user-id'
  const mockHtmlContent = '<html><body><h1>Events</h1></body></html>'

  const mockExtractedEvent: ExtractedEvent = {
    source_url: testUrl,
    event_url: 'https://example.com/event1',
    title: 'Test Event',
    description: 'A test event',
    date: '2024-12-01',
    time: '20:00',
    location: 'Test Venue',
    address: 'Test Address',
    category_slug: 'musica',
    city_slug: 'bogota',
    Price: 50000,
    image_url: 'https://example.com/image.jpg'
  }

  const mockEventDto: EventDto = {
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
    created_by: testUserId,
    event_url: 'https://example.com/event1',
    active: false
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('mineUrlDirectly', () => {
    it('should successfully mine events from URL', async () => {
      mockFetchHtmlContent.mockResolvedValue({
        success: true,
        method: 'static',
        content: mockHtmlContent.substring(0, 200),
        fullHtml: mockHtmlContent
      })

      mockExtractEventsFromHtml.mockResolvedValue({
        success: true,
        events: [mockExtractedEvent]
      })

      mockProcessExtractedEvents.mockResolvedValue([mockEventDto])

      const result = await mineUrlDirectly(testUrl, testUserId)

      expect(result.success).toBe(true)
      expect(result.eventsExtracted).toBe(1)
      expect(result.eventsStored).toBe(1)
      expect(result.eventsFailed).toBe(0)
      expect(result.details).toContain('Successfully mined 1 events')
      expect(mockFetchHtmlContent).toHaveBeenCalledWith(testUrl)
      expect(mockExtractEventsFromHtml).toHaveBeenCalledWith(mockHtmlContent, testUrl)
      expect(mockProcessExtractedEvents).toHaveBeenCalledWith([mockExtractedEvent], testUserId)
    })

    it('should handle fetch failure', async () => {
      mockFetchHtmlContent.mockResolvedValue({
        success: false,
        method: 'static',
        content: '',
        error: 'Failed to fetch content'
      })

      const result = await mineUrlDirectly(testUrl, testUserId)

      expect(result.success).toBe(false)
      expect(result.eventsExtracted).toBe(0)
      expect(result.eventsStored).toBe(0)
      expect(result.eventsFailed).toBe(0)
      expect(result.error).toBe('Failed to fetch content')
    })

    it('should handle missing HTML content', async () => {
      mockFetchHtmlContent.mockResolvedValue({
        success: true,
        method: 'static',
        content: '',
        fullHtml: undefined
      })

      const result = await mineUrlDirectly(testUrl, testUserId)

      expect(result.success).toBe(false)
      expect(result.eventsExtracted).toBe(0)
      expect(result.eventsStored).toBe(0)
      expect(result.eventsFailed).toBe(0)
      expect(result.error).toBe('No content received from URL')
    })

    it('should handle extraction failure', async () => {
      mockFetchHtmlContent.mockResolvedValue({
        success: true,
        method: 'static',
        content: mockHtmlContent.substring(0, 200),
        fullHtml: mockHtmlContent
      })

      mockExtractEventsFromHtml.mockResolvedValue({
        success: false,
        error: 'AI extraction failed'
      })

      const result = await mineUrlDirectly(testUrl, testUserId)

      expect(result.success).toBe(false)
      expect(result.eventsExtracted).toBe(0)
      expect(result.eventsStored).toBe(0)
      expect(result.eventsFailed).toBe(0)
      expect(result.error).toBe('AI extraction failed')
    })

    it('should handle no events found', async () => {
      mockFetchHtmlContent.mockResolvedValue({
        success: true,
        method: 'static',
        content: mockHtmlContent.substring(0, 200),
        fullHtml: mockHtmlContent
      })

      mockExtractEventsFromHtml.mockResolvedValue({
        success: true,
        events: []
      })

      const result = await mineUrlDirectly(testUrl, testUserId)

      expect(result.success).toBe(true)
      expect(result.eventsExtracted).toBe(0)
      expect(result.eventsStored).toBe(0)
      expect(result.eventsFailed).toBe(0)
      expect(result.details).toBe('No events found in the provided URL')
      expect(mockProcessExtractedEvents).not.toHaveBeenCalled()
    })

    it('should handle null events array', async () => {
      mockFetchHtmlContent.mockResolvedValue({
        success: true,
        method: 'static',
        content: mockHtmlContent.substring(0, 200),
        fullHtml: mockHtmlContent
      })

      mockExtractEventsFromHtml.mockResolvedValue({
        success: true,
        events: undefined as any
      })

      const result = await mineUrlDirectly(testUrl, testUserId)

      expect(result.success).toBe(true)
      expect(result.eventsExtracted).toBe(0)
      expect(result.eventsStored).toBe(0)
      expect(result.eventsFailed).toBe(0)
      expect(result.details).toBe('No events found in the provided URL')
    })

    it('should handle partial storage success', async () => {
      const multipleEvents = [mockExtractedEvent, { ...mockExtractedEvent, title: 'Event 2' }, { ...mockExtractedEvent, title: 'Event 3' }]

      mockFetchHtmlContent.mockResolvedValue({
        success: true,
        method: 'static',
        content: mockHtmlContent.substring(0, 200),
        fullHtml: mockHtmlContent
      })

      mockExtractEventsFromHtml.mockResolvedValue({
        success: true,
        events: multipleEvents
      })

      // Only 2 out of 3 events stored successfully
      mockProcessExtractedEvents.mockResolvedValue([mockEventDto, { ...mockEventDto, id: 'event-2' }])

      const result = await mineUrlDirectly(testUrl, testUserId)

      expect(result.success).toBe(true)
      expect(result.eventsExtracted).toBe(3)
      expect(result.eventsStored).toBe(2)
      expect(result.eventsFailed).toBe(1)
      expect(result.details).toContain('Successfully mined 2 events')
    })

    it('should handle unexpected errors', async () => {
      mockFetchHtmlContent.mockRejectedValue(new Error('Network error'))

      const result = await mineUrlDirectly(testUrl, testUserId)

      expect(result.success).toBe(false)
      expect(result.eventsExtracted).toBe(0)
      expect(result.eventsStored).toBe(0)
      expect(result.eventsFailed).toBe(0)
      expect(result.error).toBe('Network error')
    })

    it('should handle non-Error exceptions', async () => {
      mockFetchHtmlContent.mockRejectedValue('String error')

      const result = await mineUrlDirectly(testUrl, testUserId)

      expect(result.success).toBe(false)
      expect(result.eventsExtracted).toBe(0)
      expect(result.eventsStored).toBe(0)
      expect(result.eventsFailed).toBe(0)
      expect(result.error).toBe('Unexpected error during mining')
    })
  })

  describe('mineUrlDirectlyStreaming', () => {
    it('should call progress callback during mining process', async () => {
      const progressMessages: string[] = []
      const progressCallback: ProgressCallback = (message: string) => {
        progressMessages.push(message)
      }

      mockFetchHtmlContent.mockResolvedValue({
        success: true,
        method: 'static',
        content: mockHtmlContent.substring(0, 200),
        fullHtml: mockHtmlContent
      })

      mockExtractEventsFromHtml.mockResolvedValue({
        success: true,
        events: [mockExtractedEvent]
      })

      mockProcessExtractedEvents.mockResolvedValue([mockEventDto])

      const result = await mineUrlDirectlyStreaming(testUrl, testUserId, progressCallback)

      expect(result.success).toBe(true)
      expect(progressMessages).toContain('Iniciando minería de datos...')
      expect(progressMessages.length).toBeGreaterThan(0)
    })

    it('should work without progress callback', async () => {
      mockFetchHtmlContent.mockResolvedValue({
        success: true,
        method: 'static',
        content: mockHtmlContent.substring(0, 200),
        fullHtml: mockHtmlContent
      })

      mockExtractEventsFromHtml.mockResolvedValue({
        success: true,
        events: [mockExtractedEvent]
      })

      mockProcessExtractedEvents.mockResolvedValue([mockEventDto])

      const result = await mineUrlDirectlyStreaming(testUrl, testUserId)

      expect(result.success).toBe(true)
      expect(result.eventsExtracted).toBe(1)
      expect(result.eventsStored).toBe(1)
    })

    it('should handle fetch failure with progress callback', async () => {
      const progressMessages: string[] = []
      const progressCallback: ProgressCallback = (message: string) => {
        progressMessages.push(message)
      }

      mockFetchHtmlContent.mockResolvedValue({
        success: false,
        method: 'static',
        content: '',
        error: 'Connection failed'
      })

      const result = await mineUrlDirectlyStreaming(testUrl, testUserId, progressCallback)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Connection failed')
      expect(progressMessages).toContain('Iniciando minería de datos...')
    })

    it('should handle extraction failure with progress callback', async () => {
      const progressMessages: string[] = []
      const progressCallback: ProgressCallback = (message: string) => {
        progressMessages.push(message)
      }

      mockFetchHtmlContent.mockResolvedValue({
        success: true,
        method: 'static',
        content: mockHtmlContent.substring(0, 200),
        fullHtml: mockHtmlContent
      })

      mockExtractEventsFromHtml.mockResolvedValue({
        success: false,
        error: 'Extraction error'
      })

      const result = await mineUrlDirectlyStreaming(testUrl, testUserId, progressCallback)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Extraction error')
      expect(progressMessages.length).toBeGreaterThan(0)
    })

    it('should handle no events found with progress callback', async () => {
      const progressMessages: string[] = []
      const progressCallback: ProgressCallback = (message: string) => {
        progressMessages.push(message)
      }

      mockFetchHtmlContent.mockResolvedValue({
        success: true,
        method: 'static',
        content: mockHtmlContent.substring(0, 200),
        fullHtml: mockHtmlContent
      })

      mockExtractEventsFromHtml.mockResolvedValue({
        success: true,
        events: []
      })

      const result = await mineUrlDirectlyStreaming(testUrl, testUserId, progressCallback)

      expect(result.success).toBe(true)
      expect(result.eventsExtracted).toBe(0)
      expect(result.details).toBe('No events found in the provided URL')
      expect(progressMessages).toContain('Iniciando minería de datos...')
    })

    it('should handle unexpected errors with progress callback', async () => {
      const progressMessages: string[] = []
      const progressCallback: ProgressCallback = (message: string) => {
        progressMessages.push(message)
      }

      mockFetchHtmlContent.mockRejectedValue(new Error('Unexpected failure'))

      const result = await mineUrlDirectlyStreaming(testUrl, testUserId, progressCallback)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Unexpected failure')
      expect(progressMessages).toContain('Iniciando minería de datos...')
    })

    it('should handle all events failing to store', async () => {
      mockFetchHtmlContent.mockResolvedValue({
        success: true,
        method: 'static',
        content: mockHtmlContent.substring(0, 200),
        fullHtml: mockHtmlContent
      })

      mockExtractEventsFromHtml.mockResolvedValue({
        success: true,
        events: [mockExtractedEvent, { ...mockExtractedEvent, title: 'Event 2' }]
      })

      // All events failed to store
      mockProcessExtractedEvents.mockResolvedValue([])

      const result = await mineUrlDirectlyStreaming(testUrl, testUserId)

      expect(result.success).toBe(true)
      expect(result.eventsExtracted).toBe(2)
      expect(result.eventsStored).toBe(0)
      expect(result.eventsFailed).toBe(2)
      expect(result.details).toContain('Successfully mined 0 events')
    })

    it('should handle empty fullHtml in fetch result', async () => {
      mockFetchHtmlContent.mockResolvedValue({
        success: true,
        method: 'static',
        content: '',
        fullHtml: ''
      })

      const result = await mineUrlDirectlyStreaming(testUrl, testUserId)

      expect(result.success).toBe(false)
      expect(result.error).toBe('No content received from URL')
    })

    it('should propagate fetch error message when available', async () => {
      mockFetchHtmlContent.mockResolvedValue({
        success: false,
        method: 'static',
        content: '',
        error: 'HTTP 404: Not Found'
      })

      const result = await mineUrlDirectlyStreaming(testUrl, testUserId)

      expect(result.success).toBe(false)
      expect(result.error).toBe('HTTP 404: Not Found')
    })

    it('should use default error message when fetch error is undefined', async () => {
      mockFetchHtmlContent.mockResolvedValue({
        success: false,
        method: 'static',
        content: '',
        error: undefined
      })

      const result = await mineUrlDirectlyStreaming(testUrl, testUserId)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Failed to fetch URL content')
    })

    it('should use default error message when extraction error is undefined', async () => {
      mockFetchHtmlContent.mockResolvedValue({
        success: true,
        method: 'static',
        content: mockHtmlContent.substring(0, 200),
        fullHtml: mockHtmlContent
      })

      mockExtractEventsFromHtml.mockResolvedValue({
        success: false,
        error: undefined
      })

      const result = await mineUrlDirectlyStreaming(testUrl, testUserId)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Failed to extract events from content')
    })
  })

  describe('MiningResult interface', () => {
    it('should return properly structured MiningResult on success', async () => {
      mockFetchHtmlContent.mockResolvedValue({
        success: true,
        method: 'static',
        content: mockHtmlContent.substring(0, 200),
        fullHtml: mockHtmlContent
      })

      mockExtractEventsFromHtml.mockResolvedValue({
        success: true,
        events: [mockExtractedEvent]
      })

      mockProcessExtractedEvents.mockResolvedValue([mockEventDto])

      const result = await mineUrlDirectly(testUrl, testUserId)

      expect(result).toHaveProperty('success')
      expect(result).toHaveProperty('eventsExtracted')
      expect(result).toHaveProperty('eventsStored')
      expect(result).toHaveProperty('eventsFailed')
      expect(result).toHaveProperty('details')
      expect(result).not.toHaveProperty('error')
      expect(typeof result.success).toBe('boolean')
      expect(typeof result.eventsExtracted).toBe('number')
      expect(typeof result.eventsStored).toBe('number')
      expect(typeof result.eventsFailed).toBe('number')
      expect(typeof result.details).toBe('string')
    })

    it('should return properly structured MiningResult on failure', async () => {
      mockFetchHtmlContent.mockResolvedValue({
        success: false,
        method: 'static',
        content: '',
        error: 'Test error'
      })

      const result = await mineUrlDirectly(testUrl, testUserId)

      expect(result).toHaveProperty('success')
      expect(result).toHaveProperty('eventsExtracted')
      expect(result).toHaveProperty('eventsStored')
      expect(result).toHaveProperty('eventsFailed')
      expect(result).toHaveProperty('error')
      expect(result).not.toHaveProperty('details')
      expect(result.success).toBe(false)
      expect(result.eventsExtracted).toBe(0)
      expect(result.eventsStored).toBe(0)
      expect(result.eventsFailed).toBe(0)
    })
  })
})
