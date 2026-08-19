import config from '@payload-config'
import { NextRequest, NextResponse } from 'next/server'
import { getPayload, type Where } from 'payload'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Point = [number, number]

function validPoint(value: unknown): value is Point {
  return Array.isArray(value)
    && value.length === 2
    && Number.isFinite(Number(value[0]))
    && Number.isFinite(Number(value[1]))
}

export async function POST(request: NextRequest) {
  let body: { points?: unknown }
  try {
    body = await request.json() as { points?: unknown }
  } catch {
    return NextResponse.json({ ok: false, code: 'INVALID_JSON' }, { status: 400 })
  }

  if (!Array.isArray(body.points) || body.points.length < 3 || body.points.length > 80 || !body.points.every(validPoint)) {
    return NextResponse.json({ ok: false, code: 'INVALID_POLYGON' }, { status: 400 })
  }

  const points = (body.points as Point[]).map(([lng, lat]) => [Number(lng), Number(lat)] as Point)
  const first = points[0]
  const last = points[points.length - 1]
  const closed = first[0] === last[0] && first[1] === last[1]
    ? points
    : [...points, first]

  try {
    const payload = await getPayload({ config })
    const where = {
      and: [
        { status: { equals: 'published' } },
        {
          coordinates: {
            within: {
              type: 'Polygon',
              coordinates: [closed],
            },
          },
        },
      ],
    } as Where

    const result = await payload.find({
      collection: 'properties',
      depth: 0,
      limit: 500,
      pagination: false,
      overrideAccess: false,
      where,
    })

    const ids = result.docs.map(doc => {
      const item = doc as unknown as { id: string | number; slug?: string | null; code?: string | null }
      return String(item.slug || item.code || item.id)
    })

    return NextResponse.json({ ok: true, ids, count: ids.length })
  } catch (error) {
    console.error('[ivila spatial polygon] failed', error)
    return NextResponse.json({ ok: false, code: 'SPATIAL_QUERY_FAILED' }, { status: 503 })
  }
}
