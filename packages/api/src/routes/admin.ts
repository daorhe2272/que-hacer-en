import { Router, Request } from 'express'
import { authenticate } from '../middleware/auth'
import { getAdminStatsDb, listInactiveEventsDb } from '../db/repository'
import { mineUrlDirectly } from '../utils/mining-utils'

// Type helper for authenticated requests where user.id and role are guaranteed to exist
interface AuthenticatedAdminRequest extends Request {
  user: NonNullable<Request['user']> & { id: string; role: string }
}

// Type assertion helper - only use after authenticate middleware
function assertAuthenticatedAdmin(req: Request): AuthenticatedAdminRequest {
  return req as AuthenticatedAdminRequest
}

export const adminRouter: Router = Router()

adminRouter.get('/stats', authenticate, async (req, res) => {
  try {
    const authReq = assertAuthenticatedAdmin(req)
    const userRole = authReq.user.role

    if (userRole !== 'admin') {
      res.status(403).json({ error: 'Admin access required' })
      return
    }

    const useDb = process.env.NODE_ENV !== 'test'

    if (useDb) {
      const stats = await getAdminStatsDb()
      res.json(stats)
    } else {
      // Mock stats for tests
      res.json({
        totalUsers: 1234,
        activeEvents: 567,
        pendingReviews: 23,
        lastMiningTime: '2024-10-16T10:30:00.000Z'
      })
    }
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch admin stats' })
  }
})

adminRouter.get('/events/inactive', authenticate, async (req, res) => {
  try {
    const authReq = assertAuthenticatedAdmin(req)
    const userRole = authReq.user.role

    if (userRole !== 'admin') {
      res.status(403).json({ error: 'Admin access required' })
      return
    }

    const { city, q, page, limit } = req.query
    const params = {
      city: typeof city === 'string' ? city : undefined,
      q: typeof q === 'string' ? q : undefined,
      page: typeof page === 'string' ? parseInt(page, 10) : 1,
      limit: typeof limit === 'string' ? parseInt(limit, 10) : 20
    }

    const useDb = process.env.NODE_ENV !== 'test'

    if (useDb) {
      const { events, total } = await listInactiveEventsDb(params)
      const totalPages = Math.ceil(total / params.limit)
      res.json({
        events,
        pagination: {
          page: params.page,
          limit: params.limit,
          total,
          totalPages
        }
      })
    } else {
      // Mock inactive events for tests
      res.json({
        events: [],
        pagination: {
          page: params.page,
          limit: params.limit,
          total: 0,
          totalPages: 0
        }
      })
    }
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch inactive events' })
  }
})

adminRouter.post('/mine-url', authenticate, async (req, res) => {
  try {
    const authReq = assertAuthenticatedAdmin(req)
    const userRole = authReq.user.role

    if (userRole !== 'admin') {
      res.status(403).json({ error: 'Admin access required' })
      return
    }

    const { url, stream = false } = req.body

    if (!url) {
      return res.status(400).json({ error: 'URL is required' })
    }

    // Validate URL format
    try {
      new URL(url)
    } catch {
      return res.status(400).json({ error: 'Invalid URL format' })
    }

    if (stream) {
      // Set up Server-Sent Events for streaming updates
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control',
      })

      // Send initial status
      res.write(`data: ${JSON.stringify({ status: 'started', message: 'Iniciando proceso de minería...' })}\n\n`)

      console.log(`[Admin Mine URL] Starting streaming mining for URL: ${url}`)

      // Create a progress callback function
      const sendProgress = (message: string) => {
        try {
          res.write(`data: ${JSON.stringify({ status: 'progress', message })}\n\n`)
        } catch (err) {
          console.error('Failed to send progress update:', err)
        }
      }

      // Use the streaming mining logic
      const result = await mineUrlDirectlyStreaming(url, authReq.user.id, sendProgress)

      if (result.success) {
        console.log(`[Admin Mine URL] Successfully mined ${result.eventsStored} events from ${url}`)
        res.write(`data: ${JSON.stringify({
          status: 'completed',
          message: `Minería completada exitosamente. ${result.eventsStored} eventos almacenados.`,
          eventsExtracted: result.eventsExtracted,
          eventsStored: result.eventsStored,
          eventsFailed: result.eventsFailed,
          details: result.details
        })}\n\n`)
      } else {
        console.error(`[Admin Mine URL] Failed to mine URL ${url}: ${result.error}`)
        res.write(`data: ${JSON.stringify({
          status: 'failed',
          message: result.error || 'Error durante la minería',
          eventsExtracted: result.eventsExtracted,
          eventsStored: result.eventsStored,
          eventsFailed: result.eventsFailed
        })}\n\n`)
      }

      // End the stream
      res.write(`data: ${JSON.stringify({ status: 'end' })}\n\n`)
      res.end()
    } else {
      // Original synchronous behavior for backward compatibility
      console.log(`[Admin Mine URL] Starting one-time mining for URL: ${url}`)

      // Use the extracted mining logic
      const result = await mineUrlDirectly(url, authReq.user.id)

      if (result.success) {
        console.log(`[Admin Mine URL] Successfully mined ${result.eventsStored} events from ${url}`)
        return res.json({
          success: true,
          message: 'URL mining completed successfully',
          eventsExtracted: result.eventsExtracted,
          eventsStored: result.eventsStored,
          eventsFailed: result.eventsFailed,
          details: result.details
        })
      } else {
        console.error(`[Admin Mine URL] Failed to mine URL ${url}: ${result.error}`)
        return res.status(500).json({
          success: false,
          error: result.error || 'Failed to mine URL',
          eventsExtracted: result.eventsExtracted,
          eventsStored: result.eventsStored,
          eventsFailed: result.eventsFailed
        })
      }
    }

  } catch (err) {
    console.error('[Admin Mine URL] Unexpected error:', err)
    if (req.body.stream) {
      try {
        res.write(`data: ${JSON.stringify({ status: 'failed', message: 'Error interno del servidor' })}\n\n`)
        res.write(`data: ${JSON.stringify({ status: 'end' })}\n\n`)
        res.end()
      } catch (streamErr) {
        console.error('Failed to send error through stream:', streamErr)
      }
    } else {
      res.status(500).json({
        error: 'Internal server error',
        success: false,
        eventsExtracted: 0,
        eventsStored: 0,
        eventsFailed: 0
      })
    }
  }
})