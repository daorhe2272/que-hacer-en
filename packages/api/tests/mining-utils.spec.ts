import { jest, describe, it, expect, beforeEach } from '@jest/globals'

jest.mock('../src/utils/html-fetcher')
jest.mock('../src/utils/event-extractor')
jest.mock('../src/utils/event-processor')

import { mineUrlDirectly, mineUrlDirectlyStreaming, mineUrlsDirectlyStreaming, ProgressCallback } from '../src/utils/mining-utils'
import { fetchHtmlContent } from '../src/utils/html-fetcher'
import { extractEventsFromHtml } from '../src/utils/event-extractor'
import { processExtractedEvents } from '../src/utils/event-processor'
import { ExtractedEvent } from '../src/event-schema'
import { EventDto } from '../src/db/repository'

const mockFetchHtmlContent = jest.mocked(fetchHtmlContent)
const mockExtractEventsFromHtml = jest.mocked(extractEventsFromHtml)
const mockProcessExtractedEvents = jest.mocked(processExtractedEvents)

jest.spyOn(console, 'log').mockImplementation(() => undefined)
jest.spyOn(console, 'error').mockImplementation(() => undefined)

describe('mining-utils', () => {
  const testUrl = 'https://example.com/events'
  const testUrl2 = 'https://example.com/events2'
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

  function mockSuccessfulFetch(html: string = mockHtmlContent) {
    mockFetchHtmlContent.mockResolvedValue({
      success: true,
      method: 'static',
      content: html.substring(0, 200),
      fullHtml: html
    })
  }

  function mockSuccessfulExtraction(events: ExtractedEvent[] = [mockExtractedEvent]) {
    mockExtractEventsFromHtml.mockResolvedValue({
      success: true,
      events
    })
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('mineUrlDirectly', () => {
    it('should successfully mine events from URL', async () => {
      mockSuccessfulFetch()
      mockSuccessfulExtraction()
      mockProcessExtractedEvents.mockResolvedValue([mockEventDto])

      const result = await mineUrlDirectly(testUrl, testUserId)

      expect(result.success).toBe(true)
      expect(result.eventsExtracted).toBe(1)
      expect(result.eventsStored).toBe(1)
      expect(result.eventsFailed).toBe(0)
      expect(mockFetchHtmlContent).toHaveBeenCalledWith(testUrl)
      expect(mockExtractEventsFromHtml).toHaveBeenCalledWith(mockHtmlContent, testUrl)
      expect(mockProcessExtractedEvents).toHaveBeenCalledWith([mockExtractedEvent], testUserId)
    })

    it('should handle fetch failure', async () => {
      mockFetchHtmlContent.mockResolvedValue({
        success: false, method: 'static', content: '', error: 'Failed to fetch content'
      })

      const result = await mineUrlDirectly(testUrl, testUserId)

      expect(result.success).toBe(true)
      expect(result.eventsExtracted).toBe(0)
      expect(result.details).toContain('No events found')
    })

    it('should handle missing HTML content', async () => {
      mockFetchHtmlContent.mockResolvedValue({
        success: true, method: 'static', content: '', fullHtml: undefined
      })

      const result = await mineUrlDirectly(testUrl, testUserId)

      expect(result.success).toBe(true)
      expect(result.eventsExtracted).toBe(0)
    })

    it('should handle extraction failure', async () => {
      mockSuccessfulFetch()
      mockExtractEventsFromHtml.mockResolvedValue({
        success: false, error: 'AI extraction failed'
      })

      const result = await mineUrlDirectly(testUrl, testUserId)

      expect(result.success).toBe(true)
      expect(result.eventsExtracted).toBe(0)
    })

    it('should handle no events found', async () => {
      mockSuccessfulFetch()
      mockSuccessfulExtraction([])

      const result = await mineUrlDirectly(testUrl, testUserId)

      expect(result.success).toBe(true)
      expect(result.eventsExtracted).toBe(0)
      expect(mockProcessExtractedEvents).not.toHaveBeenCalled()
    })

    it('should handle partial storage success', async () => {
      const multipleEvents = [mockExtractedEvent, { ...mockExtractedEvent, title: 'Event 2' }, { ...mockExtractedEvent, title: 'Event 3' }]

      mockSuccessfulFetch()
      mockSuccessfulExtraction(multipleEvents)
      mockProcessExtractedEvents.mockResolvedValue([mockEventDto, { ...mockEventDto, id: 'event-2' }])

      const result = await mineUrlDirectly(testUrl, testUserId)

      expect(result.success).toBe(true)
      expect(result.eventsExtracted).toBe(3)
      expect(result.eventsStored).toBe(2)
      expect(result.eventsFailed).toBe(1)
    })

    it('should handle unexpected errors', async () => {
      mockProcessExtractedEvents.mockRejectedValue(new Error('Unexpected error'))

      mockSuccessfulFetch()
      mockSuccessfulExtraction()

      // The error comes from processExtractedEvents which is inside the try/catch
      const result = await mineUrlDirectly(testUrl, testUserId)

      // Since processExtractedEvents throws, the catch block returns error
      expect(result.success).toBe(false)
    })
  })

  describe('mineUrlDirectlyStreaming', () => {
    it('should call progress callback during mining process', async () => {
      const progressMessages: string[] = []
      const progressCallback: ProgressCallback = (message: string) => {
        progressMessages.push(message)
      }

      mockSuccessfulFetch()
      mockSuccessfulExtraction()
      mockProcessExtractedEvents.mockResolvedValue([mockEventDto])

      const result = await mineUrlDirectlyStreaming(testUrl, testUserId, progressCallback)

      expect(result.success).toBe(true)
      expect(progressMessages).toContain('Iniciando minería de datos...')
    })

    it('should work without progress callback', async () => {
      mockSuccessfulFetch()
      mockSuccessfulExtraction()
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
        success: false, method: 'static', content: '', error: 'Connection failed'
      })

      const result = await mineUrlDirectlyStreaming(testUrl, testUserId, progressCallback)

      expect(result.success).toBe(true)
      expect(result.eventsExtracted).toBe(0)
      expect(progressMessages).toContain('Iniciando minería de datos...')
    })

    it('should handle all events failing to store', async () => {
      mockSuccessfulFetch()
      mockSuccessfulExtraction([mockExtractedEvent, { ...mockExtractedEvent, title: 'Event 2' }])
      mockProcessExtractedEvents.mockResolvedValue([])

      const result = await mineUrlDirectlyStreaming(testUrl, testUserId)

      expect(result.success).toBe(true)
      expect(result.eventsExtracted).toBe(2)
      expect(result.eventsStored).toBe(0)
      expect(result.eventsFailed).toBe(2)
    })

    it('should handle empty fullHtml in fetch result', async () => {
      mockFetchHtmlContent.mockResolvedValue({
        success: true, method: 'static', content: '', fullHtml: ''
      })

      const result = await mineUrlDirectlyStreaming(testUrl, testUserId)

      expect(result.success).toBe(true)
      expect(result.eventsExtracted).toBe(0)
    })
  })

  describe('mineUrlsDirectlyStreaming', () => {
    it('should mine multiple URLs and merge events', async () => {
      const event1 = mockExtractedEvent
      const event2 = { ...mockExtractedEvent, title: 'Event 2', source_url: testUrl2, event_url: 'https://example.com/event2' }

      mockFetchHtmlContent.mockImplementation(async () => ({
        success: true, method: 'static' as const, content: mockHtmlContent.substring(0, 200), fullHtml: mockHtmlContent
      }))
      mockExtractEventsFromHtml.mockImplementation(async (_html: string, url: string) => {
        if (url === testUrl) return { success: true, events: [event1] }
        return { success: true, events: [event2] }
      })
      mockProcessExtractedEvents.mockResolvedValue([mockEventDto, { ...mockEventDto, id: 'event-2' }])

      const result = await mineUrlsDirectlyStreaming([testUrl, testUrl2], testUserId)

      expect(result.success).toBe(true)
      expect(result.eventsExtracted).toBe(2)
      expect(result.eventsStored).toBe(2)
      expect(mockProcessExtractedEvents).toHaveBeenCalledWith([event1, event2], testUserId)
    })

    it('should skip a URL that fails to fetch but process others', async () => {
      const event1 = mockExtractedEvent

      mockFetchHtmlContent.mockImplementation(async (url: string) => {
        if (url === testUrl) return { success: true, method: 'static' as const, content: '', fullHtml: mockHtmlContent }
        return { success: false, method: 'static' as const, content: '', error: 'Failed' }
      })
      mockExtractEventsFromHtml.mockResolvedValue({ success: true, events: [event1] })
      mockProcessExtractedEvents.mockResolvedValue([mockEventDto])

      const result = await mineUrlsDirectlyStreaming([testUrl, testUrl2], testUserId)

      expect(result.success).toBe(true)
      expect(result.eventsExtracted).toBe(1)
      expect(result.eventsStored).toBe(1)
    })

    it('should skip a URL that fails extraction but process others', async () => {
      const event2 = { ...mockExtractedEvent, title: 'Event 2', source_url: testUrl2 }

      mockFetchHtmlContent.mockResolvedValue({
        success: true, method: 'static' as const, content: '', fullHtml: mockHtmlContent
      })
      mockExtractEventsFromHtml.mockImplementation(async (_html: string, url: string) => {
        if (url === testUrl) return { success: false, error: 'Extraction failed' }
        return { success: true, events: [event2] }
      })
      mockProcessExtractedEvents.mockResolvedValue([{ ...mockEventDto, title: 'Event 2' }])

      const result = await mineUrlsDirectlyStreaming([testUrl, testUrl2], testUserId)

      expect(result.success).toBe(true)
      expect(result.eventsExtracted).toBe(1)
      expect(result.eventsStored).toBe(1)
    })

    it('should call progress callback with multi-URL messages', async () => {
      const progressMessages: string[] = []
      const progressCallback: ProgressCallback = (message: string) => {
        progressMessages.push(message)
      }

      mockSuccessfulFetch()
      mockSuccessfulExtraction()
      mockProcessExtractedEvents.mockResolvedValue([mockEventDto])

      await mineUrlsDirectlyStreaming([testUrl], testUserId, progressCallback)

      expect(progressMessages).toContain('Iniciando minería de datos...')
      expect(progressMessages.some(m => m.includes('Procesando'))).toBe(true)
    })

    it('should return no-events result when all URLs yield no events', async () => {
      mockSuccessfulFetch()
      mockSuccessfulExtraction([])

      const result = await mineUrlsDirectlyStreaming([testUrl, testUrl2], testUserId)

      expect(result.success).toBe(true)
      expect(result.eventsExtracted).toBe(0)
      expect(result.details).toContain('No events found')
    })

    it('should handle unexpected errors', async () => {
      mockFetchHtmlContent.mockRejectedValue(new Error('Network error'))

      const result = await mineUrlsDirectlyStreaming([testUrl], testUserId)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Network error')
    })

    it('should handle non-Error exceptions', async () => {
      mockFetchHtmlContent.mockRejectedValue('String error')

      const result = await mineUrlsDirectlyStreaming([testUrl], testUserId)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Unexpected error during mining')
    })
  })

  describe('MiningResult interface', () => {
    it('should return properly structured MiningResult on success', async () => {
      mockSuccessfulFetch()
      mockSuccessfulExtraction()
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
      mockFetchHtmlContent.mockRejectedValue(new Error('Test error'))

      const result = await mineUrlDirectly(testUrl, testUserId)

      expect(result).toHaveProperty('success')
      expect(result).toHaveProperty('eventsExtracted')
      expect(result).toHaveProperty('eventsStored')
      expect(result).toHaveProperty('eventsFailed')
      expect(result).toHaveProperty('error')
      expect(result.success).toBe(false)
      expect(result.eventsExtracted).toBe(0)
      expect(result.eventsStored).toBe(0)
      expect(result.eventsFailed).toBe(0)
    })
  })
})
