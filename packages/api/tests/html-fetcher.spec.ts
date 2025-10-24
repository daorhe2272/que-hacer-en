import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals'
import puppeteer from 'puppeteer'

// Mock undici before importing html-fetcher
jest.mock('undici')

import { fetchHtmlContent, FetchOptions } from '../src/utils/html-fetcher'
import * as undici from 'undici'

// Get the mocked functions
const mockUndiciFetch = undici.fetch as any as jest.MockedFunction<typeof fetch>

// Also keep global fetch mock for compatibility
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
      mockUndiciFetch.mockResolvedValue(mockResponse)

      const result = await fetchHtmlContent(validUrl, defaultOptions)

      expect(result.success).toBe(true)
      expect(result.method).toBe('static')
      expect(result.content).toContain('<html><body><h1>Complete Content</h1>')
      expect(result.fullHtml).toContain('<html><body><h1>Complete Content</h1>')
      expect(mockUndiciFetch).toHaveBeenCalledTimes(1)
    })

    it('should fallback to dynamic fetch when static content is incomplete', async () => {
      const incompleteHtml = '<html><body><div id="root"></div></body></html>'
      const completeHtml = '<html><body><h1>Dynamic Content</h1></body></html>'

      // Mock static fetch
      const staticResponse = {
        ok: true,
        text: jest.fn<() => Promise<string>>().mockResolvedValue(incompleteHtml),
      } as any
      mockUndiciFetch.mockResolvedValueOnce(staticResponse)

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
      mockUndiciFetch.mockResolvedValueOnce(staticResponse)

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
      mockUndiciFetch.mockRejectedValue(new Error('ECONNREFUSED'))

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
      mockUndiciFetch.mockResolvedValue(errorResponse)

      const result = await fetchHtmlContent(validUrl, defaultOptions)

      expect(result.success).toBe(false)
      expect(result.error).toBe('HTTP 404: Not Found')
    })

    it('should handle static fetch timeout', async () => {
      mockUndiciFetch.mockImplementation((_url, options: any) => {
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
      mockUndiciFetch.mockResolvedValue(mockResponse as any)

      await fetchHtmlContent(validUrl, customOptions)

      expect(mockUndiciFetch).toHaveBeenCalledWith(
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
      mockUndiciFetch.mockResolvedValueOnce(staticResponse)

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
      mockUndiciFetch.mockResolvedValueOnce(staticResponse)

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
      mockUndiciFetch.mockRejectedValue(new Error('Network error'))

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
      mockUndiciFetch.mockResolvedValueOnce(staticResponse)

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
      mockUndiciFetch.mockResolvedValueOnce(staticResponse)

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
      mockUndiciFetch.mockResolvedValueOnce(staticResponse)

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
      mockUndiciFetch.mockResolvedValueOnce(staticResponse)

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
      mockUndiciFetch.mockResolvedValueOnce(staticResponse)

      const mockPage = {
        setUserAgent: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
        setViewport: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
        setRequestInterception: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
        on: jest.fn(),
        goto: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
        waitForNetworkIdle: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
        evaluate: jest.fn<() => Promise<any>>()
          .mockRejectedValueOnce(new Error('Page validation failed'))
          .mockResolvedValueOnce(completeHtml)
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
      mockUndiciFetch.mockRejectedValue(new Error('Connection refused'))

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
      mockUndiciFetch.mockResolvedValueOnce(staticResponse)

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
      mockUndiciFetch.mockResolvedValueOnce(staticResponse)

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
      mockUndiciFetch.mockResolvedValueOnce(staticResponse)

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
      mockUndiciFetch.mockResolvedValueOnce(staticResponse)

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
      mockUndiciFetch.mockResolvedValueOnce(staticResponse)

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

    // Additional tests for uncovered branches

    it('should handle isContentComplete with React indicators and no substantial content', async () => {
    // Content with React indicators but not enough content (less than 1000 chars)
    const reactHtml = '<html><body><div data-reactroot><p>Some content</p></div></body></html>'

    const mockResponse = {
      ok: true,
      text: jest.fn<() => Promise<string>>().mockResolvedValue(reactHtml),
    } as any
    mockUndiciFetch.mockResolvedValue(mockResponse)

    // Since the content is incomplete, it should try dynamic fetch
    const dynamicHtml = '<html><body><h1>Full Content</h1></body></html>'
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

    const result = await fetchHtmlContent(validUrl, defaultOptions)

    expect(result.success).toBe(true)
    expect(result.method).toBe('dynamic')
  })

  it('should handle isContentComplete with very substantial content (50KB+)', async () => {
      // Content with 51KB of data - should be trusted even with framework indicators
      const veryLargeHtml = '<html><body><div data-reactroot>' + 'x'.repeat(51000) + '</div></body></html>'

      const mockResponse = {
        ok: true,
        text: jest.fn<() => Promise<string>>().mockResolvedValue(veryLargeHtml),
      } as any
      mockUndiciFetch.mockResolvedValue(mockResponse)

      const result = await fetchHtmlContent(validUrl, defaultOptions)

      // Should return static result because content is very substantial (>50KB)
      // This tests line 226: if (hasVerySubstantialContent) return true
      expect(result.success).toBe(true)
      expect(result.method).toBe('static')
      expect(mockUndiciFetch).toHaveBeenCalledTimes(1)
    })

  it('should handle content with loading indicators', async () => {
      // Content with loading indicator but not very substantial
      const htmlWithLoading = '<html><body><div>Loading... Please wait</div></body></html>'

      const mockResponse = {
        ok: true,
        text: jest.fn<() => Promise<string>>().mockResolvedValue(htmlWithLoading),
      } as any
      mockUndiciFetch.mockResolvedValue(mockResponse)

      // Should fallback to dynamic fetch due to loading indicator
      const dynamicHtml = '<html><body><h1>Loaded Content</h1></body></html>'
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

      const result = await fetchHtmlContent(validUrl, defaultOptions)

      // Should use dynamic fetch because of loading indicator (line 231)
      expect(result.success).toBe(true)
      expect(result.method).toBe('dynamic')
    })

  it('should handle resource blocking when blockResources is true', async () => {
      const incompleteHtml = '<html><body><div id="root"></div></body></html>'
      const completeHtml = '<html><body><h1>Content</h1></body></html>'

      const staticResponse = {
        ok: true,
        text: jest.fn<() => Promise<string>>().mockResolvedValue(incompleteHtml),
      } as any
      mockUndiciFetch.mockResolvedValueOnce(staticResponse)

      // Mock request object to verify blocking behavior
      const mockRequests: any[] = []
      const createMockRequest = (resourceType: string) => ({
        resourceType: () => resourceType,
        abort: jest.fn(),
        continue: jest.fn(),
      })

      const mockPage = {
        setUserAgent: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
        setViewport: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
        setRequestInterception: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
        on: jest.fn((event: string, handler: Function) => {
          if (event === 'request') {
            // Simulate requests for different resource types
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

      const result = await fetchHtmlContent(validUrl, { blockResources: true })

      // Verify resource blocking was enabled (lines 373-377)
      expect(result.success).toBe(true)
      expect(mockPage.setRequestInterception).toHaveBeenCalledWith(true)
      expect(mockPage.on).toHaveBeenCalledWith('request', expect.any(Function))

      // Verify that image requests were aborted and script requests continued
      if (mockRequests.length > 0) {
        const imageReq = mockRequests[0]
        const scriptReq = mockRequests[1]
        expect(imageReq.abort).toHaveBeenCalled()
        expect(scriptReq.continue).toHaveBeenCalled()
      }
    })

  it('should handle resource blocking in retry after detached error', async () => {
      const incompleteHtml = '<html><body><div id="root"></div></body></html>'
      const completeHtml = '<html><body><h1>Content</h1></body></html>'

      const staticResponse = {
        ok: true,
        text: jest.fn<() => Promise<string>>().mockResolvedValue(incompleteHtml),
      } as any
      mockUndiciFetch.mockResolvedValueOnce(staticResponse)

      // Track request handlers for both pages
      const mockRequests: any[] = []
      const createMockRequest = (resourceType: string) => ({
        resourceType: () => resourceType,
        abort: jest.fn(),
        continue: jest.fn(),
      })

      const mockPage1 = {
        setUserAgent: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
        setViewport: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
        setRequestInterception: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
        on: jest.fn((event: string, handler: Function) => {
          if (event === 'request') {
            const req = createMockRequest('image')
            mockRequests.push(req)
            handler(req)
          }
        }),
        goto: jest.fn<() => Promise<void>>().mockRejectedValue(new Error('Frame was detached')),
        close: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
        isClosed: jest.fn<() => boolean>().mockReturnValue(false),
      } as any

      const mockPage2 = {
        setUserAgent: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
        setViewport: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
        setRequestInterception: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
        on: jest.fn((event: string, handler: Function) => {
          if (event === 'request') {
            const req = createMockRequest('stylesheet')
            mockRequests.push(req)
            handler(req)
          }
        }),
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

      const result = await fetchHtmlContent(validUrl, { blockResources: true })

      // Verify resource blocking was set up on both pages (lines 410-414)
      expect(result.success).toBe(true)
      expect(mockBrowser.newPage).toHaveBeenCalledTimes(2)
      expect(mockPage2.setRequestInterception).toHaveBeenCalledWith(true)
      expect(mockPage2.on).toHaveBeenCalledWith('request', expect.any(Function))

      // Verify resources were actually blocked
      expect(mockRequests.length).toBeGreaterThan(0)
    })

  // Error handling tests for uncovered branches

  it('should handle page close error during detached recovery (line 388)', async () => {
    const incompleteHtml = '<html><body><div id="root"></div></body></html>'
    const completeHtml = '<html><body><h1>Content</h1></body></html>'

    const staticResponse = {
      ok: true,
      text: jest.fn<() => Promise<string>>().mockResolvedValue(incompleteHtml),
    } as any
    mockUndiciFetch.mockResolvedValueOnce(staticResponse)

    // First page that gets detached and fails to close
    const mockPage1 = {
      setUserAgent: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
      setViewport: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
      setRequestInterception: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
      on: jest.fn(),
      goto: jest.fn<() => Promise<void>>().mockRejectedValue(new Error('Frame was detached')),
      close: jest.fn<() => Promise<void>>().mockRejectedValue(new Error('Page already closed')),
      isClosed: jest.fn<() => boolean>().mockReturnValue(false),
    } as any

    // Second page that works
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

    // Should succeed despite page.close() error
    expect(result.success).toBe(true)
    expect(result.method).toBe('dynamic')
    expect(mockPage1.close).toHaveBeenCalled()
    expect(mockBrowser.newPage).toHaveBeenCalledTimes(2)
  })

  it('should handle non-blocked resource continuation in retry path (line 402)', async () => {
    const incompleteHtml = '<html><body><div id="root"></div></body></html>'
    const completeHtml = '<html><body><h1>Content</h1></body></html>'

    const staticResponse = {
      ok: true,
      text: jest.fn<() => Promise<string>>().mockResolvedValue(incompleteHtml),
    } as any
    mockUndiciFetch.mockResolvedValueOnce(staticResponse)

    // Track request handlers for both pages
    const mockRequests: any[] = []
    const createMockRequest = (resourceType: string) => ({
      resourceType: () => resourceType,
      abort: jest.fn(),
      continue: jest.fn(),
    })

    // First page that gets detached
    const mockPage1 = {
      setUserAgent: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
      setViewport: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
      setRequestInterception: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
      on: jest.fn(),
      goto: jest.fn<() => Promise<void>>().mockRejectedValue(new Error('Frame was detached')),
      close: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
      isClosed: jest.fn<() => boolean>().mockReturnValue(false),
    } as any

    // Second page with NON-blocked resource types (script, document, etc.)
    const mockPage2 = {
      setUserAgent: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
      setViewport: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
      setRequestInterception: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
      on: jest.fn((event: string, handler: Function) => {
        if (event === 'request') {
          // Simulate requests for NON-blocked resource types
          const scriptReq = createMockRequest('script')
          const documentReq = createMockRequest('document')
          mockRequests.push(scriptReq, documentReq)
          handler(scriptReq)
          handler(documentReq)
        }
      }),
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

    const result = await fetchHtmlContent(validUrl, { blockResources: true })

    // Should succeed with retry
    expect(result.success).toBe(true)
    expect(result.method).toBe('dynamic')
    expect(mockBrowser.newPage).toHaveBeenCalledTimes(2)

    // Verify that non-blocked resources called continue() (line 402)
    expect(mockRequests.length).toBe(2)
    expect(mockRequests[0].continue).toHaveBeenCalled() // script
    expect(mockRequests[1].continue).toHaveBeenCalled() // document
  })

  })
})