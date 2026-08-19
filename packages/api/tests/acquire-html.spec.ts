import { jest, describe, it, expect, beforeEach } from '@jest/globals'
import puppeteer from 'puppeteer-core'

jest.mock('undici', () => ({
  Agent: jest.fn().mockImplementation(() => ({})),
  fetch: jest.fn(),
}))
jest.mock('puppeteer-core', () => ({
  __esModule: true,
  default: { launch: jest.fn() },
}))

import { fetchHtml, pruneHtml, acquireHtml } from '../src/mining-agent/acquire/html'
import * as undici from 'undici'

const mockUndiciFetch = jest.mocked(undici.fetch)

const completeHtml = '<html><body><h1>Concierto</h1>' + '<p>' + 'Evento de prueba '.repeat(80) + '</p></body></html>'

function mockDynamicSuccess(dynamicHtml: string): void {
  const mockPage = {
    setUserAgent: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
    setViewport: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
    setRequestInterception: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
    on: jest.fn(),
    goto: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
    waitForNetworkIdle: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
    evaluate: jest.fn<() => Promise<string>>().mockResolvedValue(dynamicHtml),
    close: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
    isClosed: jest.fn<() => boolean>().mockReturnValue(false),
  } as any
  const mockBrowser = {
    newPage: jest.fn<() => Promise<any>>().mockResolvedValue(mockPage),
    close: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
    connected: true,
  } as any
  ;(puppeteer.launch as jest.MockedFunction<typeof puppeteer.launch>).mockResolvedValue(mockBrowser)
}

describe('mining-agent acquire: pruneHtml', () => {
  it('should strip scripts, styles, stylesheet links, and comments entirely', () => {
    const html = '<html><head><style>.a{color:red}</style><link rel="stylesheet" href="/s.css"></head><body><script>alert(1)</script><!-- comment --><h1>Concierto de Rock</h1></body></html>'

    const result = pruneHtml(html)

    expect(result.content).not.toContain('alert(1)')
    expect(result.content).not.toContain('color:red')
    expect(result.content).not.toContain('stylesheet')
    expect(result.content).not.toContain('comment')
    expect(result.content).toContain('<h1>Concierto de Rock</h1>')
  })

  it('should drop non-essential attributes while keeping href, src, role, and datetime', () => {
    const html = '<div class="card" data-id="42" style="margin:0"><a href="/e/1" class="btn">Ver</a><time datetime="2026-08-15T20:00:00">15 ago</time><img src="/img/x.jpg" loading="lazy"/></div>'

    const result = pruneHtml(html)

    expect(result.content).toBe('<div><a href="/e/1">Ver</a><time datetime="2026-08-15T20:00:00">15 ago</time><img src="/img/x.jpg"/></div>')
  })

  it('should report raw and pruned lengths and word counts', () => {
    const html = '<html><body><script>x()</script><h1>Un evento</h1></body></html>'

    const result = pruneHtml(html)

    expect(result.rawLength).toBe(html.length)
    expect(result.rawWords).toBe(html.split(/\s+/).length)
    expect(result.prunedLength).toBe(result.content.length)
    expect(result.prunedWords).toBe(result.content.split(/\s+/).length)
  })

  it('should return an empty string for empty input', () => {
    const result = pruneHtml('')

    expect(result.content).toBe('')
    expect(result.rawWords).toBe(0)
  })
})

describe('mining-agent acquire: fetchHtml', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should return static content when the response is complete', async () => {
    const mockResponse = { ok: true, text: jest.fn<() => Promise<string>>().mockResolvedValue(completeHtml) } as any
    mockUndiciFetch.mockResolvedValue(mockResponse)

    const result = await fetchHtml('https://example.com')

    expect(result.success).toBe(true)
    expect(result.method).toBe('static')
    expect(result.html).toBe(completeHtml)
    expect(mockUndiciFetch).toHaveBeenCalledTimes(1)
  })

  it('should fall back to dynamic fetch when static content is an SPA shell', async () => {
    const incompleteHtml = '<html><body><div id="root"></div></body></html>'
    mockUndiciFetch.mockResolvedValueOnce({ ok: true, text: jest.fn<() => Promise<string>>().mockResolvedValue(incompleteHtml) } as any)
    mockDynamicSuccess(completeHtml)

    const result = await fetchHtml('https://example.com')

    expect(result.success).toBe(true)
    expect(result.method).toBe('dynamic')
    expect(result.html).toBe(completeHtml)
  })

  it('should fall back to dynamic fetch when content has loading indicators', async () => {
    const loadingHtml = '<html><body><div>Cargando... espere por favor</div></body></html>'
    mockUndiciFetch.mockResolvedValueOnce({ ok: true, text: jest.fn<() => Promise<string>>().mockResolvedValue(loadingHtml) } as any)
    mockDynamicSuccess(completeHtml)

    const result = await fetchHtml('https://example.com')

    expect(result.success).toBe(true)
    expect(result.method).toBe('dynamic')
  })

  it('should trust very substantial static content even with framework indicators', async () => {
    const largeHtml = '<html><body><div data-reactroot>' + 'x'.repeat(51000) + '</div></body></html>'
    mockUndiciFetch.mockResolvedValue({ ok: true, text: jest.fn<() => Promise<string>>().mockResolvedValue(largeHtml) } as any)

    const result = await fetchHtml('https://example.com')

    expect(result.success).toBe(true)
    expect(result.method).toBe('static')
  })

  it('should report HTTP errors', async () => {
    mockUndiciFetch.mockResolvedValue({ ok: false, status: 404, statusText: 'Not Found', text: jest.fn() } as any)

    const result = await fetchHtml('https://example.com')

    expect(result.success).toBe(false)
    expect(result.error).toBe('HTTP 404: Not Found')
  })

  it('should handle invalid URLs', async () => {
    const result = await fetchHtml('not-a-url')

    expect(result.success).toBe(false)
    expect(result.error).toBe('Invalid URL format')
  })

  it('should handle connection errors', async () => {
    mockUndiciFetch.mockRejectedValue(new Error('ECONNREFUSED'))

    const result = await fetchHtml('https://nonexistent.example')

    expect(result.success).toBe(false)
    expect(result.error).toBe('Connection failed - domain not reachable')
  })

  it('should handle static fetch timeout', async () => {
    mockUndiciFetch.mockImplementation((_url, options: any) => {
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => resolve({ ok: true, text: () => Promise.resolve('late') } as any), 6000)
        const signal = options?.signal
        if (signal) {
          signal.addEventListener('abort', () => {
            clearTimeout(timer)
            const abortError = new Error('The operation was aborted')
            abortError.name = 'AbortError'
            reject(abortError)
          })
        }
      })
    })

    const result = await fetchHtml('https://example.com')

    expect(result.success).toBe(false)
    expect(result.error).toBe('Static fetch timeout')
  }, 10000)

  it('should report page load timeouts in dynamic fetch', async () => {
    mockUndiciFetch.mockResolvedValueOnce({ ok: true, text: jest.fn<() => Promise<string>>().mockResolvedValue('<html><body><div id="app"></div></body></html>') } as any)

    const mockPage = {
      setUserAgent: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
      setViewport: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
      setRequestInterception: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
      on: jest.fn(),
      goto: jest.fn<() => Promise<void>>()
        .mockRejectedValueOnce(new Error('TimeoutError: Navigation timeout'))
        .mockRejectedValueOnce(new Error('TimeoutError: Navigation timeout')),
      close: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
      isClosed: jest.fn<() => boolean>().mockReturnValue(false),
    } as any
    const mockBrowser = {
      newPage: jest.fn<() => Promise<any>>().mockResolvedValue(mockPage),
      close: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
      connected: true,
    } as any
    ;(puppeteer.launch as jest.MockedFunction<typeof puppeteer.launch>).mockResolvedValue(mockBrowser)

    const result = await fetchHtml('https://example.com')

    expect(result.success).toBe(false)
    expect(result.error).toBe('Page load timeout')
  })

  it('should recover with a fresh page when navigation fails with a detached frame', async () => {
    mockUndiciFetch.mockResolvedValueOnce({ ok: true, text: jest.fn<() => Promise<string>>().mockResolvedValue('<html><body><div id="root"></div></body></html>') } as any)

    const detachedPage = {
      setUserAgent: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
      setViewport: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
      setRequestInterception: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
      on: jest.fn(),
      goto: jest.fn<() => Promise<void>>().mockRejectedValue(new Error('Frame was detached')),
      close: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
      isClosed: jest.fn<() => boolean>().mockReturnValue(false),
    } as any
    const healthyPage = {
      setUserAgent: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
      setViewport: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
      setRequestInterception: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
      on: jest.fn(),
      goto: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
      waitForNetworkIdle: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
      evaluate: jest.fn<() => Promise<string>>().mockResolvedValue(completeHtml),
      close: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
      isClosed: jest.fn<() => boolean>().mockReturnValue(false),
    } as any
    const mockBrowser = {
      newPage: jest.fn<() => Promise<any>>().mockResolvedValueOnce(detachedPage).mockResolvedValueOnce(healthyPage),
      close: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
      connected: true,
    } as any
    ;(puppeteer.launch as jest.MockedFunction<typeof puppeteer.launch>).mockResolvedValue(mockBrowser)

    const result = await fetchHtml('https://example.com')

    expect(result.success).toBe(true)
    expect(result.method).toBe('dynamic')
    expect(mockBrowser.newPage).toHaveBeenCalledTimes(2)
  })

  it('should return a generic error when the static fetch rejects with a non-Error', async () => {
    mockUndiciFetch.mockRejectedValue('boom')

    const result = await fetchHtml('https://example.com')

    expect(result.success).toBe(false)
    expect(result.error).toBe('Static fetch failed')
  })

  it('should wait for a selector when waitForSelector is provided', async () => {
    mockUndiciFetch.mockResolvedValueOnce({ ok: true, text: jest.fn<() => Promise<string>>().mockResolvedValue('<html><body><div id="root"></div></body></html>') } as any)

    const mockPage = {
      setUserAgent: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
      setViewport: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
      setRequestInterception: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
      on: jest.fn(),
      goto: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
      waitForNetworkIdle: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
      waitForSelector: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
      evaluate: jest.fn<() => Promise<string>>().mockResolvedValue(completeHtml),
      close: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
      isClosed: jest.fn<() => boolean>().mockReturnValue(false),
    } as any
    const mockBrowser = {
      newPage: jest.fn<() => Promise<any>>().mockResolvedValue(mockPage),
      close: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
      connected: true,
    } as any
    ;(puppeteer.launch as jest.MockedFunction<typeof puppeteer.launch>).mockResolvedValue(mockBrowser)

    const result = await fetchHtml('https://example.com', { waitForSelector: '.content' })

    expect(result.success).toBe(true)
    expect(result.method).toBe('dynamic')
    expect(mockPage.waitForSelector).toHaveBeenCalledWith('.content', expect.any(Object))
  })

  it('should continue when the requested selector is not found', async () => {
    mockUndiciFetch.mockResolvedValueOnce({ ok: true, text: jest.fn<() => Promise<string>>().mockResolvedValue('<html><body><div id="root"></div></body></html>') } as any)

    const mockPage = {
      setUserAgent: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
      setViewport: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
      setRequestInterception: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
      on: jest.fn(),
      goto: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
      waitForNetworkIdle: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
      waitForSelector: jest.fn<() => Promise<void>>().mockRejectedValue(new Error('Timeout')),
      evaluate: jest.fn<() => Promise<string>>().mockResolvedValue(completeHtml),
      close: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
      isClosed: jest.fn<() => boolean>().mockReturnValue(false),
    } as any
    const mockBrowser = {
      newPage: jest.fn<() => Promise<any>>().mockResolvedValue(mockPage),
      close: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
      connected: true,
    } as any
    ;(puppeteer.launch as jest.MockedFunction<typeof puppeteer.launch>).mockResolvedValue(mockBrowser)

    const result = await fetchHtml('https://example.com', { waitForSelector: '.missing' })

    expect(result.success).toBe(true)
    expect(result.method).toBe('dynamic')
  })

  it('should block heavy resources and let the rest through', async () => {
    mockUndiciFetch.mockResolvedValueOnce({ ok: true, text: jest.fn<() => Promise<string>>().mockResolvedValue('<html><body><div id="root"></div></body></html>') } as any)

    const mockRequests: Array<{ resourceType: () => string; abort: () => void; continue: () => void }> = []
    const createMockRequest = (resourceType: string) => ({
      resourceType: () => resourceType,
      abort: jest.fn(),
      continue: jest.fn(),
    })
    const mockPage = {
      setUserAgent: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
      setViewport: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
      setRequestInterception: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
      on: jest.fn((event: string, handler: (req: { resourceType: () => string; abort: () => void; continue: () => void }) => void) => {
        if (event === 'request') {
          const imageReq = createMockRequest('image')
          const scriptReq = createMockRequest('script')
          mockRequests.push(imageReq, scriptReq)
          handler(imageReq)
          handler(scriptReq)
        }
      }),
      goto: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
      waitForNetworkIdle: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
      evaluate: jest.fn<() => Promise<string>>().mockResolvedValue(completeHtml),
      close: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
      isClosed: jest.fn<() => boolean>().mockReturnValue(false),
    } as any
    const mockBrowser = {
      newPage: jest.fn<() => Promise<any>>().mockResolvedValue(mockPage),
      close: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
      connected: true,
    } as any
    ;(puppeteer.launch as jest.MockedFunction<typeof puppeteer.launch>).mockResolvedValue(mockBrowser)

    const result = await fetchHtml('https://example.com')

    expect(result.success).toBe(true)
    expect(result.method).toBe('dynamic')
    expect(mockRequests[0].abort).toHaveBeenCalled()
    expect(mockRequests[1].continue).toHaveBeenCalled()
  })

  it('should return a non-Error exception message from dynamic fetch', async () => {
    mockUndiciFetch.mockResolvedValueOnce({ ok: true, text: jest.fn<() => Promise<string>>().mockResolvedValue('<html><body><div id="root"></div></body></html>') } as any)
    const mockPage = {
      setUserAgent: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
      setViewport: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
      setRequestInterception: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
      on: jest.fn(),
      goto: jest.fn<() => Promise<void>>().mockRejectedValue('string error'),
      close: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
      isClosed: jest.fn<() => boolean>().mockReturnValue(false),
    } as any
    const mockBrowser = {
      newPage: jest.fn<() => Promise<any>>().mockResolvedValue(mockPage),
      close: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
      connected: true,
    } as any
    ;(puppeteer.launch as jest.MockedFunction<typeof puppeteer.launch>).mockResolvedValue(mockBrowser)

    const result = await fetchHtml('https://example.com')

    expect(result.success).toBe(false)
    expect(result.error).toBe('string error')
  })
})

describe('mining-agent acquire: acquireHtml', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should fetch and prune in a single step', async () => {
    const html = '<html><body><script>x()</script><h1>Concierto</h1>' + '<p>' + 'Detalle del evento '.repeat(80) + '</p></body></html>'
    mockUndiciFetch.mockResolvedValue({ ok: true, text: jest.fn<() => Promise<string>>().mockResolvedValue(html) } as any)

    const result = await acquireHtml('https://example.com')

    expect(result.success).toBe(true)
    expect(result.document?.content).toContain('<h1>Concierto</h1>')
    expect(result.document?.content).not.toContain('x()')
    expect(result.rawLength).toBe(html.length)
  })

  it('should report acquisition failures', async () => {
    const fetcher = jest.fn(async () => ({ success: false, error: 'boom', durationMs: 5 }))
    const result = await acquireHtml('https://example.com', { fetcher: fetcher as any })

    expect(result.success).toBe(false)
    expect(result.error).toBe('boom')
  })
})