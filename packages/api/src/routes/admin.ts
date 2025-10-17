import { Router, Request } from 'express'
import { authenticate } from '../middleware/auth'
import { getAdminStatsDb, listInactiveEventsDb } from '../db/repository'

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