import { NextRequest, NextResponse } from 'next/server'
import { getSpatialFeaturesForBounds } from '@/lib/spatial-map'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function finite(value: string | null) {
  if (value === null || value.trim() === '') return null
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams
  const west = finite(params.get('west'))
  const south = finite(params.get('south'))
  const east = finite(params.get('east'))
  const north = finite(params.get('north'))
  const zoom = finite(params.get('zoom')) ?? 11

  if (west === null || south === null || east === null || north === null || west >= east || south >= north) {
    return NextResponse.json({ ok: false, code: 'INVALID_BOUNDS' }, { status: 400 })
  }

  // Prevent accidental global queries. This API exists for the visible map
  // viewport, not bulk export of the reference dataset.
  if ((east - west) > 4 || (north - south) > 3) {
    return NextResponse.json({ ok: false, code: 'BOUNDS_TOO_LARGE' }, { status: 400 })
  }

  try {
    const data = await getSpatialFeaturesForBounds({ west, south, east, north, zoom })
    const response = NextResponse.json({ ok: true, available: data.features.length > 0, data })
    response.headers.set('Cache-Control', 'public, max-age=120, s-maxage=1800, stale-while-revalidate=86400')
    return response
  } catch (error) {
    console.error('[ivila spatial layers] failed', error)
    return NextResponse.json({
      ok: false,
      available: false,
      code: 'SPATIAL_LAYER_UNAVAILABLE',
      data: { type: 'FeatureCollection', features: [] },
    }, { status: 503 })
  }
}
