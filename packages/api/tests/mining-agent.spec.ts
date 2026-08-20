import { jest, describe, it, expect, beforeEach } from '@jest/globals'
import { buildMiningGraph } from '../src/mining-agent/graph'
import { runMiningGraph } from '../src/mining-agent'
import { createAnalyzeNode } from '../src/mining-agent/nodes/analyze'

const FIXTURE_HTML =
  '<html><head><style>.card{}</style></head><body><script>track()</script>' +
  '<h1>Concierto de Rock</h1><a href="/eventos/1" class="btn">Detalles</a>' +
  '<p>' + 'Cuerpo del evento '.repeat(20) + '</p></body></html>'

describe('mining-agent graph', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should run acquire and analyze with a static fetch', async () => {
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined)
    const fetcher = jest.fn(async () => ({ success: true, html: FIXTURE_HTML, method: 'static' as const, durationMs: 10 }))

    const graph = buildMiningGraph({ fetcher: fetcher as any })
    const finalState = await graph.invoke({ url: 'https://example.com' })

    expect(finalState.result?.success).toBe(true)
    expect(finalState.result?.method).toBe('static')
    expect(finalState.result?.document?.content).toContain('<h1>Concierto de Rock</h1>')
    expect(finalState.result?.document?.content).not.toContain('track()')
    expect(finalState.stats?.success).toBe(true)
    expect(finalState.stats?.rawEstimatedTokens).toBeGreaterThan(0)
    expect(finalState.stats?.prunedEstimatedTokens).toBeGreaterThan(0)
    expect(logSpy).toHaveBeenCalled()

    fetcher.mockClear()
    logSpy.mockRestore()
  })

  it('should report failed acquisitions through state and stats', async () => {
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined)
    const fetcher = jest.fn(async () => ({ success: false, error: 'Connection refused', durationMs: 5 }))

    const graph = buildMiningGraph({ fetcher: fetcher as any })
    const finalState = await graph.invoke({ url: 'https://example.com' })

    expect(finalState.result?.success).toBe(false)
    expect(finalState.result?.error).toBe('Connection refused')
    expect(finalState.stats?.success).toBe(false)
    expect(finalState.stats?.error).toBe('Connection refused')

    fetcher.mockClear()
    logSpy.mockRestore()
  })

  it('should stream per-node updates', async () => {
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined)
    const fetcher = jest.fn(async () => ({ success: true, html: FIXTURE_HTML, method: 'static' as const, durationMs: 10 }))

    const graph = buildMiningGraph({ fetcher: fetcher as any })
    const chunks: string[] = []
    const stream = await graph.stream({ url: 'https://example.com' })
    for await (const chunk of stream) {
      chunks.push(Object.keys(chunk)[0])
    }

    expect(chunks).toContain('acquire')
    expect(chunks).toContain('analyze')

    fetcher.mockClear()
    logSpy.mockRestore()
  })

  it('should expose a runMiningGraph convenience wrapper', async () => {
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined)
    const fetcher = jest.fn(async () => ({ success: true, html: FIXTURE_HTML, method: 'dynamic' as const, durationMs: 10 }))

    const finalState = (await runMiningGraph('https://example.com', { fetcher: fetcher as any })) as any

    expect(finalState.result?.success).toBe(true)
    expect(finalState.result?.method).toBe('dynamic')
    expect(finalState.stats?.success).toBe(true)

    fetcher.mockClear()
    logSpy.mockRestore()
  })

  it('should compile the graph with default options when no fetcher is injected', () => {
    const graph = buildMiningGraph()
    expect(graph).toBeDefined()
  })
})

describe('mining-agent analyze node', () => {
  const analyzeNode = createAnalyzeNode()

  it('should compute stats from the result when the document is absent', async () => {
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined)

    const update = await analyzeNode({
      url: 'https://example.com',
      sourceType: 'html',
      result: {
        success: true,
        sourceType: 'html',
        url: 'https://example.com',
        durationMs: 10,
        rawLength: 1000,
        prunedLength: 200,
      },
      stats: undefined,
    })

    expect(update.stats?.success).toBe(true)
    expect(update.stats?.rawEstimatedTokens).toBe(250)
    expect(update.stats?.prunedEstimatedTokens).toBe(50)

    logSpy.mockRestore()
  })

  it('should report zero reduction when there is no raw content', async () => {
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined)

    const update = await analyzeNode({
      url: 'https://example.com',
      sourceType: 'html',
      result: {
        success: true,
        sourceType: 'html',
        url: 'https://example.com',
        durationMs: 5,
        rawLength: 0,
        prunedLength: 0,
      },
      stats: undefined,
    })

    expect(update.stats?.rawEstimatedTokens).toBe(0)
    expect(update.stats?.prunedEstimatedTokens).toBe(0)

    logSpy.mockRestore()
  })

  it('should handle a missing acquisition result', async () => {
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined)

    const update = await analyzeNode({
      url: 'https://example.com',
      sourceType: 'html',
      result: undefined,
      stats: undefined,
    })

    expect(update.stats?.success).toBe(false)
    expect(update.stats?.error).toBe('No acquisition result')

    logSpy.mockRestore()
  })
})