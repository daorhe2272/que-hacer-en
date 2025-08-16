import { Router } from 'express'
import { authenticate } from '../middleware/auth'
import { query } from '../db/client'

export const usersRouter = Router()

usersRouter.get('/me', authenticate, async (req, res) => {
  try {
    const userId = req.user?.id
    const email = req.user?.email
    if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return }
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


