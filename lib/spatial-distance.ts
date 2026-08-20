import { sql } from '@payloadcms/db-postgres'
import type { Payload } from 'payload'

type DrizzleExecutor = {
  execute(query: unknown): Promise<unknown>
}

let spatialTableEnsured = false

function drizzleOf(payload: Payload): DrizzleExecutor {
  const drizzle = (payload.db as unknown as { drizzle?: DrizzleExecutor }).drizzle
  if (!drizzle) throw new Error('POSTGRES_DRIZZLE_UNAVAILABLE')
  return drizzle
}

function rowsOf(result: unknown): Record<string, unknown>[] {
  if (Array.isArray(result)) return result.filter((row): row is Record<string, unknown> => Boolean(row && typeof row === 'object'))
  if (result && typeof result === 'object') {
    const rows = (result as { rows?: unknown }).rows
    if (Array.isArray(rows)) return rows.filter((row): row is Record<string, unknown> => Boolean(row && typeof row === 'object'))
  }
  return []
}

function nullableNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

export async function ensureSpatialFeaturesTable(payload: Payload) {
  if (spatialTableEnsured) return

  const drizzle = drizzleOf(payload)
  await drizzle.execute(sql.raw(`
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
    )
  `))
  await drizzle.execute(sql.raw(`CREATE INDEX IF NOT EXISTS ivila_spatial_features_kind_idx ON ivila_spatial_features(kind)`))
  await drizzle.execute(sql.raw(`CREATE INDEX IF NOT EXISTS ivila_spatial_features_geom_gix ON ivila_spatial_features USING GIST (geom)`))

  spatialTableEnsured = true
}

export type EnvironmentalDistances = {
  seaDistanceM: number | null
  forestDistanceM: number | null
}

export async function computeEnvironmentalDistances(
  payload: Payload,
  longitude: number,
  latitude: number,
): Promise<EnvironmentalDistances> {
  if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) {
    return { seaDistanceM: null, forestDistanceM: null }
  }

  await ensureSpatialFeaturesTable(payload)
  const drizzle = drizzleOf(payload)

  // Use the geometry GiST index only for finding the nearest candidate, then
  // calculate the final distance as geography so the result is in metres.
  // This avoids relying on adapter-specific node-postgres pool internals in
  // Vercel serverless functions.
  const result = await drizzle.execute(sql`
    WITH p AS (
      SELECT ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326) AS geom
    )
    SELECT
      (
        SELECT ROUND(ST_Distance(sf.geom::geography, p.geom::geography))::integer
        FROM ivila_spatial_features sf
        WHERE sf.kind = 'coastline'
        ORDER BY sf.geom <-> p.geom
        LIMIT 1
      ) AS sea_distance_m,
      (
        SELECT ROUND(ST_Distance(sf.geom::geography, p.geom::geography))::integer
        FROM ivila_spatial_features sf
        WHERE sf.kind = 'forest'
        ORDER BY sf.geom <-> p.geom
        LIMIT 1
      ) AS forest_distance_m
    FROM p
  `)

  const row = rowsOf(result)[0]
  return {
    seaDistanceM: nullableNumber(row?.sea_distance_m),
    forestDistanceM: nullableNumber(row?.forest_distance_m),
  }
}
