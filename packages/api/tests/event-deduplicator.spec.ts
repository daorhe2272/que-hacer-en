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

import { checkSemanticDuplicates, ExistingEventSummary } from '../src/utils/event-deduplicator'

const { __mockGenerateContent } = require('@google/genai') as any
const mockGenerateContent = __mockGenerateContent as jest.MockedFunction<typeof __mockGenerateContent>

describe('event-deduplicator', () => {
  const existingEvents: ExistingEventSummary[] = [
    { id: 'evt-1', title: 'Concierto de Rock en Bogotá', location: 'Teatro Municipal', date: '2026-06-15' },
    { id: 'evt-2', title: 'Feria Gastronómica Medellín', location: 'Plaza Mayor', date: '2026-06-20' },
  ]

  beforeEach(() => {
    jest.clearAllMocks()
    jest.spyOn(console, 'warn').mockImplementation(() => undefined)
  })

  it('should return duplicate results when LLM identifies matches', async () => {
    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify({
        results: [
          { candidate_index: 0, is_duplicate: true, duplicate_of_id: 'evt-1', reason: 'Mismo concierto de rock' },
          { candidate_index: 1, is_duplicate: false },
        ],
      }),
    })

    const candidates = [
      { index: 0, title: 'Rock Concert Bogotá', location: 'Teatro Municipal', date: '2026-06-15' },
      { index: 1, title: 'Arte Exposición', location: 'Museo Nacional', date: '2026-06-18' },
    ]

    const result = await checkSemanticDuplicates(candidates, existingEvents)

    expect(result).toHaveLength(2)
    expect(result[0].isDuplicate).toBe(true)
    expect(result[0].duplicateOfId).toBe('evt-1')
    expect(result[1].isDuplicate).toBe(false)
  })

  it('should not mark non-duplicates as duplicates', async () => {
    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify({
        results: [
          { candidate_index: 0, is_duplicate: false },
        ],
      }),
    })

    const candidates = [
      { index: 0, title: 'Completamente diferente', location: 'Otro lugar', date: '2026-07-01' },
    ]

    const result = await checkSemanticDuplicates(candidates, existingEvents)

    expect(result).toHaveLength(1)
    expect(result[0].isDuplicate).toBe(false)
    expect(result[0].duplicateOfId).toBeUndefined()
  })

  it('should handle partial batch with some duplicates', async () => {
    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify({
        results: [
          { candidate_index: 0, is_duplicate: true, duplicate_of_id: 'evt-2', reason: 'Misma feria' },
          { candidate_index: 1, is_duplicate: false },
          { candidate_index: 2, is_duplicate: true, duplicate_of_id: 'evt-1', reason: 'Mismo concierto' },
        ],
      }),
    })

    const candidates = [
      { index: 0, title: 'Feria de Comida Medellín', location: 'Plaza Mayor', date: '2026-06-20' },
      { index: 1, title: 'Cine al aire libre', location: 'Parque Central', date: '2026-06-25' },
      { index: 2, title: 'Concierto Rock Bog', location: 'Teatro Municipal', date: '2026-06-15' },
    ]

    const result = await checkSemanticDuplicates(candidates, existingEvents)

    expect(result).toHaveLength(3)
    expect(result.filter(r => r.isDuplicate)).toHaveLength(2)
    expect(result.filter(r => !r.isDuplicate)).toHaveLength(1)
  })

  it('should return empty array (fail-open) on API error', async () => {
    mockGenerateContent.mockRejectedValue(new Error('API error'))

    const candidates = [
      { index: 0, title: 'Test Event', location: 'Venue', date: '2026-06-15' },
    ]

    const result = await checkSemanticDuplicates(candidates, existingEvents)

    expect(result).toEqual([])
  })

  it('should return empty array (fail-open) on JSON parse error', async () => {
    mockGenerateContent.mockResolvedValue({
      text: 'not valid json{{{',
    })

    const candidates = [
      { index: 0, title: 'Test Event', location: 'Venue', date: '2026-06-15' },
    ]

    const result = await checkSemanticDuplicates(candidates, existingEvents)

    expect(result).toEqual([])
  })

  it('should return empty array (fail-open) on quota/rate error', async () => {
    mockGenerateContent.mockRejectedValue(new Error('API quota exceeded'))

    const candidates = [
      { index: 0, title: 'Test Event', location: 'Venue', date: '2026-06-15' },
    ]

    const result = await checkSemanticDuplicates(candidates, existingEvents)

    expect(result).toEqual([])
  })

  it('should return empty array when no existing events', async () => {
    const candidates = [
      { index: 0, title: 'Test Event', location: 'Venue', date: '2026-06-15' },
    ]

    const result = await checkSemanticDuplicates(candidates, [])

    expect(result).toEqual([])
    expect(mockGenerateContent).not.toHaveBeenCalled()
  })

  it('should return empty array when no candidates', async () => {
    const result = await checkSemanticDuplicates([], existingEvents)

    expect(result).toEqual([])
    expect(mockGenerateContent).not.toHaveBeenCalled()
  })

  it('should return empty array when Gemini returns no text', async () => {
    mockGenerateContent.mockResolvedValue({ text: '' })

    const candidates = [
      { index: 0, title: 'Test Event', location: 'Venue', date: '2026-06-15' },
    ]

    const result = await checkSemanticDuplicates(candidates, existingEvents)

    expect(result).toEqual([])
  })

  it('should return empty array when Gemini returns invalid structure', async () => {
    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify({ not_results: [] }),
    })

    const candidates = [
      { index: 0, title: 'Test Event', location: 'Venue', date: '2026-06-15' },
    ]

    const result = await checkSemanticDuplicates(candidates, existingEvents)

    expect(result).toEqual([])
  })
})
