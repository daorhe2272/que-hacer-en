import { Router, Request } from 'express'
import { authenticate } from '../middleware/auth'
import { query } from '../db/client'
import { addToFavoritesDb, removeFromFavoritesDb, getUserFavoritesDb, isEventFavoritedDb } from '../db/repository'
import { listQuerySchema } from '../validation'

// Type helper for authenticated requests where user.id is guaranteed to exist
interface AuthenticatedRequest extends Request {
  user: NonNullable<Request['user']> & { id: string }
}

// Type assertion helper - only use after authenticate middleware
function assertAuthenticated(req: Request): AuthenticatedRequest {
  return req as AuthenticatedRequest
}

export const usersRouter: Router = Router()

usersRouter.get('/me', authenticate, async (req, res) => {
  try {
    const authReq = assertAuthenticated(req)
    const userId = authReq.user.id
    const email = authReq.user.email
    // Ensure schema pieces exist in test or fresh DBs
    await query(`DO $$ BEGIN
       IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
         CREATE TYPE user_role AS ENUM ('attendee','organizer','admin');
       END IF;
     END $$;`)
    await query(`CREATE TABLE IF NOT EXISTS users (
       id UUID PRIMARY KEY,
       email TEXT UNIQUE,
       display_name TEXT,
       avatar_url TEXT,
       role user_role NOT NULL DEFAULT 'attendee',
       created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
       updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
     );`)
    await query(
      `INSERT INTO users (id, email)
       VALUES ($1, $2)
       ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, updated_at = now()`,
      [userId, email ?? null]
    )
    const row = await query<{ id: string, email: string | null, role: string }>(`SELECT id, email, role::text as role FROM users WHERE id = $1`, [userId])
    if (row.rows.length === 0) {
      res.status(404).json({ error: 'User not found' })
      return
    }
    res.json(row.rows[0])
  } catch (err) {
    res.status(500).json({ error: 'No se pudo recuperar el perfil' })
  }
})

// Add event to favorites
usersRouter.post('/favorites', authenticate, async (req, res) => {
  try {
    const authReq = assertAuthenticated(req)
    const userId = authReq.user.id
    const { eventId } = req.body
    
    if (!eventId || typeof eventId !== 'string') {
      res.status(400).json({ error: 'eventId es requerido' })
      return
    }

    const success = await addToFavoritesDb(userId, eventId)
    if (success) {
      res.status(201).json({ message: 'Evento agregado a favoritos' })
    } else {
      res.status(500).json({ error: 'Error al agregar a favoritos' })
    }
  } catch (err) {
    res.status(500).json({ error: 'Error al agregar a favoritos' })
  }
})

// Remove event from favorites
usersRouter.delete('/favorites/:eventId', authenticate, async (req, res) => {
  try {
    const authReq = assertAuthenticated(req)
    const userId = authReq.user.id
    const { eventId } = req.params

    const success = await removeFromFavoritesDb(userId, eventId)
    if (success) {
      res.json({ message: 'Evento removido de favoritos' })
    } else {
      res.status(404).json({ error: 'Favorito no encontrado' })
    }
  } catch (err) {
    res.status(500).json({ error: 'Error al remover de favoritos' })
  }
})

// Get user's favorite events
usersRouter.get('/favorites', authenticate, async (req, res) => {
  try {
    const authReq = assertAuthenticated(req)
    const userId = authReq.user.id

    const parseResult = listQuerySchema.safeParse(req.query)
    if (!parseResult.success) {
      res.status(400).json({ error: 'Parámetros inválidos', details: parseResult.error.flatten() })
      return
    }

    const params = parseResult.data
    const { events, total } = await getUserFavoritesDb(userId, params)
    const { page, limit } = params
    const totalPages = Math.ceil(total / limit)
    
    res.json({ 
      events, 
      pagination: { page, limit, total, totalPages } 
    })
  } catch (err) {
    res.status(500).json({ error: 'Error al cargar favoritos' })
  }
})

// Check if event is favorited
usersRouter.get('/favorites/:eventId/status', authenticate, async (req, res) => {
  try {
    const authReq = assertAuthenticated(req)
    const userId = authReq.user.id
    const { eventId } = req.params

    const isFavorited = await isEventFavoritedDb(userId, eventId)
    res.json({ isFavorited })
  } catch (err) {
    res.status(500).json({ error: 'Error al verificar favorito' })
  }
})


