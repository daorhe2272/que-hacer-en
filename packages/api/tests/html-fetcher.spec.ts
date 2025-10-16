import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals'
import puppeteer from 'puppeteer'
import { fetchHtmlContent, FetchOptions } from '../src/utils/html-fetcher'

// Mock fetch globally
const mockFetch = jest.fn() as jest.MockedFunction<typeof fetch>
;(global as any).fetch = mockFetch

// Mock Puppeteer
jest.mock('puppeteer', () => ({
  __esModule: true,
  default: {
    launch: jest.fn(),
  },
}))

// Mock console methods
jest.spyOn(console, 'log').mockImplementation(() => undefined)
jest.spyOn(console, 'warn').mockImplementation(() => undefined)
jest.spyOn(console, 'error').mockImplementation(() => undefined)

describe('html-fetcher', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('fetchHtmlContent', () => {
    const validUrl = 'https://example.com'
    const defaultOptions: FetchOptions = {}

    it('should return static content when static fetch succeeds and content is complete', async () => {
      const completeHtml = '<html><body><h1>Complete Content</h1><p>Substantial content here...</p></body></html>'.repeat(20) // Make it long enough to be considered complete
      const mockResponse = {
        ok: true,
        text: jest.fn<() => Promise<string>>().mockResolvedValue(completeHtml),
      } as any
      mockFetch.mockResolvedValue(mockResponse)

      const result = await fetchHtmlContent(validUrl, defaultOptions)

      expect(result.success).toBe(true)
      expect(result.method).toBe('static')
      expect(result.content).toBe(completeHtml.substring(0, 200))
      expect(result.fullHtml).toBe(completeHtml)
      expect(mockFetch).toHaveBeenCalledTimes(1)
    })

    it('should fallback to dynamic fetch when static content is incomplete', async () => {
      const incompleteHtml = '<html><body><div id="root"></div></body></html>'
      const completeHtml = '<html><body><h1>Dynamic Content</h1></body></html>'

      // Mock static fetch
      const staticResponse = {
        ok: true,
        text: jest.fn<() => Promise<string>>().mockResolvedValue(incompleteHtml),
      } as any
      mockFetch.mockResolvedValueOnce(staticResponse)

      // Mock Puppeteer
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

      const result = await fetchHtmlContent(validUrl, defaultOptions)

      expect(result.success).toBe(true)
      expect(result.method).toBe('dynamic')
      expect(result.content).toBe(completeHtml.substring(0, 200))
      expect(result.fullHtml).toBe(completeHtml)
    })

    it('should return dynamic result when dynamic fetch fails (no fallback to static)', async () => {
      const completeHtml = '<html><body><h1>Static Content</h1></body></html>'

      // Mock static fetch
      const staticResponse = {
        ok: true,
        text: jest.fn<() => Promise<string>>().mockResolvedValue(completeHtml),
      } as any
      mockFetch.mockResolvedValueOnce(staticResponse)

      // Mock Puppeteer to fail
      const mockPage = {
        setUserAgent: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
        setViewport: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
        setRequestInterception: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
        on: jest.fn(),
        goto: jest.fn<() => Promise<void>>().mockRejectedValue(new Error('Navigation failed')),
        close: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
        isClosed: jest.fn<() => boolean>().mockReturnValue(false),
      } as any

      const mockBrowser = {
        newPage: jest.fn<() => Promise<any>>().mockResolvedValue(mockPage),
        close: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
        connected: true,
      } as any

      ;(puppeteer.launch as jest.MockedFunction<typeof puppeteer.launch>).mockResolvedValue(mockBrowser)

      const result = await fetchHtmlContent(validUrl, defaultOptions)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Navigation failed')
    })

    it('should handle invalid URL', async () => {
      const invalidUrl = 'not-a-url'

      const result = await fetchHtmlContent(invalidUrl, defaultOptions)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Invalid URL format')
    })

    it('should handle connection errors', async () => {
      const errorUrl = 'https://nonexistent-domain-12345.com'
      mockFetch.mockRejectedValue(new Error('ECONNREFUSED'))

      const result = await fetchHtmlContent(errorUrl, defaultOptions)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Connection failed - domain not reachable')
    })

    it('should handle HTTP errors in static fetch', async () => {
      const errorResponse = {
        ok: false,
        status: 404,
        statusText: 'Not Found',
        text: jest.fn<() => Promise<string>>().mockResolvedValue('Page not found'),
      } as any
      mockFetch.mockResolvedValue(errorResponse)

      const result = await fetchHtmlContent(validUrl, defaultOptions)

      expect(result.success).toBe(false)
      expect(result.error).toBe('HTTP 404: Not Found')
    })

    it('should handle static fetch timeout', async () => {
      mockFetch.mockImplementation((_url, options: any) => {
        return new Promise((resolve, reject) => {
          const signal = options?.signal
          if (signal) {
            signal.addEventListener('abort', () => {
              const abortError = new Error('The operation was aborted')
              abortError.name = 'AbortError'
              reject(abortError)
            })
          }
          setTimeout(() => resolve({ ok: true, text: () => Promise.resolve('timeout') } as any), 6000)
        })
      })

      const result = await fetchHtmlContent(validUrl, defaultOptions)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Static fetch timeout')
    }, 10000)

    it('should use custom options correctly', async () => {
      const customOptions: FetchOptions = {
        timeout: 10000,
        waitForSelector: '.content',
        waitForTimeout: 2000,
        blockResources: false,
        userAgent: 'Custom Agent'
      }

      const completeHtml = '<html><body><h1>Complete Content</h1></body></html>'
      const mockResponse = {
        ok: true,
        text: jest.fn<() => Promise<string>>().mockResolvedValue(completeHtml),
      }
      mockFetch.mockResolvedValue(mockResponse as any)

      await fetchHtmlContent(validUrl, customOptions)

      expect(mockFetch).toHaveBeenCalledWith(
        validUrl,
        expect.objectContaining({
          headers: expect.objectContaining({
            'User-Agent': 'Custom Agent'
          })
        })
      )
    })

    it('should handle dynamic fetch with waitForSelector', async () => {
      const incompleteHtml = '<html><body><div id="root"></div></body></html>'
      const completeHtml = '<html><body><h1>Content</h1></body></html>'

      const staticResponse = {
        ok: true,
        text: jest.fn<() => Promise<string>>().mockResolvedValue(incompleteHtml),
      } as any
      mockFetch.mockResolvedValueOnce(staticResponse)

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

      const result = await fetchHtmlContent(validUrl, { waitForSelector: '.content' })

      expect(result.success).toBe(true)
      expect(mockPage.waitForSelector).toHaveBeenCalledWith('.content', expect.any(Object))
    })

    it('should handle waitForSelector timeout gracefully', async () => {
      const incompleteHtml = '<html><body><div id="root"></div></body></html>'
      const completeHtml = '<html><body><h1>Content</h1></body></html>'

      const staticResponse = {
        ok: true,
        text: jest.fn<() => Promise<string>>().mockResolvedValue(incompleteHtml),
      } as any
      mockFetch.mockResolvedValueOnce(staticResponse)

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

      const result = await fetchHtmlContent(validUrl, { waitForSelector: '.missing' })

      expect(result.success).toBe(true)
      expect(result.method).toBe('dynamic')
    })

    it('should handle page timeout error', async () => {
      // Create isolated mock for this test only
      const localMockFetch = jest.fn() as jest.MockedFunction<typeof fetch>
      global.fetch = localMockFetch
      
      try {
        const incompleteHtml = '<html><body><div id="root"></div></body></html>'

        // Mock static fetch to succeed but be incomplete
        const staticResponse = {
          ok: true,
          text: jest.fn<() => Promise<string>>().mockResolvedValue(incompleteHtml),
        } as any
        localMockFetch.mockResolvedValueOnce(staticResponse)

        const timeoutError = new Error('TimeoutError: Navigation timeout')
        const mockPage = {
          setUserAgent: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
          setViewport: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
          setRequestInterception: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
          on: jest.fn(),
          goto: jest.fn<() => Promise<void>>()
            .mockRejectedValueOnce(timeoutError)
            .mockRejectedValueOnce(timeoutError),
          close: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
          isClosed: jest.fn<() => boolean>().mockReturnValue(false),
        } as any

        const mockBrowser = {
          newPage: jest.fn<() => Promise<any>>().mockResolvedValue(mockPage),
          close: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
          connected: true,
        } as any

        ;(puppeteer.launch as jest.MockedFunction<typeof puppeteer.launch>).mockResolvedValue(mockBrowser)

        const result = await fetchHtmlContent(validUrl, defaultOptions)

        expect(result.success).toBe(false)
        expect(result.error).toBe('Page load timeout')
      } finally {
        // Restore original mock
        global.fetch = mockFetch
      }
    })

    it('should handle non-Error exceptions in dynamic fetch', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'))

      const mockPage = {
        setUserAgent: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
        setViewport: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
        setRequestInterception: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
        on: jest.fn(),
        goto: jest.fn<() => Promise<void>>()
          .mockRejectedValueOnce('String error')
          .mockRejectedValueOnce('String error'),
        close: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
        isClosed: jest.fn<() => boolean>().mockReturnValue(false),
      } as any

      const mockBrowser = {
        newPage: jest.fn<() => Promise<any>>().mockResolvedValue(mockPage),
        close: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
        connected: true,
      } as any

      ;(puppeteer.launch as jest.MockedFunction<typeof puppeteer.launch>).mockResolvedValue(mockBrowser)

      const result = await fetchHtmlContent(validUrl, defaultOptions)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Network error')
    })

    it('should handle page close errors during cleanup', async () => {
      const incompleteHtml = '<html><body><div id="root"></div></body></html>'
      const completeHtml = '<html><body><h1>Content</h1></body></html>'

      const staticResponse = {
        ok: true,
        text: jest.fn<() => Promise<string>>().mockResolvedValue(incompleteHtml),
      } as any
      mockFetch.mockResolvedValueOnce(staticResponse)

      const mockPage = {
        setUserAgent: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
        setViewport: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
        setRequestInterception: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
        on: jest.fn(),
        goto: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
        waitForNetworkIdle: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
        evaluate: jest.fn<() => Promise<string>>().mockResolvedValue(completeHtml),
        close: jest.fn<() => Promise<void>>().mockRejectedValue(new Error('Close failed')),
        isClosed: jest.fn<() => boolean>().mockReturnValue(false),
      } as any

      const mockBrowser = {
        newPage: jest.fn<() => Promise<any>>().mockResolvedValue(mockPage),
        close: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
        connected: true,
      } as any

      ;(puppeteer.launch as jest.MockedFunction<typeof puppeteer.launch>).mockResolvedValue(mockBrowser)

      const result = await fetchHtmlContent(validUrl, defaultOptions)

      expect(result.success).toBe(true)
      expect(result.method).toBe('dynamic')
    })

    it('should handle browser close errors during cleanup', async () => {
      const incompleteHtml = '<html><body><div id="root"></div></body></html>'
      const completeHtml = '<html><body><h1>Content</h1></body></html>'

      const staticResponse = {
        ok: true,
        text: jest.fn<() => Promise<string>>().mockResolvedValue(incompleteHtml),
      } as any
      mockFetch.mockResolvedValueOnce(staticResponse)

      const mockPage = {
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
        newPage: jest.fn<() => Promise<any>>().mockResolvedValue(mockPage),
        close: jest.fn<() => Promise<void>>().mockRejectedValue(new Error('Browser close failed')),
        connected: true,
      } as any

      ;(puppeteer.launch as jest.MockedFunction<typeof puppeteer.launch>).mockResolvedValue(mockBrowser)

      const result = await fetchHtmlContent(validUrl, defaultOptions)

      expect(result.success).toBe(true)
      expect(result.method).toBe('dynamic')
    })

    it('should handle page already closed during cleanup', async () => {
      const incompleteHtml = '<html><body><div id="root"></div></body></html>'
      const completeHtml = '<html><body><h1>Content</h1></body></html>'

      const staticResponse = {
        ok: true,
        text: jest.fn<() => Promise<string>>().mockResolvedValue(incompleteHtml),
      } as any
      mockFetch.mockResolvedValueOnce(staticResponse)

      const mockPage = {
        setUserAgent: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
        setViewport: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
        setRequestInterception: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
        on: jest.fn(),
        goto: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
        waitForNetworkIdle: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
        evaluate: jest.fn<() => Promise<string>>().mockResolvedValue(completeHtml),
        close: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
        isClosed: jest.fn<() => boolean>().mockReturnValue(true),
      } as any

      const mockBrowser = {
        newPage: jest.fn<() => Promise<any>>().mockResolvedValue(mockPage),
        close: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
        connected: true,
      } as any

      ;(puppeteer.launch as jest.MockedFunction<typeof puppeteer.launch>).mockResolvedValue(mockBrowser)

      const result = await fetchHtmlContent(validUrl, defaultOptions)

      expect(result.success).toBe(true)
      expect(result.method).toBe('dynamic')
      expect(mockPage.close).not.toHaveBeenCalled()
    })

    it('should handle browser already disconnected during cleanup', async () => {
      const incompleteHtml = '<html><body><div id="root"></div></body></html>'
      const completeHtml = '<html><body><h1>Content</h1></body></html>'

      const staticResponse = {
        ok: true,
        text: jest.fn<() => Promise<string>>().mockResolvedValue(incompleteHtml),
      } as any
      mockFetch.mockResolvedValueOnce(staticResponse)

      const mockPage = {
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
        newPage: jest.fn<() => Promise<any>>().mockResolvedValue(mockPage),
        close: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
        connected: false,
      } as any

      ;(puppeteer.launch as jest.MockedFunction<typeof puppeteer.launch>).mockResolvedValue(mockBrowser)

      const result = await fetchHtmlContent(validUrl, defaultOptions)

      expect(result.success).toBe(true)
      expect(result.method).toBe('dynamic')
      expect(mockBrowser.close).not.toHaveBeenCalled()
    })

    it('should handle page validation failure and continue with content extraction', async () => {
      const incompleteHtml = '<html><body><div id="root"></div></body></html>'
      const completeHtml = '<html><body><h1>Content</h1></body></html>'

      const staticResponse = {
        ok: true,
        text: jest.fn<() => Promise<string>>().mockResolvedValue(incompleteHtml),
      } as any
      mockFetch.mockResolvedValueOnce(staticResponse)

      const mockPage = {
        setUserAgent: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
        setViewport: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
        setRequestInterception: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
        on: jest.fn(),
        goto: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
        waitForNetworkIdle: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
        evaluate: jest.fn<() => Promise<any>>()
          .mockRejectedValueOnce(new Error('Page validation failed'))
          .mockResolvedValueOnce(completeHtml),
        close: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
        isClosed: jest.fn<() => boolean>().mockReturnValue(false),
      } as any

      const mockBrowser = {
        newPage: jest.fn<() => Promise<any>>().mockResolvedValue(mockPage),
        close: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
        connected: true,
      } as any

      ;(puppeteer.launch as jest.MockedFunction<typeof puppeteer.launch>).mockResolvedValue(mockBrowser)

      const result = await fetchHtmlContent(validUrl, defaultOptions)

      expect(result.success).toBe(true)
      expect(result.method).toBe('dynamic')
    })

    it('should handle content extraction failure', async () => {
      mockFetch.mockRejectedValue(new Error('Connection refused'))

      const mockPage = {
        setUserAgent: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
        setViewport: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
        setRequestInterception: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
        on: jest.fn(),
        goto: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
        waitForNetworkIdle: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
        evaluate: jest.fn<() => Promise<any>>()
          .mockResolvedValueOnce(true)
          .mockRejectedValueOnce(new Error('Content extraction failed')),
        close: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
        isClosed: jest.fn<() => boolean>().mockReturnValue(false),
      } as any

      const mockBrowser = {
        newPage: jest.fn<() => Promise<any>>().mockResolvedValue(mockPage),
        close: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
        connected: true,
      } as any

      ;(puppeteer.launch as jest.MockedFunction<typeof puppeteer.launch>).mockResolvedValue(mockBrowser)

      const result = await fetchHtmlContent(validUrl, defaultOptions)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Connection refused')
    })

    it('should handle networkidle timeout gracefully', async () => {
      const incompleteHtml = '<html><body><div id="root"></div></body></html>'
      const completeHtml = '<html><body><h1>Content</h1></body></html>'

      const staticResponse = {
        ok: true,
        text: jest.fn<() => Promise<string>>().mockResolvedValue(incompleteHtml),
      } as any
      mockFetch.mockResolvedValueOnce(staticResponse)

      const mockPage = {
        setUserAgent: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
        setViewport: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
        setRequestInterception: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
        on: jest.fn(),
        goto: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
        waitForNetworkIdle: jest.fn<() => Promise<void>>().mockRejectedValue(new Error('Network idle timeout')),
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

      const result = await fetchHtmlContent(validUrl, defaultOptions)

      expect(result.success).toBe(true)
      expect(result.method).toBe('dynamic')
    })

    it('should retry navigation when page is detached', async () => {
      const incompleteHtml = '<html><body><div id="root"></div></body></html>'
      const completeHtml = '<html><body><h1>Content</h1></body></html>'

      const staticResponse = {
        ok: true,
        text: jest.fn<() => Promise<string>>().mockResolvedValue(incompleteHtml),
      } as any
      mockFetch.mockResolvedValueOnce(staticResponse)

      const mockPage1 = {
        setUserAgent: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
        setViewport: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
        setRequestInterception: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
        on: jest.fn(),
        goto: jest.fn<() => Promise<void>>().mockRejectedValue(new Error('Frame was detached')),
        close: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
        isClosed: jest.fn<() => boolean>().mockReturnValue(false),
      } as any

      const mockPage2 = {
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
        newPage: jest.fn<() => Promise<any>>()
          .mockResolvedValueOnce(mockPage1)
          .mockResolvedValueOnce(mockPage2),
        close: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
        connected: true,
      } as any

      ;(puppeteer.launch as jest.MockedFunction<typeof puppeteer.launch>).mockResolvedValue(mockBrowser)

      const result = await fetchHtmlContent(validUrl, defaultOptions)

      expect(result.success).toBe(true)
      expect(result.method).toBe('dynamic')
      expect(mockBrowser.newPage).toHaveBeenCalledTimes(2)
    })

    it('should use networkidle2 retry on first navigation failure', async () => {
      const incompleteHtml = '<html><body><div id="root"></div></body></html>'
      const completeHtml = '<html><body><h1>Content</h1></body></html>'

      const staticResponse = {
        ok: true,
        text: jest.fn<() => Promise<string>>().mockResolvedValue(incompleteHtml),
      } as any
      mockFetch.mockResolvedValueOnce(staticResponse)

      const mockPage = {
        setUserAgent: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
        setViewport: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
        setRequestInterception: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
        on: jest.fn(),
        goto: jest.fn<() => Promise<void>>()
          .mockRejectedValueOnce(new Error('Connection failed'))
          .mockResolvedValueOnce(undefined),
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

      const result = await fetchHtmlContent(validUrl, defaultOptions)

      expect(result.success).toBe(true)
      expect(result.method).toBe('dynamic')
      expect(mockPage.goto).toHaveBeenCalledTimes(2)
    })

    it('should use default wait when no waitForSelector provided', async () => {
      const incompleteHtml = '<html><body><div id="root"></div></body></html>'
      const completeHtml = '<html><body><h1>Content</h1></body></html>'

      const staticResponse = {
        ok: true,
        text: jest.fn<() => Promise<string>>().mockResolvedValue(incompleteHtml),
      } as any
      mockFetch.mockResolvedValueOnce(staticResponse)

      const mockPage = {
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
        newPage: jest.fn<() => Promise<any>>().mockResolvedValue(mockPage),
        close: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
        connected: true,
      } as any

      ;(puppeteer.launch as jest.MockedFunction<typeof puppeteer.launch>).mockResolvedValue(mockBrowser)

      const result = await fetchHtmlContent(validUrl, { waitForTimeout: 1000 })

      expect(result.success).toBe(true)
      expect(result.method).toBe('dynamic')
    })

    it('should handle cleanup error gracefully', async () => {
      const incompleteHtml = '<html><body><div id="root"></div></body></html>'
      const completeHtml = '<html><body><h1>Content</h1></body></html>'

      const staticResponse = {
        ok: true,
        text: jest.fn<() => Promise<string>>().mockResolvedValue(incompleteHtml),
      } as any
      mockFetch.mockResolvedValueOnce(staticResponse)

      const mockPage = {
        setUserAgent: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
        setViewport: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
        setRequestInterception: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
        on: jest.fn(),
        goto: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
        waitForNetworkIdle: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
        evaluate: jest.fn<() => Promise<string>>().mockResolvedValue(completeHtml),
        close: jest.fn<() => Promise<void>>().mockRejectedValue('Unexpected cleanup error'),
        isClosed: jest.fn<() => boolean>().mockImplementation(() => {
          throw new Error('isClosed check failed')
        }),
      } as any

      const mockBrowser = {
        newPage: jest.fn<() => Promise<any>>().mockResolvedValue(mockPage),
        close: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
        connected: true,
      } as any

      ;(puppeteer.launch as jest.MockedFunction<typeof puppeteer.launch>).mockResolvedValue(mockBrowser)

      const result = await fetchHtmlContent(validUrl, defaultOptions)

      expect(result.success).toBe(true)
      expect(result.method).toBe('dynamic')
    })
  })

  // Internal functions are tested through fetchHtmlContent integration tests
  // to maintain encapsulation and focus on public API testing
})