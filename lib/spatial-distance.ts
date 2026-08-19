import 'server-only'
import type { Payload } from 'payload'

type DistanceRow = {
  sea_distance_m: number | null
  forest_distance_m: number | null
}

type QueryResult<T> = { rows: T[] }
type PgPoolLike = {
  query<T = Record<string, unknown>>(text: string, values?: unknown[]): Promise<QueryResult<T>>
}

let spatialTableEnsured = false

function pgPool(payload: Payload): PgPoolLike {
  const pool = (payload.db as unknown as { pool?: PgPoolLike }).pool
  if (!pool) throw new Error('POSTGRES_POOL_UNAVAILABLE')
  return pool
}

export async function ensureSpatialFeaturesTable(payload: Payload) {
  if (spatialTableEnsured) return

  const pool = pgPool(payload)
  await pool.query(`
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
  const pool = pgPool(payload)

  const result = await pool.query<DistanceRow>(`
    WITH p AS (
      SELECT ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography AS geog
    )
    SELECT
      (
        SELECT ROUND(ST_Distance(p.geog, sf.geom::geography))::integer
        FROM ivila_spatial_features sf
        WHERE sf.kind = 'coastline'
          AND ST_DWithin(p.geog, sf.geom::geography, 150000)
        ORDER BY sf.geom::geography <-> p.geog
        LIMIT 1
      ) AS sea_distance_m,
      (
        SELECT ROUND(ST_Distance(p.geog, sf.geom::geography))::integer
        FROM ivila_spatial_features sf
        WHERE sf.kind = 'forest'
          AND ST_DWithin(p.geog, sf.geom::geography, 100000)
        ORDER BY sf.geom::geography <-> p.geog
        LIMIT 1
      ) AS forest_distance_m
    FROM p;
  `, [longitude, latitude])

  const row = result.rows[0]
  return {
    seaDistanceM: row?.sea_distance_m ?? null,
    forestDistanceM: row?.forest_distance_m ?? null,
  }
}
