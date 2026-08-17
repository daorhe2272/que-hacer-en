import { jest, describe, it, expect, beforeEach, afterEach, afterAll } from '@jest/globals'

jest.mock('@google/genai', () => {
  const mockGenerateContent = jest.fn()
  return {
    GoogleGenAI: jest.fn().mockImplementation(() => ({
      models: { generateContent: mockGenerateContent },
    })),
    __mockGenerateContent: mockGenerateContent,
  }
})

import { moderateEventContent } from '../src/utils/event-moderator'

const { __mockGenerateContent } = require('@google/genai') as any
const mockGenerateContent = __mockGenerateContent as jest.MockedFunction<typeof __mockGenerateContent>

describe('event-moderator', () => {
  const originalApiKey = process.env.GOOGLE_API_KEY

  beforeEach(() => {
    jest.clearAllMocks()
    jest.spyOn(console, 'warn').mockImplementation(() => undefined)
    jest.spyOn(console, 'error').mockImplementation(() => undefined)
    jest.spyOn(console, 'log').mockImplementation(() => undefined)
    process.env.GOOGLE_API_KEY = 'test-google-key'
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  afterAll(() => {
    if (originalApiKey === undefined) delete process.env.GOOGLE_API_KEY
    else process.env.GOOGLE_API_KEY = originalApiKey
  })

  it('marks content as safe when the AI considers it safe', async () => {
    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify({ safe: true }),
    })

    const result = await moderateEventContent('Concierto de rock', 'Un concierto para toda la familia', 'Parque Simón Bolívar')

    expect(result).toEqual({ safe: true })
    expect(mockGenerateContent).toHaveBeenCalledWith({
      model: 'gemini-3.1-flash-lite',
      contents: expect.stringContaining('Concierto de rock'),
      config: expect.objectContaining({ responseMimeType: 'application/json' }),
    })
  })

  it('returns unsafe with reason when content is flagged', async () => {
    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify({ safe: false, reason: 'Contenido violento' }),
    })

    const result = await moderateEventContent('Marcha de protesta', 'Evento de protesta', 'Plaza de Bolívar')

    expect(result).toEqual({ safe: false, reason: 'Contenido violento' })
  })

  it('defaults to safe when the AI returns no text', async () => {
    mockGenerateContent.mockResolvedValue({ text: '' })

    const result = await moderateEventContent('Concierto de rock', 'Un concierto', 'Bogotá')

    expect(result).toEqual({ safe: true })
  })

  it('defaults to safe when moderation throws', async () => {
    mockGenerateContent.mockRejectedValue(new Error('Gemini API error'))

    const result = await moderateEventContent('Concierto de rock', 'Un concierto', 'Bogotá')

    expect(result).toEqual({ safe: true })
  })

  it('defaults to safe when GOOGLE_API_KEY is missing', async () => {
    delete process.env.GOOGLE_API_KEY

    const result = await moderateEventContent('Concierto de rock', 'Un concierto', 'Bogotá')

    expect(result).toEqual({ safe: true })
    expect(mockGenerateContent).not.toHaveBeenCalled()
  })
})