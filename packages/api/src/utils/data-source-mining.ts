import { query } from '../db/client'
import { fetchHtmlContent } from './html-fetcher'
import { extractEventsFromHtml } from './event-extractor'
import { processExtractedEvents } from './event-processor'

export type MineDataSourceStatus = 'not_found' | 'inactive' | 'completed' | 'failed'

export interface MineDataSourceResult {
  status: MineDataSourceStatus
  // True when the extraction step itself succeeded (even if it returned zero events).
  extractionSuccess?: boolean
  eventsExtracted?: number
  eventsStored?: number
  eventsFailed?: number
  error?: string
}

/**
 * Mines a single data source end-to-end, keeping data_sources.mining_status and
 * last_mined up to date. Shared by the single-source route (POST /:id/mine) and
 * the scheduled batch job (POST /mine-due).
 */
export interface MineDueResult {
  success: boolean
  sourcesChecked: number
  sourcesDue: number
  sourcesCompleted: number
  sourcesFailed: number
  eventsExtracted: number
  eventsStored: number
  details?: string
  error?: string
}

/**
 * Runs `fn` for each item with at most `limit` in-flight calls. Errors must be
 * contained inside `fn` so a single failure doesn't reject the whole batch.
 */
async function mapWithConcurrency<T, R>(
  items: readonly T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length)
  let next = 0

  async function worker() {
    while (next < items.length) {
      const index = next++
      results[index] = await fn(items[index], index)
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, () => worker())
  )
  return results
}

// Scheduled jobs have no authenticated user, so mined events get created_by of the
// first admin user, keeping the audit trail pointing at a real account.
async function getScheduledAdminUserId(): Promise<string> {
  const res = await query<{ id: string }>(
    `SELECT id FROM users WHERE role = 'admin' ORDER BY created_at ASC LIMIT 1`
  )
  if (res.rows.length === 0) {
    throw new Error('No se encontró un usuario administrador para la minería programada')
  }
  return res.rows[0].id
}

/**
 * Mines every data source that is due according to its mining_frequency_days.
 * A source is due when it is active, has a frequency > 0 (0 = never auto-mined), and
 * its last_mined is older than the configured interval. mining_status is deliberately
 * NOT checked: last_mined is stamped when mining starts, so a mid-run source isn't due,
 * and a crashed source becomes due again once the interval passes (self-healing).
 */
export async function mineDueDataSources(adminUserId?: string, concurrency = 5): Promise<MineDueResult> {
  const dueRes = await query<{ id: string }>(
    `SELECT ds.id
     FROM data_sources ds
     WHERE ds.active = true
       AND ds.mining_frequency_days > 0
       AND (ds.last_mined IS NULL
            OR ds.last_mined <= now() - (ds.mining_frequency_days * interval '1 day'))
     ORDER BY ds.last_mined ASC NULLS FIRST`
  )

  const dueIds = dueRes.rows.map((r: { id: string }) => r.id)
  if (dueIds.length === 0) {
    return { success: true, sourcesChecked: 0, sourcesDue: 0, sourcesCompleted: 0, sourcesFailed: 0, eventsExtracted: 0, eventsStored: 0, details: 'No hay fuentes de datos pendientes de minería' }
  }

  console.log(`[Scheduled Mining] ${dueIds.length} data source(s) due for mining`)

  const effectiveUserId = adminUserId ?? await getScheduledAdminUserId()
  const results = await mapWithConcurrency(dueIds, concurrency, id => mineDataSourceById(id, effectiveUserId))

  let sourcesCompleted = 0
  let sourcesFailed = 0
  let eventsExtracted = 0
  let eventsStored = 0

  for (const result of results) {
    if (result.status === 'completed') {
      sourcesCompleted++
      eventsExtracted += result.eventsExtracted ?? 0
      eventsStored += result.eventsStored ?? 0
    } else {
      sourcesFailed++
      console.error(`[Scheduled Mining] Failed source: ${result.error}`)
    }
  }

  console.log(`[Scheduled Mining] Completed: ${sourcesCompleted}, failed: ${sourcesFailed}, events stored: ${eventsStored}`)

  return {
    success: true,
    sourcesChecked: dueIds.length,
    sourcesDue: dueIds.length,
    sourcesCompleted,
    sourcesFailed,
    eventsExtracted,
    eventsStored,
    details: `Minería programada completada. ${sourcesCompleted} fuente(s) minadas, ${sourcesFailed} fallaron. ${eventsStored} eventos almacenados.`
  }
}

export async function mineDataSourceById(id: string, adminUserId: string): Promise<MineDataSourceResult> {
  const sourceCheck = await query<{ url: string, active: boolean, city_name: string | null }>(
    `SELECT ds.url, ds.active, c.name as city_name
     FROM data_sources ds
     LEFT JOIN cities c ON ds.city_id = c.id
     WHERE ds.id = $1`,
    [id]
  )
  if (sourceCheck.rows.length === 0) {
    return { status: 'not_found', error: 'Fuente de datos no encontrada' }
  }

  const source = sourceCheck.rows[0]
  if (!source.active) {
    return { status: 'inactive', error: 'La fuente de datos no está activa' }
  }

  // Update mining status to in_progress and stamp last_mined immediately, so a
  // source being mined right now is already "not due" and won't be double-mined.
  // Reason: last_mined is the source of truth for scheduling; mining_status is only
  // informational. If the process crashes mid-run, the source becomes due again once
  // the configured interval passes (self-healing, never permanently stuck).
  await query(
    `UPDATE data_sources SET mining_status = 'in_progress', last_mined = now() WHERE id = $1`,
    [id]
  )

  console.log(`[Mining] Starting mining process for data source ${id} with URL: ${source.url}`)

  try {
    // Fetch + clean HTML (static fetch, Puppeteer fallback for dynamic content)
    const fetchResult = await fetchHtmlContent(source.url)

    if (!fetchResult.success || !fetchResult.fullHtml) {
      console.error(`[Mining] Failed to fetch content from ${source.url}: ${fetchResult.error}`)
      await query(`UPDATE data_sources SET mining_status = 'failed' WHERE id = $1`, [id])
      console.log(`[Mining] Mining failed for data source ${id}`)
      return { status: 'failed', error: fetchResult.error || 'Error al obtener contenido' }
    }

    console.log(`[Mining] Successfully fetched content from ${source.url}`)
    console.log(`[Mining] Starting event extraction from HTML content`)

    // LLM extraction (Kilo Gateway)
    const extractionResult = await extractEventsFromHtml(fetchResult.fullHtml, source.url, source.city_name || undefined)

    if (extractionResult.success && extractionResult.events) {
      console.log(`[Mining] Successfully extracted ${extractionResult.events.length} events`)
      console.log(`[Mining] Raw JSON output:`, JSON.stringify(extractionResult.events, null, 2))

      // Validate, dedup (batch + DB exact + semantic), enrich, and insert
      const storedEvents = await processExtractedEvents(extractionResult.events, adminUserId)
      console.log(`[Mining] Successfully stored ${storedEvents.length} events in database`)

      // Update mining status to completed with timestamp and event count
      await query(
        `UPDATE data_sources SET mining_status = 'completed', last_mined = now() WHERE id = $1`,
        [id]
      )

      return {
        status: 'completed',
        extractionSuccess: true,
        eventsExtracted: extractionResult.events.length,
        eventsStored: storedEvents.length,
        eventsFailed: extractionResult.events.length - storedEvents.length
      }
    }

    console.error(`[Mining] Failed to extract events: ${extractionResult.error}`)

    // Update mining status to completed with timestamp (even if no events found)
    await query(
      `UPDATE data_sources SET mining_status = 'completed', last_mined = now() WHERE id = $1`,
      [id]
    )

    return {
      status: 'completed',
      extractionSuccess: false,
      eventsExtracted: 0,
      eventsStored: 0,
      eventsFailed: 0
    }
  } catch (error) {
    console.error('Error triggering mining:', error)

    // Try to update status to failed if we have the ID
    try {
      await query(`UPDATE data_sources SET mining_status = 'failed' WHERE id = $1`, [id])
    } catch (updateError) {
      console.error('Error updating mining status to failed:', updateError)
    }

    return { status: 'failed', error: error instanceof Error ? error.message : 'Unexpected error during mining' }
  }
}
