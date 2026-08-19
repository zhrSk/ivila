import config from '@payload-config'
import { del, put } from '@vercel/blob'
import { NextResponse } from 'next/server'
import { getPayload } from 'payload'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const MAX_FILE_SIZE = 4_000_000
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])

function cleanSegment(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'property'
}

async function authenticated(request: Request) {
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: request.headers })
  return Boolean(user)
}

export async function POST(request: Request) {
  try {
    if (!(await authenticated(request))) {
      return NextResponse.json({ message: 'AUTH_REQUIRED' }, { status: 401 })
    }

    if (!process.env.BLOB_STORE_ID) {
      return NextResponse.json({ message: 'BLOB_STORE_NOT_CONNECTED' }, { status: 503 })
    }

    const formData = await request.formData()
    const file = formData.get('file')
    const propertyCode = String(formData.get('propertyCode') || 'property')

    if (!(file instanceof File)) {
      return NextResponse.json({ message: 'FILE_REQUIRED' }, { status: 400 })
    }
    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json({ message: 'UNSUPPORTED_FILE_TYPE' }, { status: 415 })
    }
    if (file.size <= 0 || file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ message: 'FILE_TOO_LARGE' }, { status: 413 })
    }

    const pathname = `properties/${cleanSegment(propertyCode)}/${cleanSegment(file.name.replace(/\.[^.]+$/, ''))}.webp`
    const blob = await put(pathname, file, {
      access: 'public',
      addRandomSuffix: true,
      contentType: file.type,
      cacheControlMaxAge: 60 * 60 * 24 * 30,
    })

    return NextResponse.json({
      url: blob.url,
      pathname: blob.pathname,
      contentType: blob.contentType,
      size: file.size,
    })
  } catch (error) {
    console.error('[ivila blob] upload failed', error)
    return NextResponse.json({ message: 'BLOB_UPLOAD_FAILED' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    if (!(await authenticated(request))) {
      return NextResponse.json({ message: 'AUTH_REQUIRED' }, { status: 401 })
    }

    const body = await request.json().catch(() => null) as null | { url?: string }
    const url = body?.url?.trim()
    if (!url || !/^https:\/\//i.test(url)) {
      return NextResponse.json({ message: 'BLOB_URL_REQUIRED' }, { status: 400 })
    }

    await del(url)
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[ivila blob] delete failed', error)
    return NextResponse.json({ message: 'BLOB_DELETE_FAILED' }, { status: 500 })
  }
}
