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
    ALTER TABLE users ADD COLUMN IF NOT EXISTS username TEXT;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN;
    ALTER TABLE users ALTER COLUMN email DROP NOT NULL;

    UPDATE users
      SET username = CASE
        WHEN regexp_replace(phone, '[^0-9]', '', 'g') ~ '^00989[0-9]{9}$'
          THEN '0' || substring(regexp_replace(phone, '[^0-9]', '', 'g') from 5)
        WHEN regexp_replace(phone, '[^0-9]', '', 'g') ~ '^989[0-9]{9}$'
          THEN '0' || substring(regexp_replace(phone, '[^0-9]', '', 'g') from 3)
        WHEN regexp_replace(phone, '[^0-9]', '', 'g') ~ '^9[0-9]{9}$'
          THEN '0' || regexp_replace(phone, '[^0-9]', '', 'g')
        ELSE regexp_replace(phone, '[^0-9]', '', 'g')
      END
      WHERE username IS NULL AND phone IS NOT NULL AND phone <> '';

    UPDATE users SET phone = username WHERE (phone IS NULL OR phone = '') AND username IS NOT NULL;
    UPDATE users SET is_active = TRUE WHERE is_active IS NULL;
    ALTER TABLE users ALTER COLUMN is_active SET DEFAULT TRUE;

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
    ALTER TABLE properties ADD COLUMN IF NOT EXISTS review_status TEXT;
    ALTER TABLE properties ADD COLUMN IF NOT EXISTS review_note TEXT;
    ALTER TABLE properties ADD COLUMN IF NOT EXISTS reviewed_by_user_id TEXT;
    ALTER TABLE properties ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;

    -- Existing consultant drafts enter the review queue once this workflow is enabled.
    UPDATE properties p
      SET review_status = 'pending'
      FROM users u
      WHERE p.review_status IS NULL
        AND p.status = 'draft'
        AND p.created_by_user_id = u.id::text
        AND u.role = 'agent';

    UPDATE properties
      SET review_status = 'approved'
      WHERE review_status IS NULL
        AND status IN ('published', 'sold', 'rented');

    -- Consultant drafts intentionally allow incomplete commercial data.
    -- Required minimum is enforced by Payload validation: area + coordinates + owner + photo.
    ALTER TABLE properties ALTER COLUMN code DROP NOT NULL;
    ALTER TABLE properties ALTER COLUMN title DROP NOT NULL;
    ALTER TABLE properties ALTER COLUMN deal DROP NOT NULL;
    ALTER TABLE properties ALTER COLUMN "type" DROP NOT NULL;
    ALTER TABLE properties ALTER COLUMN lifestyle DROP NOT NULL;
    ALTER TABLE properties ALTER COLUMN rooms DROP NOT NULL;
    ALTER TABLE properties ALTER COLUMN document_status DROP NOT NULL;
    ALTER TABLE properties ALTER COLUMN description DROP NOT NULL;
    ALTER TABLE properties ALTER COLUMN location_text DROP NOT NULL;

    CREATE INDEX IF NOT EXISTS properties_created_by_user_id_idx ON properties(created_by_user_id);
    CREATE INDEX IF NOT EXISTS properties_review_status_idx ON properties(review_status);
    CREATE INDEX IF NOT EXISTS users_role_idx ON users(role);
    CREATE INDEX IF NOT EXISTS users_role_active_idx ON users(role, is_active);
    CREATE UNIQUE INDEX IF NOT EXISTS users_username_unique_idx ON users(username) WHERE username IS NOT NULL;
    CREATE UNIQUE INDEX IF NOT EXISTS users_phone_unique_idx ON users(phone) WHERE phone IS NOT NULL AND phone <> '';

    CREATE TABLE IF NOT EXISTS ivila_customers (
      id BIGSERIAL PRIMARY KEY,
      full_name TEXT NOT NULL,
      phone TEXT NOT NULL,
      budget_toman BIGINT,
      desired_deal TEXT,
      desired_type TEXT,
      desired_area TEXT,
      notes TEXT,
      created_by_user_id TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE UNIQUE INDEX IF NOT EXISTS ivila_customers_agent_phone_uq
      ON ivila_customers(created_by_user_id, phone);
    CREATE INDEX IF NOT EXISTS ivila_customers_created_by_idx
      ON ivila_customers(created_by_user_id);
    CREATE INDEX IF NOT EXISTS ivila_customers_phone_idx
      ON ivila_customers(phone);

    CREATE TABLE IF NOT EXISTS ivila_visits (
      id BIGSERIAL PRIMARY KEY,
      customer_id BIGINT NOT NULL REFERENCES ivila_customers(id) ON DELETE CASCADE,
      property_id TEXT NOT NULL,
      agent_user_id TEXT NOT NULL,
      visit_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      result TEXT NOT NULL DEFAULT 'planned'
        CHECK (result IN ('planned', 'visited', 'interested', 'offer', 'not_interested', 'cancelled')),
      note TEXT,
      offer_toman BIGINT,
      followup_at TIMESTAMPTZ,
      followup_done_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE INDEX IF NOT EXISTS ivila_visits_agent_idx ON ivila_visits(agent_user_id);
    CREATE INDEX IF NOT EXISTS ivila_visits_customer_idx ON ivila_visits(customer_id);
    CREATE INDEX IF NOT EXISTS ivila_visits_property_idx ON ivila_visits(property_id);
    CREATE INDEX IF NOT EXISTS ivila_visits_followup_idx
      ON ivila_visits(followup_at) WHERE followup_done_at IS NULL;
    CREATE INDEX IF NOT EXISTS ivila_visits_visit_at_idx ON ivila_visits(visit_at DESC);

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
