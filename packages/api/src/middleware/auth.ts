import type { Request, Response, NextFunction } from 'express'
import { createClient } from '@supabase/supabase-js'

export async function authenticate(req: Request, res: Response, next: NextFunction): Promise<void> {
  // Skip authentication in test environment with special test user
  if (process.env.NODE_ENV === 'test' && req.headers.authorization === 'Bearer test-token') {
    req.user = { id: 'test-user-id', email: 'test@example.com', role: 'attendee' }
    next()
    return
  }

  try {
    const authHeader = req.headers.authorization || ''
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null
    if (!token) {
      res.status(401).json({ error: 'Unauthorized' })
      return
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    
    if (!supabaseUrl || !supabaseAnonKey) {
      res.status(500).json({ error: 'Auth misconfigured' })
      return
    }

    // Use Supabase client to verify the JWT
    const supabase = createClient(supabaseUrl, supabaseAnonKey)
    const { data: { user }, error } = await supabase.auth.getUser(token)

    if (error || !user) {
      res.status(401).json({ error: 'Unauthorized' })
      return
    }

    // Get role from user metadata or default to attendee
    const role = (user.user_metadata?.role || user.app_metadata?.role || 'attendee') as ('attendee' | 'organizer' | 'admin')

    req.user = { id: user.id, email: user.email || undefined, role }
    next()
  } catch (err) {
    res.status(401).json({ error: 'Unauthorized' })
  }
}

export function requireRole(...allowed: Array<'organizer' | 'admin'>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const role = req.user?.role
    if (!role) {
      res.status(403).json({ error: 'Forbidden' })
      return
    }
    if (allowed.includes('admin') && role === 'admin') { next(); return }
    if (allowed.includes('organizer') && (role === 'organizer' || role === 'admin')) { next(); return }
    res.status(403).json({ error: 'Forbidden' })
  }
}


