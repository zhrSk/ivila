/**
 * One-time import of coastline + forest reference geometries from OpenStreetMap
 * Overpass into ivila's own PostGIS table.
 *
 * Run on Vercel by temporarily setting:
 *   IVILA_IMPORT_SPATIAL_OSM=1
 *
 * Optional:
 *   IVILA_SPATIAL_BBOX="36.25,51.15,36.90,52.65"
 *   IVILA_OVERPASS_URL="https://overpass-api.de/api/interpreter"
 *
 * Remove IVILA_IMPORT_SPATIAL_OSM after the successful deploy. Runtime distance
 * calculations use Neon only and do not call Overpass.
 */
export {}

const enabled = process.env.IVILA_IMPORT_SPATIAL_OSM === '1'

if (!enabled) {
  console.log('[ivila spatial import] skipped (IVILA_IMPORT_SPATIAL_OSM is not 1)')
  process.exit(0)
}

if (!process.env.DATABASE_URL) {
  console.error('[ivila spatial import] DATABASE_URL is missing')
  process.exit(1)
}

const bbox = process.env.IVILA_SPATIAL_BBOX || '36.25,51.15,36.90,52.65'
const bboxParts = bbox.split(',').map(Number)
if (bboxParts.length !== 4 || bboxParts.some(value => !Number.isFinite(value))) {
  console.error('[ivila spatial import] IVILA_SPATIAL_BBOX is invalid')
  process.exit(1)
}

const endpoint = process.env.IVILA_OVERPASS_URL || 'https://overpass-api.de/api/interpreter'

type OSMPoint = { lat: number; lon: number }
type OSMMember = {
  type?: string
  ref?: number
  role?: string
  geometry?: OSMPoint[]
}
type OSMElement = {
  type: 'way' | 'relation' | string
  id: number
  tags?: Record<string, string>
  geometry?: OSMPoint[]
  members?: OSMMember[]
}
type OverpassResponse = { elements?: OSMElement[] }

type SpatialFeature = {
  kind: 'coastline' | 'forest'
  sourceId: string
  name: string | null
  geometry: { type: 'LineString'; coordinates: number[][] } | { type: 'Polygon'; coordinates: number[][][] }
}

type PgClientLike = {
  query(text: string, values?: unknown[]): Promise<{ rows: unknown[] }>
  release(): void
}
type PgPoolLike = { connect(): Promise<PgClientLike> }

function samePoint(a: number[] | undefined, b: number[] | undefined) {
  return Boolean(a && b && a[0] === b[0] && a[1] === b[1])
}

function coords(points?: OSMPoint[]) {
  return (points || [])
    .filter(point => Number.isFinite(point.lon) && Number.isFinite(point.lat))
    .map(point => [point.lon, point.lat])
}

function lineOrPolygon(points: number[][]) {
  if (points.length >= 4 && samePoint(points[0], points[points.length - 1])) {
    return { type: 'Polygon' as const, coordinates: [points] }
  }
  if (points.length >= 2) return { type: 'LineString' as const, coordinates: points }
  return null
}

function assembleOuterRings(members: OSMMember[]) {
  const pending = members
    .filter(member => (member.role || 'outer') === 'outer')
    .map(member => coords(member.geometry))
    .filter(segment => segment.length >= 2)

  const results: number[][][] = []

  while (pending.length) {
    const ring = [...pending.shift()!]
    let changed = true

    while (changed && !samePoint(ring[0], ring[ring.length - 1])) {
      changed = false
      const end = ring[ring.length - 1]

      for (let i = 0; i < pending.length; i += 1) {
        const segment = pending[i]
        if (samePoint(end, segment[0])) {
          ring.push(...segment.slice(1))
          pending.splice(i, 1)
          changed = true
          break
        }
        if (samePoint(end, segment[segment.length - 1])) {
          ring.push(...[...segment].reverse().slice(1))
          pending.splice(i, 1)
          changed = true
          break
        }
      }
    }

    results.push(ring)
  }

  return results
}

function parseCoastline(elements: OSMElement[]): SpatialFeature[] {
  return elements.flatMap(element => {
    if (element.type !== 'way') return []
    const points = coords(element.geometry)
    if (points.length < 2) return []
    return [{
      kind: 'coastline' as const,
      sourceId: `way:${element.id}`,
      name: element.tags?.name || null,
      geometry: { type: 'LineString' as const, coordinates: points },
    }]
  })
}

function parseForest(elements: OSMElement[]): SpatialFeature[] {
  const features: SpatialFeature[] = []

  for (const element of elements) {
    const name = element.tags?.name || null

    if (element.type === 'way') {
      const geometry = lineOrPolygon(coords(element.geometry))
      if (geometry) {
        features.push({ kind: 'forest', sourceId: `way:${element.id}`, name, geometry })
      }
      continue
    }

    if (element.type === 'relation' && element.members?.length) {
      const rings = assembleOuterRings(element.members)
      rings.forEach((ring, index) => {
        const geometry = lineOrPolygon(ring)
        if (geometry) {
          features.push({
            kind: 'forest',
            sourceId: `relation:${element.id}:outer:${index}`,
            name,
            geometry,
          })
        }
      })
    }
  }

  return features
}

async function overpass(query: string) {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
      'User-Agent': 'ivila-estate-spatial-import/0.2',
    },
    body: new URLSearchParams({ data: query }),
    signal: AbortSignal.timeout(150_000),
  })

  if (!response.ok) {
    throw new Error(`OVERPASS_${response.status}`)
  }

  return await response.json() as OverpassResponse
}

const coastQuery = `[out:json][timeout:90];way["natural"="coastline"](${bbox});out geom;`
const forestQuery = `[out:json][timeout:120];(way["natural"="wood"](${bbox});way["landuse"="forest"](${bbox});relation["natural"="wood"](${bbox});relation["landuse"="forest"](${bbox}););out body geom;`

try {
  console.log(`[ivila spatial import] downloading OSM layers for bbox ${bbox}`)
  const [coastResponse, forestResponse] = await Promise.all([
    overpass(coastQuery),
    overpass(forestQuery),
  ])

  const features = [
    ...parseCoastline(coastResponse.elements || []),
    ...parseForest(forestResponse.elements || []),
  ]

  const coastCount = features.filter(feature => feature.kind === 'coastline').length
  const forestCount = features.filter(feature => feature.kind === 'forest').length
  if (!coastCount || !forestCount) {
    throw new Error(`REFERENCE_DATA_INCOMPLETE coastline=${coastCount} forest=${forestCount}`)
  }

  const [{ getPayload }, configModule, spatialModule] = await Promise.all([
    import('payload'),
    import('../payload.config'),
    import('../lib/spatial-distance'),
  ])
  const payload = await getPayload({ config: configModule.default })
  await spatialModule.ensureSpatialFeaturesTable(payload)

  const pool = (payload.db as unknown as { pool?: PgPoolLike }).pool
  if (!pool) throw new Error('POSTGRES_POOL_UNAVAILABLE')
  const client = await pool.connect()

  try {
    await client.query('BEGIN')
    await client.query(`DELETE FROM ivila_spatial_features WHERE source = 'osm-overpass'`)

    for (const feature of features) {
      await client.query(`
        INSERT INTO ivila_spatial_features
          (kind, source, source_id, name, geom, source_updated_at, updated_at)
        VALUES
          ($1, 'osm-overpass', $2, $3,
           ST_SetSRID(ST_GeomFromGeoJSON($4), 4326), now(), now())
        ON CONFLICT (kind, source, source_id)
        DO UPDATE SET
          name = EXCLUDED.name,
          geom = EXCLUDED.geom,
          source_updated_at = EXCLUDED.source_updated_at,
          updated_at = now();
      `, [feature.kind, feature.sourceId, feature.name, JSON.stringify(feature.geometry)])
    }

    await client.query('COMMIT')
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }

  // Re-run the property beforeChange hook so existing records also receive
  // freshly calculated distances without requiring an admin to edit each one.
  const existing = await payload.find({
    collection: 'properties',
    depth: 0,
    limit: 1000,
    pagination: false,
    overrideAccess: true,
  })

  for (const property of existing.docs) {
    await payload.update({
      collection: 'properties',
      id: property.id,
      data: {},
      depth: 0,
      overrideAccess: true,
    })
  }

  console.log(`[ivila spatial import] ready: coastline=${coastCount}, forest=${forestCount}, propertiesRecalculated=${existing.docs.length}`)
  process.exit(0)
} catch (error) {
  console.error('[ivila spatial import] failed')
  console.error(error)
  process.exit(1)
}
