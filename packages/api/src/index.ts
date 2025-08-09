import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import dotenv from 'dotenv'
import { router as eventsRouter } from './routes/events'
import rateLimit from 'express-rate-limit'
import type { RequestHandler } from 'express'
import crypto from 'crypto'

dotenv.config()

import type { Express, Request, Response, NextFunction } from 'express'
const app: Express = express()

app.use(helmet())
app.use(cors({
  origin: (origin, callback) => {
    const allowed = (process.env.CORS_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean)
    if (!origin || allowed.length === 0 || allowed.includes(origin)) callback(null, true)
    else callback(new Error('Not allowed by CORS'))
  }
}))
app.use(express.json())
app.use(morgan('dev'))

// Correlation ID
const correlationIdMiddleware: RequestHandler = (req, res, next) => {
  const incoming = req.headers['x-correlation-id']
  const id = typeof incoming === 'string' && incoming.length > 0 ? incoming : crypto.randomUUID()
  req.correlationId = id
  res.setHeader('x-correlation-id', id)
  next()
}
app.use(correlationIdMiddleware)

// Rate limiting
const limiter = rateLimit({ windowMs: 60_000, max: 100, standardHeaders: true, legacyHeaders: false })
app.use('/api/', limiter)

// Health check
app.get('/api/health', (_req: Request, res: Response) => res.json({ status: 'ok' }))

// Events routes
app.use('/api/events', eventsRouter)

// 404 handler
app.use((_req, res) => res.status(404).json({ error: 'Not Found' }))

// Global error handler
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof Error && err.message === 'Not allowed by CORS') {
    res.status(403).json({ error: 'CORS no permitido' })
    return
  }
  console.error(err)
  res.status(500).json({ error: 'Error interno del servidor' })
})

const PORT = process.env.PORT ? Number(process.env.PORT) : 4001

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`API escuchando en http://localhost:${PORT}`)
  })
}

export default app

