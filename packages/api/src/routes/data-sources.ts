import { Router } from 'express'
import { authenticate, requireRole } from '../middleware/auth'
import { query } from '../db/client'
import { fetchHtmlContent } from '../utils/html-fetcher'
import { extractEventsFromHtml } from '../utils/event-extractor'
import { processExtractedEvents } from '../utils/event-processor'

const router: Router = Router()

// Apply authentication and admin middleware to all routes
router.use(authenticate)
router.use(requireRole('admin'))

// Types for data sources
export interface DataSource {
  id: string
  url: string
  city_id: number | null
  city_name?: string
  city_slug?: string
  source_type: 'regular' | 'occasional'
  last_mined: string | null
  mining_status: 'pending' | 'in_progress' | 'completed' | 'failed'
  active: boolean
  created_at: string
  updated_at: string
  created_by: string
}

export interface CreateDataSourceRequest {
  url: string
  city_slug?: string
  source_type: 'regular' | 'occasional'
}

export interface UpdateDataSourceRequest {
  url?: string
  city_slug?: string
  source_type?: 'regular' | 'occasional'
  active?: boolean
}

// GET /api/data-sources - List all data sources with optional filtering
router.get('/', async (req, res) => {
  try {
    const { city, source_type, active, page = 1, limit = 50 } = req.query

    const where: string[] = []
    const args: unknown[] = []
    let i = 1

    if (city) {
      where.push(`c.slug = $${i++}`)
      args.push(city)
    }
    if (source_type) {
      where.push(`ds.source_type = $${i++}`)
      args.push(source_type)
    }
    if (active !== undefined) {
      where.push(`ds.active = $${i++}`)
      args.push(active === 'true')
    }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : ''

    const offset = (Number(page) - 1) * Number(limit)

    // Get total count
    const countRes = await query<{ count: string }>(
      `SELECT COUNT(*)::text AS count
       FROM data_sources ds
       LEFT JOIN cities c ON ds.city_id = c.id
       ${whereSql}`,
      args
    )
    const total = Number(countRes.rows[0]?.count || '0')

    // Get data sources with city names
    const rows = await query<{
      id: string
      url: string
      city_id: number | null
      city_name: string | null
      city_slug: string | null
      source_type: string
      last_mined: string | null
      mining_status: string
      active: boolean
      created_at: string
      updated_at: string
      created_by: string
    }>(
      `SELECT ds.id, ds.url, ds.city_id, c.name as city_name, c.slug as city_slug, ds.source_type,
              ds.last_mined, ds.mining_status, ds.active, ds.created_at, ds.updated_at, ds.created_by
       FROM data_sources ds
       LEFT JOIN cities c ON ds.city_id = c.id
       ${whereSql}
       ORDER BY ds.created_at DESC
       LIMIT ${limit} OFFSET ${offset}`,
      args
    )

    const dataSources: DataSource[] = rows.rows.map(r => ({
      id: r.id,
      url: r.url,
      city_id: r.city_id,
      city_name: r.city_name || undefined,
      city_slug: r.city_slug || undefined,
      source_type: r.source_type as 'regular' | 'occasional',
      last_mined: r.last_mined,
      mining_status: r.mining_status as 'pending' | 'in_progress' | 'completed' | 'failed',
      active: r.active,
      created_at: r.created_at,
      updated_at: r.updated_at,
      created_by: r.created_by
    }))

    res.json({
      data_sources: dataSources,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit))
      }
    })
  } catch (error) {
    console.error('Error fetching data sources:', error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
})

// POST /api/data-sources - Create new data source
router.post('/', async (req, res) => {
  try {
    const { url, city_slug, source_type }: CreateDataSourceRequest = req.body
    const userId = req.user?.id

    if (!url || !source_type) {
      return res.status(400).json({ error: 'URL y tipo de fuente son requeridos' })
    }

    if (!['regular', 'occasional'].includes(source_type)) {
      return res.status(400).json({ error: 'Tipo de fuente debe ser "regular" o "occasional"' })
    }

    // Validate URL format
    try {
      new URL(url)
    } catch {
      return res.status(400).json({ error: 'URL inválida' })
    }

    let cityId: number | null = null
    if (city_slug) {
      const cityRes = await query<{ id: number }>(`SELECT id FROM cities WHERE slug = $1`, [city_slug])
      if (cityRes.rows.length === 0) {
        return res.status(400).json({ error: 'Ciudad no encontrada' })
      }
      cityId = cityRes.rows[0].id
    } else if (source_type === 'regular') {
      return res.status(400).json({ error: 'Las fuentes regulares requieren una ciudad' })
    }

    // Check for duplicate
    const duplicateCheck = await query(
      `SELECT id FROM data_sources WHERE url = $1 AND city_id IS NOT DISTINCT FROM $2 AND source_type = $3`,
      [url, cityId, source_type]
    )
    if (duplicateCheck.rows.length > 0) {
      return res.status(409).json({ error: 'Esta fuente ya existe' })
    }

    const result = await query<{
      id: string
      url: string
      city_id: number | null
      city_name: string | null
      source_type: string
      last_mined: string | null
      mining_status: string
      active: boolean
      created_at: string
      updated_at: string
      created_by: string
    }>(
      `INSERT INTO data_sources (url, city_id, source_type, created_by)
       VALUES ($1, $2, $3, $4)
       RETURNING id, url, city_id, source_type, last_mined, mining_status, active, created_at, updated_at, created_by`,
      [url, cityId, source_type, userId]
    )

    const row = result.rows[0]
    if (!row) {
      return res.status(500).json({ error: 'Error al crear la fuente de datos' })
    }

    // Get city name if applicable
    let city_name: string | null = null
    if (row.city_id) {
      const cityRes = await query<{ name: string }>(`SELECT name FROM cities WHERE id = $1`, [row.city_id])
      city_name = cityRes.rows[0]?.name || null
    }

    const dataSource: DataSource = {
      id: row.id,
      url: row.url,
      city_id: row.city_id,
      city_name: city_name || undefined,
      source_type: row.source_type as 'regular' | 'occasional',
      last_mined: row.last_mined,
      mining_status: row.mining_status as 'pending' | 'in_progress' | 'completed' | 'failed',
      active: row.active,
      created_at: row.created_at,
      updated_at: row.updated_at,
      created_by: row.created_by
    }

    return res.status(201).json(dataSource)
  } catch (error) {
   console.error('Error creating data source:', error)
   return res.status(500).json({ error: 'Error interno del servidor' })
 }
})

// PUT /api/data-sources/:id - Update data source
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const { url, city_slug, source_type, active }: UpdateDataSourceRequest = req.body

    if (!id) {
      return res.status(400).json({ error: 'ID de fuente requerido' })
    }

    // Check if data source exists and user has permission
    const existingCheck = await query<{ created_by: string }>(
      `SELECT created_by FROM data_sources WHERE id = $1`,
      [id]
    )
    if (existingCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Fuente de datos no encontrada' })
    }

    const updates: string[] = []
    const values: unknown[] = []
    let paramIndex = 1

    if (url !== undefined) {
      // Validate URL format
      try {
        new URL(url)
      } catch {
        return res.status(400).json({ error: 'URL inválida' })
      }
      updates.push(`url = $${paramIndex++}`)
      values.push(url)
    }

    if (city_slug !== undefined) {
      const cityRes = await query<{ id: number }>(`SELECT id FROM cities WHERE slug = $1`, [city_slug])
      if (cityRes.rows.length === 0) {
        return res.status(400).json({ error: 'Ciudad no encontrada' })
      }
      updates.push(`city_id = $${paramIndex++}`)
      values.push(cityRes.rows[0].id)
    }

    if (source_type !== undefined) {
      if (!['regular', 'occasional'].includes(source_type)) {
        return res.status(400).json({ error: 'Tipo de fuente debe ser "regular" o "occasional"' })
      }
      updates.push(`source_type = $${paramIndex++}`)
      values.push(source_type)
    }

    if (active !== undefined) {
      updates.push(`active = $${paramIndex++}`)
      values.push(active)
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No se proporcionaron campos para actualizar' })
    }

    values.push(id)
    const result = await query(
      `UPDATE data_sources SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    )

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Fuente de datos no encontrada' })
    }

    const row = result.rows[0]

    // Get city name if applicable
    let city_name: string | null = null
    if (row.city_id) {
      const cityRes = await query<{ name: string }>(`SELECT name FROM cities WHERE id = $1`, [row.city_id])
      city_name = cityRes.rows[0]?.name || null
    }

    const dataSource: DataSource = {
      id: row.id,
      url: row.url,
      city_id: row.city_id,
      city_name: city_name || undefined,
      source_type: row.source_type,
      last_mined: row.last_mined,
      mining_status: row.mining_status,
      active: row.active,
      created_at: row.created_at,
      updated_at: row.updated_at,
      created_by: row.created_by
    }

    return res.json(dataSource)
  } catch (error) {
   console.error('Error updating data source:', error)
   return res.status(500).json({ error: 'Error interno del servidor' })
 }
})

// DELETE /api/data-sources/:id - Delete data source
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params

    if (!id) {
      return res.status(400).json({ error: 'ID de fuente requerido' })
    }

    const result = await query(`DELETE FROM data_sources WHERE id = $1`, [id])

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Fuente de datos no encontrada' })
    }

    return res.json({ message: 'Fuente de datos eliminada exitosamente' })
  } catch (error) {
   console.error('Error deleting data source:', error)
   return res.status(500).json({ error: 'Error interno del servidor' })
 }
})

// POST /api/data-sources/:id/mine - Trigger mining for specific data source
router.post('/:id/mine', async (req, res) => {
  try {
    const { id } = req.params

    if (!id) {
      return res.status(400).json({ error: 'ID de fuente requerido' })
    }

    // Check if data source exists and is active
    const sourceCheck = await query<{ url: string, active: boolean }>(
      `SELECT url, active FROM data_sources WHERE id = $1`,
      [id]
    )
    if (sourceCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Fuente de datos no encontrada' })
    }

    const source = sourceCheck.rows[0]
    if (!source.active) {
      return res.status(400).json({ error: 'La fuente de datos no está activa' })
    }

    // Update mining status to in_progress
    await query(
      `UPDATE data_sources SET mining_status = 'in_progress' WHERE id = $1`,
      [id]
    )

    console.log(`[Mining] Starting mining process for data source ${id} with URL: ${source.url}`)

    // Fetch HTML content from the URL
    const fetchResult = await fetchHtmlContent(source.url)

    if (fetchResult.success) {
      console.log(`[Mining] Successfully fetched content from ${source.url}`)

      // Extract events from the HTML content using Gemini
      if (fetchResult.fullHtml) {
        console.log(`[Mining] Starting event extraction from HTML content`)
        const extractionResult = await extractEventsFromHtml(fetchResult.fullHtml, source.url)

        if (extractionResult.success && extractionResult.events) {
          console.log(`[Mining] Successfully extracted ${extractionResult.events.length} events`)
          console.log(`[Mining] Raw JSON output:`, JSON.stringify(extractionResult.events, null, 2))

          // Process and store events in database
          const storedEvents = await processExtractedEvents(extractionResult.events, req.user!.id)
          console.log(`[Mining] Successfully stored ${storedEvents.length} events in database`)

          // Update mining status to completed with timestamp and event count
          await query(
            `UPDATE data_sources SET mining_status = 'completed', last_mined = now() WHERE id = $1`,
            [id]
          )

          return res.json({
            message: 'Minería completada exitosamente',
            data_source_id: id,
            success: true,
            events_extracted: extractionResult.events.length,
            events_stored: storedEvents.length,
            events_failed: extractionResult.events.length - storedEvents.length
          })
        } else {
          console.error(`[Mining] Failed to extract events: ${extractionResult.error}`)

          // Update mining status to completed with timestamp (even if no events found)
          await query(
            `UPDATE data_sources SET mining_status = 'completed', last_mined = now() WHERE id = $1`,
            [id]
          )

          return res.json({
            message: 'Minería completada - no se encontraron eventos',
            data_source_id: id,
            success: true,
            events_extracted: 0,
            events_stored: 0,
            events_failed: 0
          })
        }
      }

      console.log(`[Mining] Mining completed successfully for data source ${id}`)
      return res.status(500).json({ error: 'Error interno del servidor' })
    } else {
      console.error(`[Mining] Failed to fetch content from ${source.url}: ${fetchResult.error}`)

      // Update mining status to failed
      await query(
        `UPDATE data_sources SET mining_status = 'failed' WHERE id = $1`,
        [id]
      )

      console.log(`[Mining] Mining failed for data source ${id}`)
      return res.status(500).json({ error: 'Error interno del servidor' })
    }

  } catch (error) {
   console.error('Error triggering mining:', error)

   // Try to update status to failed if we have the ID
   try {
     const { id } = req.params
     if (id) {
       await query(
         `UPDATE data_sources SET mining_status = 'failed' WHERE id = $1`,
         [id]
       )
     }
   } catch (updateError) {
     console.error('Error updating mining status to failed:', updateError)
   }

   return res.status(500).json({ error: 'Error interno del servidor' })
  }
})

export default router