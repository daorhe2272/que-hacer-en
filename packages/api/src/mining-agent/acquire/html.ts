/**
 * HTML source acquisition for the mining agent.
 *
 * Fetching and pruning are kept as separate exported functions (so the raw
 * extraction can later be mirrored by other source types, e.g. pdf) but every
 * workflow that acquires an HTML document runs both: acquireHtml() composes
 * fetch + prune into a single acquisition step.
 */

import puppeteer, { Browser, Page } from 'puppeteer-core'
import { Agent, fetch as undiciFetch } from 'undici'
import type { FetchResult, PrunedDocument, RawFetchResult } from './types'

const ATTRS_TO_KEEP = ['href', 'src', 'role', 'datetime']
const ATTR_PATTERN = /\s+([a-zA-Z0-9-:]+)(=("[^"]*"|'[^']*'))?/g

const DEFAULT_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'

const STATIC_TIMEOUT_MS = 5000
const LOADING_INDICATORS = ['loading...', 'cargando...', 'please wait', 'espere por favor']
const BLOCKED_RESOURCE_TYPES = ['image', 'stylesheet', 'font', 'media']

export interface FetchHtmlOptions {
  timeout?: number
  waitForSelector?: string
  waitForTimeout?: number
  blockResources?: boolean
  userAgent?: string
}

export interface AcquireHtmlOptions extends FetchHtmlOptions {
  fetcher?: typeof fetchHtml
}

interface DynamicFetchOptions {
  timeout: number
  waitForSelector?: string
  waitForTimeout: number
  blockResources: boolean
  userAgent: string
}

export function pruneHtml(html: string): PrunedDocument {
  const content = cleanHtml(html)
  return {
    content,
    rawLength: html.length,
    rawWords: countWords(html),
    prunedLength: content.length,
    prunedWords: countWords(content),
  }
}

function countWords(text: string): number {
  return text.trim() ? text.split(/\s+/).length : 0
}

export async function acquireHtml(url: string, options: AcquireHtmlOptions = {}): Promise<{
  success: boolean
  sourceType: 'html'
  url: string
  method?: 'static' | 'dynamic'
  durationMs: number
  rawLength: number
  prunedLength: number
  error?: string
  document?: PrunedDocument
}> {
  const { fetcher = fetchHtml, ...fetchOptions } = options
  const fetched = await fetcher(url, fetchOptions)
  if (!fetched.success || !fetched.html) {
    return {
      success: false,
      sourceType: 'html',
      url,
      durationMs: fetched.durationMs,
      rawLength: 0,
      prunedLength: 0,
      error: fetched.error ?? 'Fetch failed',
    }
  }
  const document = pruneHtml(fetched.html)
  return {
    success: true,
    sourceType: 'html',
    url,
    method: fetched.method,
    durationMs: fetched.durationMs,
    rawLength: document.rawLength,
    prunedLength: document.prunedLength,
    document,
  }
}

/**
 * Fetches a URL as raw HTML. Tries a static fetch first (undici, relaxed SSL)
 * and falls back to a headless browser when the response looks like an
 * incomplete SPA shell.
 */
export async function fetchHtml(url: string, options: FetchHtmlOptions = {}): Promise<FetchResult> {
  const start = Date.now()
  try {
    new URL(url)
    const {
      timeout = 15000,
      waitForSelector,
      waitForTimeout = 3000,
      blockResources = true,
      userAgent = DEFAULT_USER_AGENT,
    } = options

    const staticResult = await tryStaticFetch(url, userAgent)

    if (staticResult.success && isContentComplete(staticResult.html ?? '')) {
      return { ...staticResult, method: 'static', durationMs: Date.now() - start }
    }

    if (!staticResult.success) {
      return { ...staticResult, durationMs: Date.now() - start }
    }

    const dynamicResult = await tryDynamicFetch(url, {
      timeout,
      waitForSelector,
      waitForTimeout,
      blockResources,
      userAgent,
    })

    return { ...dynamicResult, method: 'dynamic', durationMs: Date.now() - start }
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ERR_INVALID_URL') {
      return { success: false, error: 'Invalid URL format', durationMs: Date.now() - start }
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unexpected error',
      durationMs: Date.now() - start,
    }
  }
}

function cleanHtml(html: string): string {
  const withoutScriptsAndStyles = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<link[^>]*rel=["']stylesheet["'][^>]*>/gi, ' ')

  return collapseWhitespace(stripAttributes(withoutScriptsAndStyles))
}

function stripAttributes(html: string): string {
  return html.replace(/<([a-zA-Z][a-zA-Z0-9-]*)((?:\s+[a-zA-Z0-9-:]+(?:=(?:"[^"]*"|'[^']*'))?)*)(\s*\/?)>/g, (_match, tag, attrs, selfClose) => {
    const kept: string[] = []
    let attrMatch: RegExpExecArray | null
    ATTR_PATTERN.lastIndex = 0
    while ((attrMatch = ATTR_PATTERN.exec(attrs))) {
      const name = attrMatch[1].toLowerCase()
      if (ATTRS_TO_KEEP.includes(name)) kept.push(attrMatch[2] ? `${name}=${attrMatch[3]}` : name)
    }
    const attrString = kept.length > 0 ? ` ${kept.join(' ')}` : ''
    return `<${tag}${attrString}${selfClose.trim()}>`
  })
}

function collapseWhitespace(html: string): string {
  return html
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n+/g, '\n')
    .trim()
}

/**
 * Heuristic that decides whether the static response already contains the
 * rendered document or whether it is a dynamic SPA shell that needs a browser.
 */
function isContentComplete(html: string): boolean {
  const lower = html.toLowerCase()
  const hasEmptyAppRoot = html.includes('<div id="root"></div>') || html.includes('<div id="app"></div>')
  if (hasEmptyAppRoot) return false

  const hasSubstantialContent = html.length > 1000
  const hasVerySubstantialContent = html.length > 50000
  const hasFrameworkIndicators = /data-reactroot|react-root|data-v-|ng-app|ng-version/i.test(html)

  if (hasFrameworkIndicators && !hasSubstantialContent) return false
  if (hasVerySubstantialContent) return true
  if (LOADING_INDICATORS.some(indicator => lower.includes(indicator))) return false
  return hasSubstantialContent
}

async function tryStaticFetch(url: string, userAgent: string): Promise<RawFetchResult> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), STATIC_TIMEOUT_MS)
  try {
    // Reason: relaxed SSL lets us read sites with self-signed or incomplete certificate chains.
    const agent = new Agent({
      connect: { rejectUnauthorized: false },
    })
    const response = await undiciFetch(url, {
      signal: controller.signal,
      dispatcher: agent,
      headers: {
        'User-Agent': userAgent,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate',
        'Upgrade-Insecure-Requests': '1',
      },
    })
    if (!response.ok) {
      return { success: false, error: `HTTP ${response.status}: ${response.statusText}` }
    }
    return { success: true, html: await response.text() }
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return { success: false, error: 'Static fetch timeout' }
    }
    if (error instanceof Error && /ECONNREFUSED|ENOTFOUND/.test(error.message)) {
      return { success: false, error: 'Connection failed - domain not reachable' }
    }
    return { success: false, error: error instanceof Error ? error.message : 'Static fetch failed' }
  } finally {
    clearTimeout(timeoutId)
  }
}

async function tryDynamicFetch(url: string, options: DynamicFetchOptions): Promise<RawFetchResult> {
  let browser: Browser | null = null
  let page: Page | null = null
  try {
    // Reason: puppeteer-core ships no bundled Chromium; the binary comes from the
    // system (Alpine's chromium package in prod) via PUPPETEER_EXECUTABLE_PATH.
    browser = await puppeteer.launch({
      headless: true,
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH,
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
        '--disable-default-apps',
      ],
    })

    page = await browser.newPage()
    await page.setUserAgent(options.userAgent)
    await page.setViewport({ width: 1920, height: 1080 })
    if (options.blockResources) {
      await setupResourceBlocking(page)
    }

    let navigated = false
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: options.timeout })
      navigated = true
    } catch (firstError) {
      // A detached frame often poisons the page for any further use; recover with a fresh one.
      if (firstError instanceof Error && /detached/i.test(firstError.message)) {
        try {
          await page.close()
        } catch {
          // best-effort
        }
        page = await browser.newPage()
        await page.setUserAgent(options.userAgent)
        await page.setViewport({ width: 1920, height: 1080 })
        if (options.blockResources) {
          await setupResourceBlocking(page)
        }
      }
      await page.goto(url, { waitUntil: 'networkidle2', timeout: options.timeout * 1.5 })
      navigated = true
    }
    if (!navigated) {
      throw new Error('Navigation failed after retries')
    }

    try {
      await page.waitForNetworkIdle({ timeout: 5000 })
    } catch {
      // Network idle timeout is expected for some sites
    }

    if (options.waitForSelector) {
      try {
        await page.waitForSelector(options.waitForSelector, { timeout: options.waitForTimeout })
      } catch {
        // Selector not found; continue with whatever is rendered
      }
    } else {
      await new Promise(resolve => setTimeout(resolve, options.waitForTimeout))
    }

    return { success: true, html: await page.evaluate(() => document.documentElement.outerHTML) }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    if (/timeouterror/i.test(message)) {
      return { success: false, error: 'Page load timeout' }
    }
    return { success: false, error: message }
  } finally {
    try {
      if (page && !page.isClosed()) await page.close()
      if (browser && browser.connected) await browser.close()
    } catch {
      // best-effort cleanup
    }
  }
}

async function setupResourceBlocking(page: Page): Promise<void> {
  await page.setRequestInterception(true)
  page.on('request', request => {
    const resourceType = request.resourceType()
    if (BLOCKED_RESOURCE_TYPES.includes(resourceType)) {
      request.abort()
    } else {
      request.continue()
    }
  })
}