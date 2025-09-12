import { jest } from '@jest/globals'
import { authenticate, requireRole } from '../src/middleware/auth'
import { mockRequest, mockResponse, mockNext } from './test-helpers/mock-database'

// Mock Supabase client
const mockGetUser = jest.fn() as jest.MockedFunction<any>
const mockSupabaseClient = {
  auth: {
    getUser: mockGetUser
  }
}

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => mockSupabaseClient)
}))

describe('Authentication Middleware', () => {
  let req: ReturnType<typeof mockRequest>
  let res: ReturnType<typeof mockResponse>
  let next: ReturnType<typeof mockNext>

  beforeEach(() => {
    req = mockRequest()
    res = mockResponse()
    next = mockNext()
    jest.clearAllMocks()
  })

  describe('authenticate', () => {
    it('should allow test token in test environment', async () => {
      process.env.NODE_ENV = 'test'
      req.headers = { authorization: 'Bearer test-token' }

      await authenticate(req, res, next)

      expect(req.user).toEqual({
        id: 'test-user-id',
        email: 'test@example.com',
        role: 'attendee'
      })
      expect(next).toHaveBeenCalled()
      expect(res.status).not.toHaveBeenCalled()
    })

    it('should reject request with no authorization header', async () => {
      process.env.NODE_ENV = 'production'
      req.headers = {}

      await authenticate(req, res, next)

      expect(res.status).toHaveBeenCalledWith(401)
      expect(res.json).toHaveBeenCalledWith({ error: 'Unauthorized' })
      expect(next).not.toHaveBeenCalled()
    })

    it('should reject request with malformed authorization header', async () => {
      process.env.NODE_ENV = 'production'
      req.headers = { authorization: 'InvalidToken' }

      await authenticate(req, res, next)

      expect(res.status).toHaveBeenCalledWith(401)
      expect(res.json).toHaveBeenCalledWith({ error: 'Unauthorized' })
      expect(next).not.toHaveBeenCalled()
    })

    it('should return error when Supabase config is missing', async () => {
      process.env.NODE_ENV = 'production'
      req.headers = { authorization: 'Bearer valid-token' }
      delete process.env.NEXT_PUBLIC_SUPABASE_URL
      delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

      await authenticate(req, res, next)

      expect(res.status).toHaveBeenCalledWith(500)
      expect(res.json).toHaveBeenCalledWith({ error: 'Auth misconfigured' })
      expect(next).not.toHaveBeenCalled()
    })

    it('should authenticate valid token successfully', async () => {
      process.env.NODE_ENV = 'production'
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'
      
      req.headers = { authorization: 'Bearer valid-token' }

      mockGetUser.mockResolvedValue({
        data: {
          user: {
            id: 'user-123',
            email: 'user@example.com',
            user_metadata: { role: 'organizer' }
          }
        },
        error: null
      })

      await authenticate(req, res, next)

      expect(req.user).toEqual({
        id: 'user-123',
        email: 'user@example.com',
        role: 'organizer'
      })
      expect(next).toHaveBeenCalled()
      expect(res.status).not.toHaveBeenCalled()
    })

    it('should use default role when user has no role metadata', async () => {
      process.env.NODE_ENV = 'production'
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'
      
      req.headers = { authorization: 'Bearer valid-token' }

      mockGetUser.mockResolvedValue({
        data: {
          user: {
            id: 'user-123',
            email: 'user@example.com',
            user_metadata: {},
            app_metadata: {}
          }
        },
        error: null
      })

      await authenticate(req, res, next)

      expect(req.user).toEqual({
        id: 'user-123',
        email: 'user@example.com',
        role: 'attendee'
      })
      expect(next).toHaveBeenCalled()
    })

    it('should use app_metadata role when user_metadata role is not available', async () => {
      process.env.NODE_ENV = 'production'
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'
      
      req.headers = { authorization: 'Bearer valid-token' }

      mockGetUser.mockResolvedValue({
            data: {
              user: {
                id: 'user-123',
                email: 'user@example.com',
                user_metadata: {},
                app_metadata: { role: 'admin' }
              }
            },
            error: null
      })

      await authenticate(req, res, next)

      expect(req.user).toEqual({
        id: 'user-123',
        email: 'user@example.com',
        role: 'admin'
      })
      expect(next).toHaveBeenCalled()
    })

    it('should reject request when Supabase returns error', async () => {
      process.env.NODE_ENV = 'production'
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'
      
      req.headers = { authorization: 'Bearer invalid-token' }

      mockGetUser.mockResolvedValue({
            data: { user: null },
            error: { message: 'Invalid token' }
      })

      await authenticate(req, res, next)

      expect(res.status).toHaveBeenCalledWith(401)
      expect(res.json).toHaveBeenCalledWith({ error: 'Unauthorized' })
      expect(next).not.toHaveBeenCalled()
    })

    it('should reject request when Supabase returns no user', async () => {
      process.env.NODE_ENV = 'production'
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'
      
      req.headers = { authorization: 'Bearer expired-token' }

      mockGetUser.mockResolvedValue({
            data: { user: null },
            error: null
      })

      await authenticate(req, res, next)

      expect(res.status).toHaveBeenCalledWith(401)
      expect(res.json).toHaveBeenCalledWith({ error: 'Unauthorized' })
      expect(next).not.toHaveBeenCalled()
    })

    it('should handle Supabase client throwing exception', async () => {
      process.env.NODE_ENV = 'production'
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'
      
      req.headers = { authorization: 'Bearer valid-token' }

      mockGetUser.mockRejectedValue(new Error('Network error'))

      await authenticate(req, res, next)

      expect(res.status).toHaveBeenCalledWith(401)
      expect(res.json).toHaveBeenCalledWith({ error: 'Unauthorized' })
      expect(next).not.toHaveBeenCalled()
    })

    it('should handle user without email', async () => {
      process.env.NODE_ENV = 'production'
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'
      
      req.headers = { authorization: 'Bearer valid-token' }

      mockGetUser.mockResolvedValue({
            data: {
              user: {
                id: 'user-123',
                email: null,
                user_metadata: { role: 'attendee' }
              }
            },
            error: null
      })

      await authenticate(req, res, next)

      expect(req.user).toEqual({
        id: 'user-123',
        email: undefined,
        role: 'attendee'
      })
      expect(next).toHaveBeenCalled()
    })
  })

  describe('requireRole', () => {
    it('should allow access for organizer when organizer role is required', () => {
      req.user = { id: 'user-123', email: 'user@test.com', role: 'organizer' }
      const middleware = requireRole('organizer')

      middleware(req, res, next)

      expect(next).toHaveBeenCalled()
      expect(res.status).not.toHaveBeenCalled()
    })

    it('should allow access for admin when organizer role is required', () => {
      req.user = { id: 'user-123', email: 'user@test.com', role: 'admin' }
      const middleware = requireRole('organizer')

      middleware(req, res, next)

      expect(next).toHaveBeenCalled()
      expect(res.status).not.toHaveBeenCalled()
    })

    it('should allow access for admin when admin role is required', () => {
      req.user = { id: 'user-123', email: 'user@test.com', role: 'admin' }
      const middleware = requireRole('admin')

      middleware(req, res, next)

      expect(next).toHaveBeenCalled()
      expect(res.status).not.toHaveBeenCalled()
    })

    it('should deny access for attendee when organizer role is required', () => {
      req.user = { id: 'user-123', email: 'user@test.com', role: 'attendee' }
      const middleware = requireRole('organizer')

      middleware(req, res, next)

      expect(res.status).toHaveBeenCalledWith(403)
      expect(res.json).toHaveBeenCalledWith({ error: 'Forbidden' })
      expect(next).not.toHaveBeenCalled()
    })

    it('should deny access for organizer when admin role is required', () => {
      req.user = { id: 'user-123', email: 'user@test.com', role: 'organizer' }
      const middleware = requireRole('admin')

      middleware(req, res, next)

      expect(res.status).toHaveBeenCalledWith(403)
      expect(res.json).toHaveBeenCalledWith({ error: 'Forbidden' })
      expect(next).not.toHaveBeenCalled()
    })

    it('should deny access when user has no role', () => {
      req.user = { id: 'user-123', email: 'user@test.com' }
      const middleware = requireRole('organizer')

      middleware(req, res, next)

      expect(res.status).toHaveBeenCalledWith(403)
      expect(res.json).toHaveBeenCalledWith({ error: 'Forbidden' })
      expect(next).not.toHaveBeenCalled()
    })

    it('should deny access when user is not authenticated', () => {
      req.user = undefined
      const middleware = requireRole('organizer')

      middleware(req, res, next)

      expect(res.status).toHaveBeenCalledWith(403)
      expect(res.json).toHaveBeenCalledWith({ error: 'Forbidden' })
      expect(next).not.toHaveBeenCalled()
    })

    it('should handle multiple allowed roles', () => {
      req.user = { id: 'user-123', email: 'user@test.com', role: 'organizer' }
      const middleware = requireRole('organizer', 'admin')

      middleware(req, res, next)

      expect(next).toHaveBeenCalled()
      expect(res.status).not.toHaveBeenCalled()
    })

    it('should handle multiple allowed roles with admin', () => {
      req.user = { id: 'user-123', email: 'user@test.com', role: 'admin' }
      const middleware = requireRole('organizer', 'admin')

      middleware(req, res, next)

      expect(next).toHaveBeenCalled()
      expect(res.status).not.toHaveBeenCalled()
    })

    it('should deny access when user role is not in allowed roles', () => {
      req.user = { id: 'user-123', email: 'user@test.com', role: 'attendee' }
      const middleware = requireRole('organizer', 'admin')

      middleware(req, res, next)

      expect(res.status).toHaveBeenCalledWith(403)
      expect(res.json).toHaveBeenCalledWith({ error: 'Forbidden' })
      expect(next).not.toHaveBeenCalled()
    })
  })
})