/// <reference types="jest" />
import { authenticate, requireRole } from '../src/middleware/auth'

jest.mock('@supabase/supabase-js', () => {
  const mockGetUser = jest.fn()
  const mockClient = {
    auth: {
      getUser: mockGetUser
    }
  }
  return {
    createClient: jest.fn(() => mockClient),
    __mockGetUser: mockGetUser
  }
})

type MockRes = {
  statusCode?: number
  body?: unknown
  status: (code: number) => MockRes
  json: (data: unknown) => void
}

function createRes(): MockRes {
  const res: Partial<MockRes> = {}
  res.status = (code: number) => { res.statusCode = code; return res as MockRes }
  res.json = (data: unknown) => { res.body = data }
  return res as MockRes
}

describe('auth middleware', () => {
  test('authenticate returns 401 when Authorization header is missing', async () => {
    const req: any = { headers: {} }
    const res = createRes()
    const next = jest.fn()
    await authenticate(req, res as any, next)
    expect(res.statusCode).toBe(401)
    expect((res.body as any).error).toBe('Unauthorized')
    expect(next).not.toHaveBeenCalled()
  })

  test('authenticate returns 500 when token present but SUPABASE_URL missing', async () => {
    const prevUrl = process.env.SUPABASE_URL
    const prevKey = process.env.SUPABASE_ANON_KEY
    delete process.env.SUPABASE_URL
    delete process.env.SUPABASE_ANON_KEY
    const req: any = { headers: { authorization: 'Bearer token' } }
    const res = createRes()
    const next = jest.fn()
    await authenticate(req, res as any, next)
    expect(res.statusCode).toBe(500)
    expect((res.body as any).error).toBe('Auth misconfigured')
    expect(next).not.toHaveBeenCalled()
    if (prevUrl) process.env.SUPABASE_URL = prevUrl
    if (prevKey) process.env.SUPABASE_ANON_KEY = prevKey
  })

  test('authenticate succeeds and attaches user when token is valid', async () => {
    const { __mockGetUser } = require('@supabase/supabase-js') as { __mockGetUser: jest.Mock }
    __mockGetUser.mockResolvedValueOnce({ 
      data: { 
        user: { 
          id: 'user-1', 
          email: 'u@example.com', 
          user_metadata: { role: 'organizer' }
        } 
      }, 
      error: null 
    })

    const prevUrl = process.env.SUPABASE_URL
    const prevKey = process.env.SUPABASE_ANON_KEY
    process.env.SUPABASE_URL = 'https://proj.supabase.co'
    process.env.SUPABASE_ANON_KEY = 'anon-key'
    const req: any = { headers: { authorization: 'Bearer valid' } }
    const res = createRes()
    const next = jest.fn()
    await authenticate(req, res as any, next)
    expect(next).toHaveBeenCalled()
    expect(req.user).toEqual({ id: 'user-1', email: 'u@example.com', role: 'organizer' })
    process.env.SUPABASE_URL = prevUrl
    process.env.SUPABASE_ANON_KEY = prevKey
  })

  test('authenticate returns 401 when jwt verification fails', async () => {
    const { __mockGetUser } = require('@supabase/supabase-js') as { __mockGetUser: jest.Mock }
    __mockGetUser.mockResolvedValueOnce({ data: { user: null }, error: { message: 'bad token' } })
    const prevUrl = process.env.SUPABASE_URL
    const prevKey = process.env.SUPABASE_ANON_KEY
    process.env.SUPABASE_URL = 'https://proj.supabase.co'
    process.env.SUPABASE_ANON_KEY = 'anon-key'
    const req: any = { headers: { authorization: 'Bearer invalid' } }
    const res = createRes()
    const next = jest.fn()
    await authenticate(req, res as any, next)
    expect(res.statusCode).toBe(401)
    expect((res.body as any).error).toBe('Unauthorized')
    expect(next).not.toHaveBeenCalled()
    process.env.SUPABASE_URL = prevUrl
    process.env.SUPABASE_ANON_KEY = prevKey
  })

  test('requireRole forbids when user missing', () => {
    const req: any = { user: undefined }
    const res = createRes()
    const next = jest.fn()
    requireRole('organizer')(req, res as any, next)
    expect(res.statusCode).toBe(403)
    expect((res.body as any).error).toBe('Forbidden')
    expect(next).not.toHaveBeenCalled()
  })

  test('requireRole forbids attendee for organizer route', () => {
    const req: any = { user: { id: 'u1', role: 'attendee' } }
    const res = createRes()
    const next = jest.fn()
    requireRole('organizer')(req, res as any, next)
    expect(res.statusCode).toBe(403)
    expect(next).not.toHaveBeenCalled()
  })

  test('requireRole allows organizer', () => {
    const req: any = { user: { id: 'u2', role: 'organizer' } }
    const res = createRes()
    const next = jest.fn()
    requireRole('organizer')(req, res as any, next)
    expect(next).toHaveBeenCalled()
  })

  test('requireRole allows admin', () => {
    const req: any = { user: { id: 'u3', role: 'admin' } }
    const res = createRes()
    const next = jest.fn()
    requireRole('organizer')(req, res as any, next)
    expect(next).toHaveBeenCalled()
  })

  test('requireRole(admin) forbids organizer', () => {
    const req: any = { user: { id: 'u4', role: 'organizer' } }
    const res = createRes()
    const next = jest.fn()
    requireRole('admin')(req, res as any, next)
    expect(res.statusCode).toBe(403)
    expect(next).not.toHaveBeenCalled()
  })

  test('requireRole(admin) allows admin user', () => {
    const req: any = { user: { id: 'u5', role: 'admin' } }
    const res = createRes()
    const next = jest.fn()
    requireRole('admin')(req, res as any, next)  // This should execute line 56
    expect(next).toHaveBeenCalled()
    expect(res.statusCode).toBeUndefined()
  })

  test('authenticate handles missing email in user data', async () => {
    const { __mockGetUser } = require('@supabase/supabase-js') as { __mockGetUser: jest.Mock }
    __mockGetUser.mockResolvedValueOnce({ 
      data: { 
        user: { 
          id: 'user-without-email', 
          email: null, // null email should become undefined
          user_metadata: { role: 'attendee' }
        } 
      }, 
      error: null 
    })

    const prevUrl = process.env.SUPABASE_URL
    const prevKey = process.env.SUPABASE_ANON_KEY
    process.env.SUPABASE_URL = 'https://proj.supabase.co'
    process.env.SUPABASE_ANON_KEY = 'anon-key'
    const req: any = { headers: { authorization: 'Bearer valid' } }
    const res = createRes()
    const next = jest.fn()
    await authenticate(req, res as any, next)
    
    expect(next).toHaveBeenCalled()
    expect(req.user).toEqual({ 
      id: 'user-without-email',
      email: undefined, // null email became undefined
      role: 'attendee' 
    })
    process.env.SUPABASE_URL = prevUrl
    process.env.SUPABASE_ANON_KEY = prevKey
  })

})


