import { jest, describe, it, expect, beforeEach } from '@jest/globals'
import OpenAI from 'openai'
import { getKiloClient } from '../src/utils/llm-client'
import { enrichEventFromHtml } from '../src/utils/event-enricher'
import { ExtractedEvent } from '../src/event-schema'

jest.mock('../src/utils/llm-client', () => ({
  getKiloClient: jest.fn()
}))

function makeApiError(status: number, message: string) {
  return OpenAI.APIError.generate(status, { error: { message } }, message, new Headers())
}

describe('event-enricher', () => {
  const originalEvent: ExtractedEvent = {
    source_url: 'https://example.com/events',
    event_url: 'https://example.com/event1',
    title: 'Concierto de Rock',
    description: 'Un concierto de rock en Bogotá',
    date: '2026-06-15',
    time: '20:00',
    location: 'Teatro Municipal',
    address: 'Calle 10',
    category_slug: 'musica',
    city_slug: 'bogota',
    Price: 50000,
    image_url: null,
  }

  const detailHtml = '<html><body><h1>Concierto de Rock en Bogotá</h1><p>Descripción detallada</p></body></html>'

  let mockCreate: jest.MockedFunction<any>

  beforeEach(() => {
    jest.clearAllMocks()
    jest.spyOn(console, 'warn').mockImplementation(() => undefined)

    mockCreate = jest.fn()
    const mockClient = {
      chat: {
        completions: {
          create: mockCreate
        }
      }
    }

    ;(getKiloClient as jest.MockedFunction<typeof getKiloClient>).mockReturnValue(mockClient as any)
  })

  it('should enrich fields when detail page has better data', async () => {
    mockCreate.mockResolvedValue({
      choices: [{
        message: {
          content: JSON.stringify({
            title: null,
            description: 'Concierto de rock con artistas invitados especiales, puertas abren a las 19:00',
            location: null,
            address: 'Calle 10 #5-20, Centro Histórico',
            Price: 55000,
            date_time_confirmed: true,
            confirmation_reason: 'La fecha y hora coinciden',
          })
        }
      }]
    })

    const result = await enrichEventFromHtml(detailHtml, originalEvent, originalEvent.event_url)

    expect(result.success).toBe(true)
    expect(result.dateTimeConfirmed).toBe(true)
    expect(result.enrichedFields.description).toBe('Concierto de rock con artistas invitados especiales, puertas abren a las 19:00')
    expect(result.enrichedFields.address).toBe('Calle 10 #5-20, Centro Histórico')
    expect(result.enrichedFields.Price).toBe(55000)
    expect(result.enrichedFields.title).toBeUndefined()
    expect(result.enrichedFields.location).toBeUndefined()
  })

  it('should include image_url when the original was null and the detail page has an image', async () => {
    mockCreate.mockResolvedValue({
      choices: [{
        message: {
          content: JSON.stringify({
            title: null,
            description: null,
            location: null,
            address: null,
            Price: null,
            image_url: 'https://example.com/event1/cover.jpg',
            date_time_confirmed: true,
            confirmation_reason: 'La fecha y hora coinciden',
          })
        }
      }]
    })

    const result = await enrichEventFromHtml(detailHtml, originalEvent, originalEvent.event_url)

    expect(result.success).toBe(true)
    expect(result.enrichedFields.image_url).toBe('https://example.com/event1/cover.jpg')
  })

  it('should omit image_url when the detail page has no image for the event', async () => {
    mockCreate.mockResolvedValue({
      choices: [{
        message: {
          content: JSON.stringify({
            title: null,
            description: null,
            location: null,
            address: null,
            Price: null,
            image_url: null,
            date_time_confirmed: true,
            confirmation_reason: 'La fecha y hora coinciden',
          })
        }
      }]
    })

    const result = await enrichEventFromHtml(detailHtml, originalEvent, originalEvent.event_url)

    expect(result.success).toBe(true)
    expect(result.enrichedFields.image_url).toBeUndefined()
  })

  it('should omit fields when LLM returns null', async () => {
    mockCreate.mockResolvedValue({
      choices: [{
        message: {
          content: JSON.stringify({
            title: null,
            description: null,
            location: null,
            address: null,
            Price: null,
            date_time_confirmed: true,
            confirmation_reason: 'La fecha y hora coinciden',
          })
        }
      }]
    })

    const result = await enrichEventFromHtml(detailHtml, originalEvent, originalEvent.event_url)

    expect(result.success).toBe(true)
    expect(result.dateTimeConfirmed).toBe(true)
    expect(Object.keys(result.enrichedFields)).toHaveLength(0)
  })

  it('should enrich time when original time was a sentinel and detail page shows a real time', async () => {
    const sentinelEvent: ExtractedEvent = { ...originalEvent, time: '08:00' }
    mockCreate.mockResolvedValue({
      choices: [{
        message: {
          content: JSON.stringify({
            title: null,
            description: null,
            location: null,
            address: null,
            Price: null,
            time: '19:30',
            date_time_confirmed: true,
            confirmation_reason: 'La hora original era un centinela (08:00) y la página de detalle muestra 19:30',
          })
        }
      }]
    })

    const result = await enrichEventFromHtml(detailHtml, sentinelEvent, sentinelEvent.event_url)

    expect(result.success).toBe(true)
    expect(result.dateTimeConfirmed).toBe(true)
    expect(result.enrichedFields.time).toBe('19:30')
  })

  it('should omit time when the detail page has no real time', async () => {
    mockCreate.mockResolvedValue({
      choices: [{
        message: {
          content: JSON.stringify({
            title: null,
            description: null,
            location: null,
            address: null,
            Price: null,
            time: null,
            date_time_confirmed: false,
            confirmation_reason: 'No se encontró fecha/hora en la página',
          })
        }
      }]
    })

    const result = await enrichEventFromHtml(detailHtml, originalEvent, originalEvent.event_url)

    expect(result.success).toBe(true)
    expect(result.dateTimeConfirmed).toBe(false)
    expect(result.enrichedFields.time).toBeUndefined()
  })

  it('should set dateTimeConfirmed = true when LLM confirms match', async () => {
    mockCreate.mockResolvedValue({
      choices: [{
        message: {
          content: JSON.stringify({
            date_time_confirmed: true,
            confirmation_reason: 'La fecha y hora coinciden',
          })
        }
      }]
    })

    const result = await enrichEventFromHtml(detailHtml, originalEvent, originalEvent.event_url)

    expect(result.success).toBe(true)
    expect(result.dateTimeConfirmed).toBe(true)
  })

  it('should set dateTimeConfirmed = false when LLM reports mismatch', async () => {
    mockCreate.mockResolvedValue({
      choices: [{
        message: {
          content: JSON.stringify({
            date_time_confirmed: false,
            description: 'Descripción mejorada',
            confirmation_reason: 'Las fechas no coinciden',
          })
        }
      }]
    })

    const result = await enrichEventFromHtml(detailHtml, originalEvent, originalEvent.event_url)

    expect(result.success).toBe(true)
    expect(result.dateTimeConfirmed).toBe(false)
    expect(result.enrichedFields.description).toBe('Descripción mejorada')
  })

  describe('API error scenarios', () => {
    it('should handle API key errors', async () => {
      const authError = makeApiError(401, 'Invalid API key')
      mockCreate.mockRejectedValue(authError)

      const result = await enrichEventFromHtml(detailHtml, originalEvent, originalEvent.event_url)

      expect(result.success).toBe(false)
      expect(result.dateTimeConfirmed).toBe(false)
      expect(result.enrichedFields).toEqual({})
      expect(result.error).toBe('Invalid or missing API key for Kilo Gateway')
    })

    it('should handle quota exceeded errors', async () => {
      const rateLimitError = makeApiError(429, 'Rate limit exceeded')
      mockCreate.mockRejectedValue(rateLimitError)

      const result = await enrichEventFromHtml(detailHtml, originalEvent, originalEvent.event_url)

      expect(result.success).toBe(false)
      expect(result.dateTimeConfirmed).toBe(false)
      expect(result.error).toBe('API quota exceeded or rate limit reached')
    })

    it('should handle timeout errors', async () => {
      const timeoutError = makeApiError(408, 'Request timeout')
      mockCreate.mockRejectedValue(timeoutError)

      const result = await enrichEventFromHtml(detailHtml, originalEvent, originalEvent.event_url)

      expect(result.success).toBe(false)
      expect(result.dateTimeConfirmed).toBe(false)
      expect(result.error).toBe('Request timeout when calling Kilo Gateway')
    })

    it('should handle generic API errors', async () => {
      const genericError = makeApiError(500, 'Some API error occurred')
      mockCreate.mockRejectedValue(genericError)

      const result = await enrichEventFromHtml(detailHtml, originalEvent, originalEvent.event_url)

      expect(result.success).toBe(false)
      expect(result.dateTimeConfirmed).toBe(false)
      expect(result.error).toBe(`Error from Kilo Gateway: ${genericError.message}`)
    })

    it('should handle non-APIError Error exceptions', async () => {
      mockCreate.mockRejectedValue(new Error('API error'))

      const result = await enrichEventFromHtml(detailHtml, originalEvent, originalEvent.event_url)

      expect(result.success).toBe(false)
      expect(result.dateTimeConfirmed).toBe(false)
      expect(result.enrichedFields).toEqual({})
      expect(result.error).toBe('API error')
    })

    it('should handle non-Error exceptions', async () => {
      mockCreate.mockRejectedValue('string error')

      const result = await enrichEventFromHtml(detailHtml, originalEvent, originalEvent.event_url)

      expect(result.success).toBe(false)
      expect(result.dateTimeConfirmed).toBe(false)
      expect(result.error).toBe('Unknown error')
    })
  })

  it('should return success: false, dateTimeConfirmed: false on parse error', async () => {
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: 'not valid json{{{' } }]
    })

    const result = await enrichEventFromHtml(detailHtml, originalEvent, originalEvent.event_url)

    expect(result.success).toBe(false)
    expect(result.dateTimeConfirmed).toBe(false)
    expect(result.enrichedFields).toEqual({})
    expect(result.error).toBe('Failed to parse JSON response')
  })

  it('should return success: false when Kilo Gateway returns no content', async () => {
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: '' } }]
    })

    const result = await enrichEventFromHtml(detailHtml, originalEvent, originalEvent.event_url)

    expect(result.success).toBe(false)
    expect(result.dateTimeConfirmed).toBe(false)
    expect(result.error).toBe('No response from Kilo Gateway')
  })
})