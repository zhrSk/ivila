/**
 * Safe, idempotent production DDL for ivila-owned database objects.
 *
 * IMPORTANT:
 * - This script never runs Drizzle/Payload db push.
 * - It never drops or renames tables/columns.
 * - It is safe to run on every Vercel build.
 * - Payload-managed schema changes should use committed migrations going forward.
 */
export {}

if (!process.env.DATABASE_URL) {
  console.error('[ivila schema] DATABASE_URL is missing')
  process.exit(1)
}

if (!process.env.PAYLOAD_SECRET) {
  console.error('[ivila schema] PAYLOAD_SECRET is missing')
  process.exit(1)
}

try {
  const [{ getPayload }, configModule] = await Promise.all([
    import('payload'),
    import('../payload.config'),
  ])

  // Keep Payload in production mode: initializing it must NOT trigger dev db-push.
  Object.assign(process.env, { NODE_ENV: 'production' })
  const payload = await getPayload({ config: configModule.default })
  const pool = (payload.db as unknown as {
    pool?: { query(text: string, values?: unknown[]): Promise<unknown> }
  }).pool

  if (!pool) throw new Error('POSTGRES_POOL_UNAVAILABLE')

  await pool.query(`
    CREATE EXTENSION IF NOT EXISTS postgis;

    ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20);
    ALTER TABLE users ADD COLUMN IF NOT EXISTS phone TEXT;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT;

    UPDATE users
      SET role = 'admin'
      WHERE role IS NULL
        AND id = (SELECT id FROM users WHERE role IS NULL ORDER BY id ASC LIMIT 1);
    UPDATE users SET role = 'agent' WHERE role IS NULL;
    ALTER TABLE users ALTER COLUMN role SET DEFAULT 'agent';

    ALTER TABLE properties ADD COLUMN IF NOT EXISTS image_urls_json TEXT;
    ALTER TABLE properties ADD COLUMN IF NOT EXISTS owner_name TEXT;
    ALTER TABLE properties ADD COLUMN IF NOT EXISTS owner_phone TEXT;
    ALTER TABLE properties ADD COLUMN IF NOT EXISTS owner_notes TEXT;
    ALTER TABLE properties ADD COLUMN IF NOT EXISTS created_by_user_id TEXT;
    ALTER TABLE properties ADD COLUMN IF NOT EXISTS public_lng DOUBLE PRECISION;
    ALTER TABLE properties ADD COLUMN IF NOT EXISTS public_lat DOUBLE PRECISION;
    ALTER TABLE properties ADD COLUMN IF NOT EXISTS location_source TEXT;
    ALTER TABLE properties ADD COLUMN IF NOT EXISTS location_accuracy_m DOUBLE PRECISION;
    ALTER TABLE properties ADD COLUMN IF NOT EXISTS location_captured_at TIMESTAMPTZ;

    CREATE INDEX IF NOT EXISTS properties_created_by_user_id_idx ON properties(created_by_user_id);
    CREATE INDEX IF NOT EXISTS users_role_idx ON users(role);

    CREATE TABLE IF NOT EXISTS ivila_spatial_features (
      id BIGSERIAL PRIMARY KEY,
      kind TEXT NOT NULL CHECK (kind IN ('coastline', 'forest')),
      source TEXT NOT NULL DEFAULT 'osm-overpass',
      source_id TEXT NOT NULL,
      name TEXT,
      geom geometry(Geometry, 4326) NOT NULL,
      source_updated_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      UNIQUE(kind, source, source_id)
    );

    CREATE INDEX IF NOT EXISTS ivila_spatial_features_kind_idx
      ON ivila_spatial_features(kind);
    CREATE INDEX IF NOT EXISTS ivila_spatial_features_geom_gix
      ON ivila_spatial_features USING GIST (geom);
    CREATE INDEX IF NOT EXISTS ivila_spatial_features_geog_gix
      ON ivila_spatial_features USING GIST ((geom::geography));
  `)

  console.log('[ivila schema] safe production schema checks completed')
  process.exit(0)
} catch (error) {
  console.error('[ivila schema] failed')
  console.error(error)
  process.exit(1)
}
