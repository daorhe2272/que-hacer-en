import { query } from './client'

function getStatements(): string[] {
  return [
    `CREATE EXTENSION IF NOT EXISTS unaccent;`,
    `CREATE EXTENSION IF NOT EXISTS pg_trgm;`,
    `CREATE TABLE IF NOT EXISTS cities (
      id SERIAL PRIMARY KEY,
      slug TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL
    );`,
    `CREATE TABLE IF NOT EXISTS categories (
      id SERIAL PRIMARY KEY,
      slug TEXT UNIQUE NOT NULL,
      label TEXT NOT NULL
    );`,
    `CREATE TABLE IF NOT EXISTS events (
      id UUID PRIMARY KEY,
      city_id INT NOT NULL REFERENCES cities(id),
      category_id INT NOT NULL REFERENCES categories(id),
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      venue TEXT,
      address TEXT,
      starts_at TIMESTAMPTZ NOT NULL,
      ends_at TIMESTAMPTZ,
      price_cents INT NOT NULL,
      currency CHAR(3) NOT NULL DEFAULT 'COP',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );`,
    `CREATE TABLE IF NOT EXISTS tags (
      id SERIAL PRIMARY KEY,
      name TEXT UNIQUE NOT NULL
    );`,
    `CREATE TABLE IF NOT EXISTS event_tags (
      event_id UUID REFERENCES events(id) ON DELETE CASCADE,
      tag_id INT REFERENCES tags(id) ON DELETE CASCADE,
      PRIMARY KEY (event_id, tag_id)
    );`,
    `CREATE INDEX IF NOT EXISTS idx_events_city ON events(city_id);`,
    `CREATE INDEX IF NOT EXISTS idx_events_category ON events(category_id);`,
    `CREATE INDEX IF NOT EXISTS idx_events_dates ON events(starts_at);`,
    `CREATE INDEX IF NOT EXISTS idx_events_price ON events(price_cents);`,
    `CREATE INDEX IF NOT EXISTS idx_events_title_trgm ON events USING gin (title gin_trgm_ops);`,
    `CREATE INDEX IF NOT EXISTS idx_events_desc_trgm ON events USING gin (description gin_trgm_ops);`
  ]
}

export async function migrate(): Promise<void> {
  for (const sql of getStatements()) await query(sql)
}

if (require.main === module) {
  migrate()
    .then(() => {
      console.log('Migraciones aplicadas')
      process.exit(0)
    })
    .catch(err => {
      console.error('Error en migraciones', err)
      process.exit(1)
    })
}


