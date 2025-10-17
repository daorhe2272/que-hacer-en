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
      price_cents INT,
      currency CHAR(3) NOT NULL DEFAULT 'COP',
      image TEXT,
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
    // text search with unaccent+lower using regular columns for better compatibility
    `ALTER TABLE events
      ADD COLUMN IF NOT EXISTS title_norm TEXT,
      ADD COLUMN IF NOT EXISTS description_norm TEXT,
      ADD COLUMN IF NOT EXISTS venue_norm TEXT;`,
    `CREATE INDEX IF NOT EXISTS idx_events_title_trgm ON events USING gin (title_norm gin_trgm_ops);`,
    `CREATE INDEX IF NOT EXISTS idx_events_desc_trgm ON events USING gin (description_norm gin_trgm_ops);`,
    `CREATE INDEX IF NOT EXISTS idx_events_venue_trgm ON events USING gin (venue_norm gin_trgm_ops);`,
    `ALTER TABLE tags
      ADD COLUMN IF NOT EXISTS name_norm TEXT;`,
    `CREATE INDEX IF NOT EXISTS idx_tags_name_trgm ON tags USING gin (name_norm gin_trgm_ops);`,
    
    // Create function to normalize text for search
    // WARNING: This function may fail if UNACCENT extension is not available
    // If migration fails, manually create function in Supabase SQL Editor
    `CREATE OR REPLACE FUNCTION normalize_text(input_text TEXT)
     RETURNS TEXT AS $$
     BEGIN
       IF input_text IS NULL THEN
         RETURN NULL;
       END IF;
       RETURN LOWER(UNACCENT(input_text));
     END;
     $$ LANGUAGE plpgsql IMMUTABLE;`,
     
    // Create trigger function for events table
    // WARNING: Trigger depends on normalize_text function above
    `CREATE OR REPLACE FUNCTION update_event_search_columns()
     RETURNS TRIGGER AS $$
     BEGIN
       NEW.title_norm = normalize_text(NEW.title);
       NEW.description_norm = normalize_text(NEW.description);
       NEW.venue_norm = normalize_text(NEW.venue);
       RETURN NEW;
     END;
     $$ LANGUAGE plpgsql;`,
     
    // Create trigger for events
    // WARNING: Test this trigger after migration! Create a test event and verify 
    // normalized columns are populated. If not, manually recreate in Supabase.
    `DROP TRIGGER IF EXISTS event_search_trigger ON events;`,
    `CREATE TRIGGER event_search_trigger
       BEFORE INSERT OR UPDATE ON events
       FOR EACH ROW
       EXECUTE FUNCTION update_event_search_columns();`,
       
    // Create trigger function for tags table
    `CREATE OR REPLACE FUNCTION update_tag_search_columns()
     RETURNS TRIGGER AS $$
     BEGIN
       NEW.name_norm = normalize_text(NEW.name);
       RETURN NEW;
     END;
     $$ LANGUAGE plpgsql;`,
     
    // Create trigger for tags
    `DROP TRIGGER IF EXISTS tag_search_trigger ON tags;`,
    `CREATE TRIGGER tag_search_trigger
       BEFORE INSERT OR UPDATE ON tags
       FOR EACH ROW
       EXECUTE FUNCTION update_tag_search_columns();`,
    // users and roles
    `DO $$ BEGIN
       IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
         CREATE TYPE user_role AS ENUM ('attendee','organizer','admin');
       END IF;
     END $$;`,
    `CREATE TABLE IF NOT EXISTS users (
       id UUID PRIMARY KEY,
       email TEXT UNIQUE,
       display_name TEXT,
       avatar_url TEXT,
       role user_role NOT NULL DEFAULT 'attendee',
       created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
       updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
     );`,
    `CREATE TABLE IF NOT EXISTS favorites (
       user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
       event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
       created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
       PRIMARY KEY (user_id, event_id)
     );`,
    // Add created_by column to events table for user ownership
    `ALTER TABLE events ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id);`,
    // Backfill existing events with a default created_by (first admin user)
    // This ensures existing events remain accessible and manageable
    `DO $$ 
     DECLARE 
       default_admin_id UUID;
     BEGIN
       SELECT id INTO default_admin_id FROM users WHERE role = 'admin' LIMIT 1;
       IF default_admin_id IS NOT NULL THEN
         UPDATE events SET created_by = default_admin_id WHERE created_by IS NULL;
       END IF;
     END $$;`,
    // Create index for created_by queries
    `CREATE INDEX IF NOT EXISTS idx_events_created_by ON events(created_by);`,
    
    // Add image column for event images
    `ALTER TABLE events ADD COLUMN IF NOT EXISTS image TEXT;`,

    // Allow NULL price_cents for "Precio desconocido" events
    `ALTER TABLE events ALTER COLUMN price_cents DROP NOT NULL;`,

    // Add event_url column for mined events
    `ALTER TABLE events ADD COLUMN IF NOT EXISTS event_url TEXT;`,

    // Add active column for event moderation
    `ALTER TABLE events ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT true;`,
    
    // Backfill existing events with normalized text (BEFORE RLS is enabled)
    // WARNING: This backfill may fail silently if normalize_text function failed to create.
    // If search doesn't work after migration, run manual backfill:
    // UPDATE events SET title_norm = LOWER(UNACCENT(title)), description_norm = LOWER(UNACCENT(description)), venue_norm = LOWER(UNACCENT(venue));
    `UPDATE events SET 
       title_norm = normalize_text(title),
       description_norm = normalize_text(description),
       venue_norm = normalize_text(venue)
     WHERE title_norm IS NULL OR description_norm IS NULL OR venue_norm IS NULL;`,
     
    // Backfill existing tags with normalized text  
    `UPDATE tags SET name_norm = normalize_text(name) WHERE name_norm IS NULL;`,
    
    // Enable Row Level Security on events table
    `ALTER TABLE events ENABLE ROW LEVEL SECURITY;`,
    
    // Service Role Bypass Policy (Critical: Allows API to function)
    `DROP POLICY IF EXISTS "Service role full access events" ON events;`,
    `CREATE POLICY "Service role full access events" ON events FOR ALL USING (current_setting('request.jwt.claims', true)::json->>'role' = 'service_role');`,
    
    // RLS Policies for events (public read, owner/admin write)
    `DROP POLICY IF EXISTS "Events are publicly readable" ON events;`,
    `CREATE POLICY "Events are publicly readable" ON events FOR SELECT USING (true);`,
    `DROP POLICY IF EXISTS "Authenticated users can create events" ON events;`,
    `CREATE POLICY "Authenticated users can create events" ON events FOR INSERT WITH CHECK (auth.role() = 'authenticated');`,
    `DROP POLICY IF EXISTS "Users can update their own events or admins can update any" ON events;`,
    `CREATE POLICY "Users can update their own events or admins can update any" ON events FOR UPDATE USING (
      auth.uid() = created_by OR 
      EXISTS(SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
    );`,
    `DROP POLICY IF EXISTS "Users can delete their own events or admins can delete any" ON events;`,
    `CREATE POLICY "Users can delete their own events or admins can delete any" ON events FOR DELETE USING (
      auth.uid() = created_by OR 
      EXISTS(SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
    );`,
    
    // Insert standard cities
    `INSERT INTO cities (slug, name) VALUES ('bogota', 'Bogotá') ON CONFLICT (slug) DO NOTHING;`,
    `INSERT INTO cities (slug, name) VALUES ('medellin', 'Medellín') ON CONFLICT (slug) DO NOTHING;`,
    `INSERT INTO cities (slug, name) VALUES ('cali', 'Cali') ON CONFLICT (slug) DO NOTHING;`,
    `INSERT INTO cities (slug, name) VALUES ('barranquilla', 'Barranquilla') ON CONFLICT (slug) DO NOTHING;`,
    `INSERT INTO cities (slug, name) VALUES ('cartagena', 'Cartagena') ON CONFLICT (slug) DO NOTHING;`,
    
    // Insert standard categories (from shared package)
    `INSERT INTO categories (slug, label) VALUES ('musica', 'Música') ON CONFLICT (slug) DO NOTHING;`,
    `INSERT INTO categories (slug, label) VALUES ('arte', 'Arte') ON CONFLICT (slug) DO NOTHING;`,
    `INSERT INTO categories (slug, label) VALUES ('gastronomia', 'Gastronomía') ON CONFLICT (slug) DO NOTHING;`,
    `INSERT INTO categories (slug, label) VALUES ('deportes', 'Deportes') ON CONFLICT (slug) DO NOTHING;`,
    `INSERT INTO categories (slug, label) VALUES ('tecnologia', 'Tecnología') ON CONFLICT (slug) DO NOTHING;`,
    `INSERT INTO categories (slug, label) VALUES ('networking', 'Networking') ON CONFLICT (slug) DO NOTHING;`,
    `INSERT INTO categories (slug, label) VALUES ('cine', 'Cine') ON CONFLICT (slug) DO NOTHING;`,
    `INSERT INTO categories (slug, label) VALUES ('danza', 'Danza') ON CONFLICT (slug) DO NOTHING;`,
    `INSERT INTO categories (slug, label) VALUES ('teatro', 'Teatro') ON CONFLICT (slug) DO NOTHING;`,
    `INSERT INTO categories (slug, label) VALUES ('negocios', 'Negocios') ON CONFLICT (slug) DO NOTHING;`,
    
    // Enable Row Level Security on cities table
    `ALTER TABLE cities ENABLE ROW LEVEL SECURITY;`,
    
    // Service Role Bypass Policy for cities (Critical: Allows API to function)
    `DROP POLICY IF EXISTS "Service role full access cities" ON cities;`,
    `CREATE POLICY "Service role full access cities" ON cities FOR ALL USING (current_setting('request.jwt.claims', true)::json->>'role' = 'service_role');`,
    
    // RLS Policies for cities (public read, admin-only write)
    `DROP POLICY IF EXISTS "Cities are publicly readable" ON cities;`,
    `CREATE POLICY "Cities are publicly readable" ON cities FOR SELECT USING (true);`,
    `DROP POLICY IF EXISTS "Only admins can modify cities" ON cities;`,
    `CREATE POLICY "Only admins can modify cities" ON cities FOR ALL USING (
      EXISTS(SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
    );`
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


