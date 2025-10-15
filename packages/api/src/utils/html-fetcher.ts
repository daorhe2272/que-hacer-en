/**
 * Enhanced HTML content fetcher with support for both static and dynamic websites
 * Uses Puppeteer for JavaScript-heavy sites and regular fetch for static sites
 */

import puppeteer, { HTTPRequest, Browser, Page } from 'puppeteer'

export interface FetchHtmlResult {
  success: boolean
  content?: string
  fullHtml?: string
  error?: string
  method?: 'static' | 'dynamic'
}

export interface FetchOptions {
  timeout?: number
  waitForSelector?: string
  waitForTimeout?: number
  blockResources?: boolean
  userAgent?: string
}

/**
 * Fetches HTML content from a URL with automatic detection of static vs dynamic content
 * @param url The URL to fetch HTML content from
 * @param options Configuration options for fetching
 * @returns Promise<FetchHtmlResult> Object containing success status, content, or error
 */
export async function fetchHtmlContent(url: string, options: FetchOptions = {}): Promise<FetchHtmlResult> {
  try {
    // Validate URL format
    new URL(url)
    
    const {
      timeout = 15000,
      waitForSelector,
      waitForTimeout = 3000,
      blockResources = true,
      userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    } = options
    
    // First, try a quick static fetch to see if the content is already there
    const staticResult = await tryStaticFetch(url, userAgent)

    // If static fetch succeeds and content looks complete, return it
    if (staticResult.success && isContentComplete(staticResult.fullHtml || staticResult.content || '')) {
      // Log the first 200 characters of the cleaned static HTML
      const preview = (staticResult.fullHtml || staticResult.content || '').substring(0, 300)
      console.log(`[HTML Fetcher] First 300 characters: ${preview}${preview.length < (staticResult.fullHtml || staticResult.content || '').length ? '...' : ''}`)

      return {
        ...staticResult,
        method: 'static'
      }
    }

    // If static fetch failed completely, don't try dynamic
    if (!staticResult.success) {
      return staticResult
    }

    // Otherwise, use Puppeteer for dynamic content
    const dynamicResult = await tryDynamicFetch(url, {
      timeout,
      waitForSelector,
      waitForTimeout,
      blockResources,
      userAgent
    })

    // If dynamic fetch fails but we have static content, use static as fallback
    if (!dynamicResult.success && staticResult.content) {
      return {
        ...staticResult,
        method: 'static'
      }
    }
    
    return {
      ...dynamicResult,
      method: 'dynamic'
    }
  } catch (error) {
    // Handle different error types without throwing
    if (error instanceof Error) {
      if (error.message.includes('Invalid URL')) {
        console.error(`[HTML Fetcher] Invalid URL: ${url}`)
        return {
          success: false,
          error: 'Invalid URL format'
        }
      }
      
      if (error.message.includes('ECONNREFUSED') || error.message.includes('ENOTFOUND')) {
        console.error(`[HTML Fetcher] Connection error for URL: ${url}`, error.message)
        return {
          success: false,
          error: 'Connection failed - domain not reachable'
        }
      }
      
      console.error(`[HTML Fetcher] Unexpected error for URL: ${url}`, error)
      return {
        success: false,
        error: error.message
      }
    }
    
    // Handle unknown error types
    console.error(`[HTML Fetcher] Unknown error for URL: ${url}`, error)
    return {
      success: false,
      error: 'Unknown error occurred'
    }
  }
}

/**
 * Cleans HTML content by removing JavaScript and styling elements
 */
async function cleanPageContent(page: Page): Promise<string> {
  return await page.evaluate(() => {
    // Remove all script elements
    const scripts = document.querySelectorAll('script')
    scripts.forEach(script => script.remove())

    // Remove all style elements
    const styles = document.querySelectorAll('style')
    styles.forEach(style => style.remove())

    // Remove all link elements with rel="stylesheet"
    const styleLinks = document.querySelectorAll('link[rel="stylesheet"]')
    styleLinks.forEach(link => link.remove())

    // Remove all elements with style attributes (optional - removes inline styles)
    const styledElements = document.querySelectorAll('[style]')
    styledElements.forEach(el => el.removeAttribute('style'))

    // Return the cleaned HTML
    return document.documentElement.outerHTML
  })
}

/**
 * Checks if the static content appears to be complete
 * Simple heuristic: if content has substantial body text and no loading indicators
 */
function isContentComplete(html: string): boolean {
  // Check for loading indicators or minimal content
  const loadingIndicators = [
    'loading...',
    'cargando...',
    'please wait',
    'espere por favor'
  ]
  
  const hasLoadingIndicator = loadingIndicators.some(indicator =>
    html.toLowerCase().includes(indicator.toLowerCase())
  )
  
  // Check if there's substantial content (more than 1000 characters to be more certain)
  const hasSubstantialContent = html.length > 1000
  const hasVerySubstantialContent = html.length > 50000
  
  // Check for empty React/Vue/Angular app containers
  const hasEmptyReactRoot = html.includes('<div id="root"></div>') || html.includes('<div id="root"></div>')
  const hasEmptyVueRoot = html.includes('<div id="app"></div>')
  const hasEmptyAngularRoot = html.includes('<ng-app></ng-app>')
  
  // If there are empty app containers, it's likely a dynamic SPA
  if (hasEmptyReactRoot || hasEmptyVueRoot || hasEmptyAngularRoot) {
    return false
  }

  // Check for framework indicators that suggest dynamic content
  const hasReactIndicators = html.includes('data-reactroot') || html.includes('react-root') || html.includes('ReactDOM')
  const hasVueIndicators = html.includes('data-v-') || html.includes('v-app') || html.includes('Vue.createApp')
  const hasAngularIndicators = html.includes('ng-app') || html.includes('ng-version')

  // If there are framework indicators but no substantial content, it's likely dynamic
  if ((hasReactIndicators || hasVueIndicators || hasAngularIndicators) && !hasSubstantialContent) {
    return false
  }

  // If we have very substantial content (50KB+), trust it even with loading indicators
  // This handles cases where "loading" text appears in unrelated content
  if (hasVerySubstantialContent) {
    return true
  }

  // If there are loading indicators with less content, it's likely dynamic
  if (hasLoadingIndicator) {
    return false
  }

  // If we have substantial content, assume static is complete
  if (hasSubstantialContent) {
    return true
  }

  // Default to false for short content
  return false
}

/**
 * Attempts a static fetch using Node.js fetch
 */
async function tryStaticFetch(url: string, userAgent: string): Promise<FetchHtmlResult> {
  try {
    // Create AbortController for timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000) // 5 second timeout for static
    
    // Fetch the HTML content
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': userAgent,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      }
    })
    
    // Clear timeout if fetch completes
    clearTimeout(timeoutId)
    
    // Check if response is OK
    if (!response.ok) {
      const errorText = await response.text()
      console.error(`[HTML Fetcher] Static fetch HTTP error ${response.status} for URL: ${url}`, errorText)
      return {
        success: false,
        error: `HTTP ${response.status}: ${response.statusText}`
      }
    }
    
    // Get the HTML content
    const html = await response.text()
    
    // Return preview and full HTML
    const preview = html.substring(0, 200)

    return {
      success: true,
      content: preview,
      fullHtml: html
    }
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.error(`[HTML Fetcher] Static fetch timeout for URL: ${url}`)
      return {
        success: false,
        error: 'Static fetch timeout'
      }
    }
    
    console.error(`[HTML Fetcher] Static fetch failed for URL: ${url}`, error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Static fetch failed'
    }
  }
}

/**
 * Attempts a dynamic fetch using Puppeteer
 */
async function tryDynamicFetch(url: string, options: {
  timeout: number
  waitForSelector?: string
  waitForTimeout: number
  blockResources: boolean
  userAgent: string
}): Promise<FetchHtmlResult> {
  let browser: Browser | null = null
  let page: Page | null = null
  
  try {
    // Launch browser with optimizations
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-gpu',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
        '--disable-background-timer-throttling',
        '--disable-renderer-backgrounding',
        '--disable-backgrounding-occluded-windows',
        '--disable-ipc-flooding-protection',
        '--disable-default-apps'
      ]
    })
    
    page = await browser.newPage()
    
    // Set user agent
    await page.setUserAgent(options.userAgent)
    
    // Set viewport
    await page.setViewport({ width: 1920, height: 1080 })
    
    // Block resources if requested (for faster loading)
    if (options.blockResources) {
      await page.setRequestInterception(true)
      page.on('request', (req: HTTPRequest) => {
        const resourceType = req.resourceType()
        if (['image', 'stylesheet', 'font', 'media'].includes(resourceType)) {
          req.abort()
        } else {
          req.continue()
        }
      })
    }
    
    // Navigate to the page with retry logic
    let navigationSuccess = false
    const navigationOptions = {
      waitUntil: 'domcontentloaded' as const,
      timeout: options.timeout
    }
    
    try {
      await page.goto(url, navigationOptions)
      navigationSuccess = true
    } catch (navError) {
      const errorMessage = navError instanceof Error ? navError.message : String(navError)
      console.warn(`[HTML Fetcher] First navigation attempt failed: ${errorMessage}`)
      
      if (errorMessage.includes('detached') || errorMessage.includes('Detached')) {
        try {
          await page.close()
        } catch (e) {
          console.warn(`[HTML Fetcher] Error closing corrupted page (expected):`, e instanceof Error ? e.message : e)
        }

        page = await browser.newPage()
        await page.setUserAgent(options.userAgent)
        await page.setViewport({ width: 1920, height: 1080 })

        if (options.blockResources) {
          await page.setRequestInterception(true)
          page.on('request', (req: HTTPRequest) => {
            const resourceType = req.resourceType()
            if (['image', 'stylesheet', 'font', 'media'].includes(resourceType)) {
              req.abort()
            } else {
              req.continue()
            }
          })
        }
      }

      try {
        await page.goto(url, {
          waitUntil: 'networkidle2',
          timeout: options.timeout * 1.5
        })
        navigationSuccess = true
      } catch (secondError) {
        console.error(`[HTML Fetcher] Both navigation attempts failed: ${secondError}`)
        throw secondError
      }
    }
    
    if (!navigationSuccess) {
      throw new Error('Navigation failed after retries')
    }
    
    // Additional wait for dynamic content
    try {
      await page.waitForNetworkIdle({ timeout: 5000 })
    } catch (e) {
      // Network idle timeout is expected for some sites
    }

    // Wait for specific selector if provided
    if (options.waitForSelector) {
      try {
        await page.waitForSelector(options.waitForSelector, { timeout: options.waitForTimeout })
      } catch (error) {
        console.warn(`[HTML Fetcher] Selector not found: ${options.waitForSelector}`)
      }
    } else {
      // Default wait for dynamic content
      await new Promise(resolve => setTimeout(resolve, options.waitForTimeout))
    }
    
    // Check if page is still valid before extracting content
    try {
      await page.evaluate(() => true)
    } catch (e) {
      console.warn(`[HTML Fetcher] Page validation failed, attempting to extract content anyway`)
    }
    
    // Get the HTML content (attempt even if page validation failed)
    let html: string
    try {
      // Always clean HTML content for data mining purposes
      html = await cleanPageContent(page)
    } catch (contentError) {
      throw new Error(`Failed to extract page content: ${contentError instanceof Error ? contentError.message : 'Unknown error'}`)
    }
    
    // Log the first 200 characters of the cleaned HTML
    const preview = html.substring(0, 200)
    console.log(`[HTML Fetcher] First 200 characters: ${preview}${html.length > 200 ? '...' : ''}`)

    return {
      success: true,
      content: preview,
      fullHtml: html
    }
  } catch (error) {
    console.error(`[HTML Fetcher] Puppeteer fetch failed for URL: ${url}`, error)
    
    if (error instanceof Error) {
      if (error.message.includes('TimeoutError')) {
        return {
          success: false,
          error: 'Page load timeout'
        }
      }
      
      return {
        success: false,
        error: error.message
      }
    }
    
    return {
      success: false,
      error: 'Puppeteer fetch failed'
    }
  } finally {
    // Clean up resources
    try {
      if (page && !page.isClosed()) {
        await page.close().catch(err => {
          console.warn(`[HTML Fetcher] Page already closed:`, err instanceof Error ? err.message : err)
        })
      }
      if (browser && browser.connected) {
        await browser.close().catch(err => {
          console.warn(`[HTML Fetcher] Browser already closed:`, err instanceof Error ? err.message : err)
        })
      }
      // Puppeteer resources cleaned up
    } catch (cleanupError) {
      console.warn(`[HTML Fetcher] Error cleaning up Puppeteer resources:`, cleanupError instanceof Error ? cleanupError.message : cleanupError)
    }
  }
}