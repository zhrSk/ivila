import config from '@payload-config'
import { computeEnvironmentalDistances } from '@/lib/spatial-distance'
import { getPayload } from 'payload'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const ROYAN_REGION = {
  minLng: 51.15,
  maxLng: 52.65,
  minLat: 36.25,
  maxLat: 36.9,
}

export async function GET(request: NextRequest) {
  const lng = Number(request.nextUrl.searchParams.get('lng'))
  const lat = Number(request.nextUrl.searchParams.get('lat'))

  if (!Number.isFinite(lng) || !Number.isFinite(lat)) {
    return NextResponse.json({ message: 'INVALID_COORDINATES' }, { status: 400 })
  }

  if (
    lng < ROYAN_REGION.minLng || lng > ROYAN_REGION.maxLng ||
    lat < ROYAN_REGION.minLat || lat > ROYAN_REGION.maxLat
  ) {
    return NextResponse.json({ message: 'OUTSIDE_SUPPORTED_REGION' }, { status: 400 })
  }

  try {
    const payload = await getPayload({ config })
    const distances = await computeEnvironmentalDistances(payload, lng, lat)
    const ready = distances.seaDistanceM !== null || distances.forestDistanceM !== null

    return NextResponse.json({
      ready,
      ...distances,
      layers: {
        coastline: distances.seaDistanceM !== null,
        forest: distances.forestDistanceM !== null,
      },
    })
  } catch (error) {
    console.error('[ivila spatial] distance API failed', error)
    return NextResponse.json({ message: 'SPATIAL_DISTANCE_FAILED' }, { status: 500 })
  }
}
