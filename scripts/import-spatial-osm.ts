/**
 * One-time import of coastline + forest reference geometries from OpenStreetMap
 * Overpass into ivila's own PostGIS table.
 *
 * Run on Vercel by temporarily setting:
 *   IVILA_IMPORT_SPATIAL_OSM=1
 *
 * Optional:
 *   IVILA_SPATIAL_BBOX="36.25,51.15,36.90,52.65"
 *   IVILA_OVERPASS_URL="https://overpass.kumi.systems/api/interpreter"
 *
 * The importer deliberately splits the relatively expensive forest query into
 * smaller bbox tiles and can fail over between public Overpass instances. This
 * is a one-time bootstrap only; runtime distance calculations use Neon/PostGIS.
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

const [south, west, north, east] = bboxParts
if (south >= north || west >= east) {
  console.error('[ivila spatial import] IVILA_SPATIAL_BBOX bounds are invalid')
  process.exit(1)
}

const defaultEndpoints = [
  'https://overpass.kumi.systems/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
  'https://overpass-api.de/api/interpreter',
]

const configuredEndpoint = process.env.IVILA_OVERPASS_URL?.trim()
const endpoints = [...new Set([
  ...(configuredEndpoint ? [configuredEndpoint] : []),
  ...defaultEndpoints,
])]

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
type BBox = [number, number, number, number]

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

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

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

function bboxString(box: BBox) {
  return box.map(value => Number(value.toFixed(6))).join(',')
}

function splitBBox(box: BBox, rows: number, columns: number): BBox[] {
  const [s, w, n, e] = box
  const latStep = (n - s) / rows
  const lonStep = (e - w) / columns
  const tiles: BBox[] = []

  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const tileSouth = s + row * latStep
      const tileNorth = row === rows - 1 ? n : s + (row + 1) * latStep
      const tileWest = w + column * lonStep
      const tileEast = column === columns - 1 ? e : w + (column + 1) * lonStep
      tiles.push([tileSouth, tileWest, tileNorth, tileEast])
    }
  }

  return tiles
}

function endpointLabel(url: string) {
  try {
    return new URL(url).host
  } catch {
    return url
  }
}

async function overpass(query: string, label: string): Promise<OverpassResponse> {
  const errors: string[] = []

  for (const endpoint of endpoints) {
    for (let attempt = 1; attempt <= 2; attempt += 1) {
      try {
        console.log(`[ivila spatial import] ${label}: ${endpointLabel(endpoint)} attempt ${attempt}`)
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
            'User-Agent': 'ivila-estate-spatial-import/0.3 (one-time GIS bootstrap)',
          },
          body: new URLSearchParams({ data: query }),
          signal: AbortSignal.timeout(75_000),
        })

        if (response.ok) {
          const json = await response.json() as OverpassResponse
          return json
        }

        const status = response.status
        errors.push(`${endpointLabel(endpoint)}:${status}`)

        if (status === 429) {
          console.warn(`[ivila spatial import] ${label}: rate limited by ${endpointLabel(endpoint)}; waiting 30s`)
          await sleep(30_000)
          continue
        }

        if ([502, 503, 504].includes(status)) {
          console.warn(`[ivila spatial import] ${label}: transient HTTP ${status} from ${endpointLabel(endpoint)}`)
          await sleep(attempt * 2_000)
          continue
        }

        // Non-transient HTTP error: try the next endpoint rather than retrying it.
        break
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        errors.push(`${endpointLabel(endpoint)}:${message}`)
        console.warn(`[ivila spatial import] ${label}: request failed on ${endpointLabel(endpoint)} (${message})`)
        await sleep(attempt * 2_000)
      }
    }
  }

  throw new Error(`OVERPASS_ALL_ENDPOINTS_FAILED ${label} [${errors.join(', ')}]`)
}

function dedupeFeatures(features: SpatialFeature[]) {
  const map = new Map<string, SpatialFeature>()
  for (const feature of features) {
    map.set(`${feature.kind}:${feature.sourceId}`, feature)
  }
  return [...map.values()]
}

async function downloadCoastline(fullBox: BBox) {
  const full = bboxString(fullBox)
  const query = `[out:json][timeout:45];way["natural"="coastline"](${full});out geom;`

  try {
    const response = await overpass(query, 'coastline/full')
    return parseCoastline(response.elements || [])
  } catch (error) {
    console.warn('[ivila spatial import] coastline full query failed; switching to tiled coastline queries')
    console.warn(error)
  }

  const tiles = splitBBox(fullBox, 1, 4)
  const all: SpatialFeature[] = []
  for (let index = 0; index < tiles.length; index += 1) {
    const tile = bboxString(tiles[index])
    const tileQuery = `[out:json][timeout:45];way["natural"="coastline"](${tile});out geom;`
    const response = await overpass(tileQuery, `coastline/${index + 1}/${tiles.length}`)
    all.push(...parseCoastline(response.elements || []))
    await sleep(250)
  }
  return dedupeFeatures(all)
}

async function downloadForest(fullBox: BBox) {
  // Forest polygons/relations are much heavier than coastline ways. Splitting the
  // ~Royan regional bbox prevents one expensive public Overpass request from
  // becoming a gateway timeout and keeps each request regional/small.
  const tiles = splitBBox(fullBox, 2, 4)
  const all: SpatialFeature[] = []

  for (let index = 0; index < tiles.length; index += 1) {
    const tile = bboxString(tiles[index])
    const query = `[out:json][timeout:60];(way["natural"="wood"](${tile});way["landuse"="forest"](${tile});relation["natural"="wood"](${tile});relation["landuse"="forest"](${tile}););out body geom;`
    const response = await overpass(query, `forest/${index + 1}/${tiles.length}`)
    all.push(...parseForest(response.elements || []))
    await sleep(350)
  }

  return dedupeFeatures(all)
}

try {
  console.log(`[ivila spatial import] downloading OSM layers for bbox ${bbox}`)
  console.log(`[ivila spatial import] Overpass failover: ${endpoints.map(endpointLabel).join(' -> ')}`)

  // Keep the two layers sequential. Public Overpass instances are shared
  // resources; parallel large regional queries make timeouts more likely.
  const coastFeatures = dedupeFeatures(await downloadCoastline([south, west, north, east]))
  const forestFeatures = dedupeFeatures(await downloadForest([south, west, north, east]))
  const features = [...coastFeatures, ...forestFeatures]

  const coastCount = coastFeatures.length
  const forestCount = forestFeatures.length
  if (!coastCount || !forestCount) {
    throw new Error(`REFERENCE_DATA_INCOMPLETE coastline=${coastCount} forest=${forestCount}`)
  }

  console.log(`[ivila spatial import] downloaded reference data: coastline=${coastCount}, forest=${forestCount}`)

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
