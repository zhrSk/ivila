import config from '@payload-config'
import { getPayload } from 'payload'

type QueryResult<T> = { rows: T[] }
type PgPoolLike = {
  query<T = Record<string, unknown>>(text: string, values?: unknown[]): Promise<QueryResult<T>>
}

type SpatialRow = {
  id: string | number
  kind: 'coastline' | 'forest'
  source_id: string
  name: string | null
  geometry: unknown
}

export type SpatialFeatureCollection = {
  type: 'FeatureCollection'
  features: Array<{
    type: 'Feature'
    id: string
    properties: {
      kind: 'coastline' | 'forest'
      name: string | null
      sourceId: string
    }
    geometry: unknown
  }>
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

async function pool(): Promise<PgPoolLike> {
  const payload = await getPayload({ config })
  const dbPool = (payload.db as unknown as { pool?: PgPoolLike }).pool
  if (!dbPool) throw new Error('POSTGRES_POOL_UNAVAILABLE')
  return dbPool
}

export async function getSpatialFeaturesForBounds({
  west,
  south,
  east,
  north,
  zoom,
}: {
  west: number
  south: number
  east: number
  north: number
  zoom: number
}): Promise<SpatialFeatureCollection> {
  const db = await pool()

  // Simplification is deliberately conservative. At the zoom levels used by
  // ivila this keeps the coast/forest shape visually accurate while avoiding
  // sending raw OSM geometry with thousands of unnecessary vertices.
  const tolerance = clamp(0.0022 / Math.pow(2, Math.max(0, zoom - 9)), 0.000015, 0.00055)

  const result = await db.query<SpatialRow>(`
    WITH viewport AS (
      SELECT ST_MakeEnvelope($1, $2, $3, $4, 4326) AS geom
    ), clipped AS (
      SELECT
        sf.id,
        sf.kind,
        sf.source_id,
        sf.name,
        ST_SimplifyPreserveTopology(
          ST_Intersection(sf.geom, viewport.geom),
          $5
        ) AS geom
      FROM ivila_spatial_features sf
      CROSS JOIN viewport
      WHERE sf.kind IN ('coastline', 'forest')
        AND sf.geom && viewport.geom
        AND ST_Intersects(sf.geom, viewport.geom)
      LIMIT 1400
    )
    SELECT
      id,
      kind,
      source_id,
      name,
      ST_AsGeoJSON(geom)::json AS geometry
    FROM clipped
    WHERE NOT ST_IsEmpty(geom);
  `, [west, south, east, north, tolerance])

  return {
    type: 'FeatureCollection',
    features: result.rows
      .filter(row => row.geometry)
      .map(row => ({
        type: 'Feature' as const,
        id: String(row.id),
        properties: {
          kind: row.kind,
          name: row.name,
          sourceId: row.source_id,
        },
        geometry: row.geometry,
      })),
  }
}
