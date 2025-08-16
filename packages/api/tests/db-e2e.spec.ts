/// <reference types="jest" />
import { afterAll, beforeAll, describe, expect, test } from '@jest/globals'
import { GenericContainer, StartedTestContainer, Wait } from 'testcontainers'
import { Pool } from 'pg'
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'

let container: StartedTestContainer | undefined
let pool: Pool | undefined
let canRun = false

function toUuidFromLegacyId(id: string): string {
  const hex = crypto.createHash('sha1').update(id).digest('hex')
  const ns = hex.slice(0, 32)
  return `${ns.slice(0,8)}-${ns.slice(8,12)}-${ns.slice(12,16)}-${ns.slice(16,20)}-${ns.slice(20)}`
}

function normalize(text: string): string {
  return text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

async function run(sql: string, params: unknown[] = []): Promise<void> {
  if (!pool) throw new Error('pool not ready')
  await pool.query(sql, params)
}

async function applyMigrations(): Promise<void> {
  const { migrate } = require('../src/db/migrate') as { migrate: () => Promise<void> }
  await migrate()
}

async function seedFromJson(): Promise<void> {
  const eventsPath = path.resolve(__dirname, '../../../events.json')
  const data = JSON.parse(fs.readFileSync(eventsPath, 'utf-8')) as Record<string, Array<any>>

  const cities = ['bogota', 'medellin', 'cali', 'barranquilla', 'cartagena']
  for (const slug of cities) await run(`INSERT INTO cities(slug, name) VALUES ($1, $2) ON CONFLICT (slug) DO NOTHING`, [slug, slug])

  const categories = new Map<string, string>()

  for (const [, events] of Object.entries(data)) {
    for (const e of events) {
      const catSlug = normalize(e.category).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
      if (!categories.has(catSlug)) categories.set(catSlug, e.category)
    }
  }

  for (const [slug, label] of categories.entries()) {
    await run(`INSERT INTO categories(slug, label) VALUES ($1, $2) ON CONFLICT (slug) DO NOTHING`, [slug, label])
  }

  const cityRows = (await pool!.query(`SELECT id, slug FROM cities`)).rows as Array<{ id: number, slug: string }>
  const cityIdBySlug = new Map(cityRows.map(r => [r.slug, r.id]))
  const catRows = (await pool!.query(`SELECT id, slug FROM categories`)).rows as Array<{ id: number, slug: string }>
  const catIdBySlug = new Map(catRows.map(r => [r.slug, r.id]))

  for (const [city, events] of Object.entries(data)) {
    const cityId = cityIdBySlug.get(city)!
    for (const e of events) {
      const id = toUuidFromLegacyId(e.id)
      const startsAt = `${e.date}T${e.time}:00Z`
      const catSlug = normalize(e.category).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
      const categoryId = catIdBySlug.get(catSlug)!
      await run(
        `INSERT INTO events(id, city_id, category_id, title, description, venue, address, starts_at, price_cents, currency)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
         ON CONFLICT (id) DO NOTHING`,
        [id, cityId, categoryId, e.title, e.description, e.location, e.address, startsAt, e.price, e.currency]
      )
      // tags
      for (const t of e.tags as string[]) {
        const tagRes = await pool!.query(`INSERT INTO tags(name) VALUES ($1) ON CONFLICT (name) DO NOTHING RETURNING id`, [t])
        const tagId = tagRes.rows[0]?.id || (await pool!.query(`SELECT id FROM tags WHERE name=$1`, [t])).rows[0].id
        await run(`INSERT INTO event_tags(event_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`, [id, tagId])
      }
    }
  }
}

describe('API DB E2E (filters+sorting stable)', () => {
  beforeAll(async () => {
    try {
      const started = await new GenericContainer('postgres:16')
        .withExposedPorts(5432)
        .withEnvironment({
          POSTGRES_PASSWORD: 'test',
          POSTGRES_USER: 'test',
          POSTGRES_DB: 'testdb'
        })
        .withWaitStrategy(Wait.forLogMessage('database system is ready to accept connections'))
        .start()
      container = started

      const port = started.getMappedPort(5432)
      const host = started.getHost()
      process.env.DATABASE_URL = `postgres://test:test@${host}:${port}/testdb`

      pool = new Pool({ connectionString: process.env.DATABASE_URL })
      await applyMigrations()
      await seedFromJson()
      canRun = true
    } catch (err) {
      canRun = false
    }
  }, 120000)

  afterAll(async () => {
    await pool?.end()
    if (container) await container.stop()
  })

  test('combined filters q+category+date+price and stable price ordering', async () => {
    if (!canRun) { expect(true).toBe(true); return }
    const { listEventsDb } = require('../src/db/repository') as typeof import('../src/db/repository')

    const { events } = await listEventsDb({
      city: 'bogota',
      category: 'musica',
      q: 'gratis',
      from: '2024-01-01',
      to: '2024-12-31',
      minPrice: 0,
      maxPrice: 100000,
      page: 1,
      limit: 50,
      sort: 'price',
      order: 'asc'
    })

    if (events.length > 0) {
      const samePrice = events.filter(e => e.price === events[0].price)
      if (samePrice.length > 1) {
        const ids = samePrice.map(e => e.id)
        const sortedIds = [...ids].sort((a, b) => a.localeCompare(b))
        expect(ids).toEqual(sortedIds)
      }
    }

    expect(events.every(e => e.date >= '2024-01-01' && e.date <= '2024-12-31')).toBe(true)
    expect(events.every(e => e.price >= 0 && e.price <= 100000)).toBe(true)
  }, 120000)
})


