import { jest, describe, it, expect, beforeEach } from '@jest/globals'

jest.mock('@google/genai', () => {
  const mockGenerateContent = jest.fn()
  return {
    GoogleGenAI: jest.fn().mockImplementation(() => ({
      models: { generateContent: mockGenerateContent },
    })),
    Type: { STRING: 'STRING', NUMBER: 'NUMBER', INTEGER: 'INTEGER', BOOLEAN: 'BOOLEAN', ARRAY: 'ARRAY', OBJECT: 'OBJECT' },
    __mockGenerateContent: mockGenerateContent,
  }
})

import { enrichEventFromHtml } from '../src/utils/event-enricher'
import { ExtractedEvent } from '../src/event-schema'

const { __mockGenerateContent } = require('@google/genai') as any
const mockGenerateContent = __mockGenerateContent as jest.MockedFunction<typeof __mockGenerateContent>

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

  beforeEach(() => {
    jest.clearAllMocks()
    jest.spyOn(console, 'warn').mockImplementation(() => undefined)
  })

  it('should enrich fields when detail page has better data', async () => {
    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify({
        title: null,
        description: 'Concierto de rock con artistas invitados especiales, puertas abren a las 19:00',
        location: null,
        address: 'Calle 10 #5-20, Centro Histórico',
        Price: 55000,
        date_time_confirmed: true,
      }),
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

  it('should omit fields when LLM returns null', async () => {
    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify({
        title: null,
        description: null,
        location: null,
        address: null,
        Price: null,
        date_time_confirmed: true,
      }),
    })

    const result = await enrichEventFromHtml(detailHtml, originalEvent, originalEvent.event_url)

    expect(result.success).toBe(true)
    expect(result.dateTimeConfirmed).toBe(true)
    expect(Object.keys(result.enrichedFields)).toHaveLength(0)
  })

  it('should set dateTimeConfirmed = true when LLM confirms match', async () => {
    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify({
        date_time_confirmed: true,
      }),
    })

    const result = await enrichEventFromHtml(detailHtml, originalEvent, originalEvent.event_url)

    expect(result.success).toBe(true)
    expect(result.dateTimeConfirmed).toBe(true)
  })

  it('should set dateTimeConfirmed = false when LLM reports mismatch', async () => {
    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify({
        date_time_confirmed: false,
        description: 'Descripción mejorada',
      }),
    })

    const result = await enrichEventFromHtml(detailHtml, originalEvent, originalEvent.event_url)

    expect(result.success).toBe(true)
    expect(result.dateTimeConfirmed).toBe(false)
    expect(result.enrichedFields.description).toBe('Descripción mejorada')
  })

  it('should return success: false, dateTimeConfirmed: false on API error', async () => {
    mockGenerateContent.mockRejectedValue(new Error('API error'))

    const result = await enrichEventFromHtml(detailHtml, originalEvent, originalEvent.event_url)

    expect(result.success).toBe(false)
    expect(result.dateTimeConfirmed).toBe(false)
    expect(result.enrichedFields).toEqual({})
    expect(result.error).toBe('API error')
  })

  it('should return success: false, dateTimeConfirmed: false on parse error', async () => {
    mockGenerateContent.mockResolvedValue({
      text: 'not valid json{{{',
    })

    const result = await enrichEventFromHtml(detailHtml, originalEvent, originalEvent.event_url)

    expect(result.success).toBe(false)
    expect(result.dateTimeConfirmed).toBe(false)
    expect(result.enrichedFields).toEqual({})
    expect(result.error).toBe('Failed to parse JSON response')
  })

  it('should return success: false when Gemini returns no text', async () => {
    mockGenerateContent.mockResolvedValue({ text: '' })

    const result = await enrichEventFromHtml(detailHtml, originalEvent, originalEvent.event_url)

    expect(result.success).toBe(false)
    expect(result.dateTimeConfirmed).toBe(false)
    expect(result.error).toBe('No response from Gemini')
  })

  it('should handle non-Error exceptions', async () => {
    mockGenerateContent.mockRejectedValue('string error')

    const result = await enrichEventFromHtml(detailHtml, originalEvent, originalEvent.event_url)

    expect(result.success).toBe(false)
    expect(result.dateTimeConfirmed).toBe(false)
    expect(result.error).toBe('Unknown error')
  })
})
