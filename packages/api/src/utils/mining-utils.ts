import { fetchHtmlContent } from './html-fetcher'
import { extractEventsFromHtml } from './event-extractor'
import { processExtractedEvents } from './event-processor'

export interface MiningResult {
  success: boolean
  eventsExtracted: number
  eventsStored: number
  eventsFailed: number
  error?: string
  details?: string
}

export type ProgressCallback = (message: string) => void

/**
 * Core mining logic extracted from data source mining
 * Mines a URL directly without requiring database records
 */
export async function mineUrlDirectly(url: string, userId: string): Promise<MiningResult> {
  return mineUrlDirectlyStreaming(url, userId, () => {}) // No progress callback for non-streaming
}

/**
 * Streaming version of mining logic with progress updates
 * Mines a URL directly without requiring database records
 */
export async function mineUrlDirectlyStreaming(url: string, userId: string, onProgress?: ProgressCallback): Promise<MiningResult> {
  try {
    console.log(`[Direct Mining] Starting mining process for URL: ${url}`)
    onProgress?.('Iniciando proceso de minería...')

    // Step 1: Fetch HTML content from the URL
    onProgress?.('Obteniendo contenido de la URL...')
    const fetchResult = await fetchHtmlContent(url)

    if (!fetchResult.success) {
      console.error(`[Direct Mining] Failed to fetch content from ${url}: ${fetchResult.error}`)
      return {
        success: false,
        eventsExtracted: 0,
        eventsStored: 0,
        eventsFailed: 0,
        error: fetchResult.error || 'Failed to fetch URL content'
      }
    }

    if (!fetchResult.fullHtml) {
      console.error(`[Direct Mining] No HTML content received from ${url}`)
      return {
        success: false,
        eventsExtracted: 0,
        eventsStored: 0,
        eventsFailed: 0,
        error: 'No content received from URL'
      }
    }


    console.log(`[Direct Mining] Successfully fetched content from ${url}`)
    onProgress?.('Contenido obtenido exitosamente, analizando...')

    // Step 2: Extract events from the HTML content using AI
    console.log(`[Direct Mining] Starting event extraction from HTML content`)
    onProgress?.('Extrayendo eventos con IA...')

    const extractionResult = await extractEventsFromHtml(fetchResult.fullHtml, url)

    if (!extractionResult.success) {
      console.error(`[Direct Mining] Failed to extract events: ${extractionResult.error}`)
      return {
        success: false,
        eventsExtracted: 0,
        eventsStored: 0,
        eventsFailed: 0,
        error: extractionResult.error || 'Failed to extract events from content'
      }
    }

    if (!extractionResult.events || extractionResult.events.length === 0) {
      console.log(`[Direct Mining] No events found in content from ${url}`)
      onProgress?.('No se encontraron eventos en la URL proporcionada')
      return {
        success: true,
        eventsExtracted: 0,
        eventsStored: 0,
        eventsFailed: 0,
        details: 'No events found in the provided URL'
      }
    }

    console.log(`[Direct Mining] Successfully extracted ${extractionResult.events.length} events`)
    onProgress?.(`${extractionResult.events.length} eventos encontrados, guardando en base de datos...`)

    // Step 3: Process and store events in database
    const storedEvents = await processExtractedEvents(extractionResult.events, userId)
    const failedCount = extractionResult.events.length - storedEvents.length

    console.log(`[Direct Mining] Successfully stored ${storedEvents.length} events in database (${failedCount} failed)`)

    const successMessage = `Completado: ${storedEvents.length} eventos guardados${failedCount > 0 ? ` (${failedCount} fallaron)` : ''}`
    onProgress?.(successMessage)

    return {
      success: true,
      eventsExtracted: extractionResult.events.length,
      eventsStored: storedEvents.length,
      eventsFailed: failedCount,
      details: `Successfully mined ${storedEvents.length} events from ${url}`
    }

  } catch (error) {
    console.error('[Direct Mining] Unexpected error:', error)
    onProgress?.('Error durante el proceso de minería')
    return {
      success: false,
      eventsExtracted: 0,
      eventsStored: 0,
      eventsFailed: 0,
      error: error instanceof Error ? error.message : 'Unexpected error during mining'
    }
  }
}