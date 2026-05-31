import { fetchHtmlContent } from './html-fetcher'
import { extractEventsFromHtml } from './event-extractor'
import { processExtractedEvents } from './event-processor'
import { ExtractedEvent } from '../event-schema'

export interface MiningResult {
  success: boolean
  eventsExtracted: number
  eventsStored: number
  eventsFailed: number
  error?: string
  details?: string
}

export type ProgressCallback = (message: string) => void

async function fetchAndExtract(url: string, onProgress?: ProgressCallback): Promise<ExtractedEvent[]> {
  try {
    onProgress?.(`Obteniendo contenido de ${url}...`)

    const fetchResult = await fetchHtmlContent(url)

    if (!fetchResult.success || !fetchResult.fullHtml) {
      console.error(`[Direct Mining] Failed to fetch content from ${url}: ${fetchResult.error || 'No HTML content'}`)
      return []
    }

    console.log(`[Direct Mining] Successfully fetched content from ${url}`)

    const extractionResult = await extractEventsFromHtml(fetchResult.fullHtml, url)

    if (!extractionResult.success) {
      console.error(`[Direct Mining] Failed to extract events from ${url}: ${extractionResult.error}`)
      return []
    }

    if (!extractionResult.events || extractionResult.events.length === 0) {
      console.log(`[Direct Mining] No events found in content from ${url}`)
      return []
    }

    console.log(`[Direct Mining] Successfully extracted ${extractionResult.events.length} events from ${url}`)
    return extractionResult.events
  } catch (error) {
    console.error(`[Direct Mining] Error fetching/extracting from ${url}:`, error)
    throw error
  }
}

export async function mineUrlsDirectlyStreaming(
  urls: string[],
  userId: string,
  onProgress?: ProgressCallback
): Promise<MiningResult> {
  try {
    onProgress?.('Iniciando minería de datos...')

    const allEvents = (await Promise.all(
      urls.map(url => fetchAndExtract(url, onProgress))
    )).flat()

    if (allEvents.length === 0) {
      return {
        success: true,
        eventsExtracted: 0,
        eventsStored: 0,
        eventsFailed: 0,
        details: `No events found in the provided URL${urls.length > 1 ? 's' : ''}`
      }
    }

    onProgress?.(`Extraídos ${allEvents.length} eventos de ${urls.length} fuente${urls.length > 1 ? 's' : ''}. Procesando...`)

    const storedEvents = await processExtractedEvents(allEvents, userId)
    const failedCount = allEvents.length - storedEvents.length

    console.log(`[Direct Mining] Successfully stored ${storedEvents.length} events in database (${failedCount} failed)`)

    return {
      success: true,
      eventsExtracted: allEvents.length,
      eventsStored: storedEvents.length,
      eventsFailed: failedCount,
      details: `Successfully mined ${storedEvents.length} events from ${urls.length} source${urls.length > 1 ? 's' : ''}`
    }
  } catch (error) {
    console.error('[Direct Mining] Unexpected error:', error)
    return {
      success: false,
      eventsExtracted: 0,
      eventsStored: 0,
      eventsFailed: 0,
      error: error instanceof Error ? error.message : 'Unexpected error during mining'
    }
  }
}

export async function mineUrlDirectly(url: string, userId: string): Promise<MiningResult> {
  return mineUrlsDirectlyStreaming([url], userId)
}

export async function mineUrlDirectlyStreaming(url: string, userId: string, onProgress?: ProgressCallback): Promise<MiningResult> {
  return mineUrlsDirectlyStreaming([url], userId, onProgress)
}
