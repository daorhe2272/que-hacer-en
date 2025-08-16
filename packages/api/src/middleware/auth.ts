import type { Request, Response, NextFunction } from 'express'
import { createRemoteJWKSet, jwtVerify } from 'jose'

function getSupabaseJwksUrl(): string | null {
  const url = process.env.SUPABASE_URL
  if (!url) return null
  return `${url}/auth/v1/keys`
}

export async function authenticate(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authHeader = req.headers.authorization || ''
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null
    if (!token) {
      res.status(401).json({ error: 'Unauthorized' })
      return
    }

    const jwksUrl = getSupabaseJwksUrl()
    if (!jwksUrl) {
      res.status(500).json({ error: 'Auth misconfigured' })
      return
    }

    const JWKS = createRemoteJWKSet(new URL(jwksUrl))
    const { payload } = await jwtVerify(token, JWKS, {
      issuer: undefined,
      audience: undefined
    })

    const sub = typeof payload.sub === 'string' ? payload.sub : undefined
    const email = typeof payload.email === 'string' ? payload.email : undefined
    const role = (payload.user_role as string | undefined) as ('attendee' | 'organizer' | 'admin' | undefined)

    req.user = { id: sub ?? 'unknown', email, role }
    next()
  } catch (_err) {
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


