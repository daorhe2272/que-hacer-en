import { jest, describe, it, expect, beforeEach } from '@jest/globals'
import { GoogleGenAI } from "@google/genai";
import { extractEventsFromHtml } from '../src/utils/event-extractor'

// Mock the GoogleGenAI module
jest.mock('@google/genai', () => ({
  GoogleGenAI: jest.fn(),
  Type: {
    OBJECT: 'object',
    ARRAY: 'array',
    STRING: 'string',
    NUMBER: 'number'
  }
}))

describe('extractEventsFromHtml', () => {
  let mockAi: any
  let mockModels: any
  let mockGenerateContent: jest.MockedFunction<any>

  beforeEach(() => {
    jest.clearAllMocks()

    // Setup mock chain
    mockGenerateContent = jest.fn()
    mockModels = {
      generateContent: mockGenerateContent
    }
    mockAi = {
      models: mockModels
    }

    // Mock the GoogleGenAI constructor
    ;(GoogleGenAI as jest.MockedClass<typeof GoogleGenAI>).mockImplementation(() => mockAi)
  })

  describe('successful extraction', () => {
    it('should extract events successfully with valid response', async () => {
      const mockResponse = {
        text: JSON.stringify({
          events: [
            {
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
          ]
        })
      }

      mockGenerateContent.mockResolvedValue(mockResponse)

      const result = await extractEventsFromHtml('<html>Test content</html>', 'https://example.com')

      expect(result.success).toBe(true)
      expect(result.events).toHaveLength(1)
      expect(result.events![0]).toEqual({
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
      })
      expect(result.error).toBeUndefined()
    })

    it('should return empty events array when no events found', async () => {
      const mockResponse = {
        text: JSON.stringify({
          events: []
        })
      }

      mockGenerateContent.mockResolvedValue(mockResponse)

      const result = await extractEventsFromHtml('<html>No events here</html>', 'https://example.com')

      expect(result.success).toBe(true)
      expect(result.events).toEqual([])
      expect(result.error).toBeUndefined()
    })
  })

  describe('API error scenarios', () => {
    it('should handle API key errors', async () => {
      const apiKeyError = new Error('API_KEY_INVALID')
      mockGenerateContent.mockRejectedValue(apiKeyError)

      const result = await extractEventsFromHtml('<html>Test</html>', 'https://example.com')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Invalid or missing API key for Gemini API')
      expect(result.events).toBeUndefined()
    })

    it('should handle quota exceeded errors', async () => {
      const quotaError = new Error('Quota exceeded for quota_limit')
      mockGenerateContent.mockRejectedValue(quotaError)

      const result = await extractEventsFromHtml('<html>Test</html>', 'https://example.com')

      expect(result.success).toBe(false)
      expect(result.error).toBe('API quota exceeded or rate limit reached')
      expect(result.events).toBeUndefined()
    })

    it('should handle timeout errors', async () => {
      const timeoutError = new Error('Request timeout')
      mockGenerateContent.mockRejectedValue(timeoutError)

      const result = await extractEventsFromHtml('<html>Test</html>', 'https://example.com')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Request timeout when calling Gemini API')
      expect(result.events).toBeUndefined()
    })

    it('should handle generic API errors', async () => {
      const genericError = new Error('Some API error occurred')
      mockGenerateContent.mockRejectedValue(genericError)

      const result = await extractEventsFromHtml('<html>Test</html>', 'https://example.com')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Error from Gemini API: Some API error occurred')
      expect(result.events).toBeUndefined()
    })

    it('should handle non-Error exceptions', async () => {
      mockGenerateContent.mockRejectedValue('String error')

      const result = await extractEventsFromHtml('<html>Test</html>', 'https://example.com')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Unknown error occurred while extracting events')
      expect(result.events).toBeUndefined()
    })
  })

  describe('response parsing errors', () => {
    it('should handle empty response text', async () => {
      const mockResponse = {
        text: ''
      }

      mockGenerateContent.mockResolvedValue(mockResponse)

      const result = await extractEventsFromHtml('<html>Test</html>', 'https://example.com')

      expect(result.success).toBe(false)
      expect(result.error).toBe('No response received from Gemini API')
      expect(result.events).toBeUndefined()
    })

    it('should handle invalid JSON response', async () => {
      const mockResponse = {
        text: 'invalid json {'
      }

      mockGenerateContent.mockResolvedValue(mockResponse)

      const result = await extractEventsFromHtml('<html>Test</html>', 'https://example.com')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Failed to parse JSON response from Gemini API')
      expect(result.events).toBeUndefined()
    })

    it('should handle missing events array in response', async () => {
      const mockResponse = {
        text: JSON.stringify({
          someOtherField: 'value'
        })
      }

      mockGenerateContent.mockResolvedValue(mockResponse)

      const result = await extractEventsFromHtml('<html>Test</html>', 'https://example.com')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Invalid response structure: missing events array')
      expect(result.events).toBeUndefined()
    })

    it('should handle non-array events field', async () => {
      const mockResponse = {
        text: JSON.stringify({
          events: 'not an array'
        })
      }

      mockGenerateContent.mockResolvedValue(mockResponse)

      const result = await extractEventsFromHtml('<html>Test</html>', 'https://example.com')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Invalid response structure: missing events array')
      expect(result.events).toBeUndefined()
    })
  })

  describe('logging', () => {
    it('should log JSON parsing errors', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined)
      const mockResponse = {
        text: () => 'invalid json {'
      }

      mockGenerateContent.mockResolvedValue(mockResponse)

      await extractEventsFromHtml('<html>Test</html>', 'https://example.com')

      expect(consoleSpy).toHaveBeenCalledWith(
        '[Event Extractor] Failed to parse JSON response:',
        expect.any(SyntaxError)
      )

      consoleSpy.mockRestore()
    })

    it('should log general errors', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined)
      const apiError = new Error('Test error')
      mockGenerateContent.mockRejectedValue(apiError)

      await extractEventsFromHtml('<html>Test</html>', 'https://example.com')

      expect(consoleSpy).toHaveBeenCalledWith(
        '[Event Extractor] Error extracting events:',
        apiError
      )

      consoleSpy.mockRestore()
    })
  })
})