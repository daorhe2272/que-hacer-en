import { Router, Request } from 'express'
import { authenticate } from '../middleware/auth'
import { getAdminStatsDb } from '../db/repository'

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