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

function compactError(error: unknown) {
  if (!(error instanceof Error)) return 'UNKNOWN_BLOB_ERROR'

  return error.message
    .replace(/https?:\/\/\S+/gi, '[url]')
    .replace(/[A-Za-z0-9_-]{40,}/g, '[redacted]')
    .slice(0, 320)
}

function classifyBlobError(error: unknown) {
  const message = error instanceof Error ? error.message : ''
  if (/private store/i.test(message) && /public access/i.test(message)) return 'BLOB_STORE_IS_PRIVATE'
  if (/environment/i.test(message) && /oidc/i.test(message)) return 'OIDC_ENVIRONMENT_NOT_ALLOWED'
  if (/access denied|forbidden/i.test(message)) return 'BLOB_ACCESS_DENIED'
  if (/store does not exist|store not found/i.test(message)) return 'BLOB_STORE_NOT_FOUND'
  if (/no blob credentials|BLOB_STORE_ID|oidc/i.test(message)) return 'BLOB_CREDENTIALS_MISSING'
  if (/file is too large|file length/i.test(message)) return 'BLOB_FILE_TOO_LARGE'
  return 'BLOB_UPLOAD_FAILED'
}

async function authenticated(request: Request) {
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: request.headers })
  return Boolean(user)
}

function getStoreId() {
  return process.env.BLOB_STORE_ID?.trim()
}

export async function POST(request: Request) {
  try {
    if (!(await authenticated(request))) {
      return NextResponse.json({ message: 'AUTH_REQUIRED' }, { status: 401 })
    }

    const storeId = getStoreId()
    if (!storeId) {
      return NextResponse.json({ message: 'BLOB_STORE_NOT_CONNECTED', code: 'BLOB_STORE_ID_MISSING' }, { status: 503 })
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

    // Let @vercel/blob obtain/refresh the OIDC token from the Vercel runtime.
    // Only the connected store id is selected explicitly.
    const blob = await put(pathname, file, {
      access: 'public',
      addRandomSuffix: true,
      contentType: file.type,
      cacheControlMaxAge: 60 * 60 * 24 * 30,
      storeId,
    })

    return NextResponse.json({
      url: blob.url,
      pathname: blob.pathname,
      contentType: blob.contentType,
      size: file.size,
      auth: 'vercel-oidc-sdk',
    })
  } catch (error) {
    const code = classifyBlobError(error)
    const detail = compactError(error)
    console.error('[ivila blob] upload failed', { code, detail, error })
    return NextResponse.json({ message: 'BLOB_UPLOAD_FAILED', code, detail }, { status: 502 })
  }
}

export async function DELETE(request: Request) {
  try {
    if (!(await authenticated(request))) {
      return NextResponse.json({ message: 'AUTH_REQUIRED' }, { status: 401 })
    }

    const storeId = getStoreId()
    if (!storeId) {
      return NextResponse.json({ message: 'BLOB_STORE_NOT_CONNECTED', code: 'BLOB_STORE_ID_MISSING' }, { status: 503 })
    }

    const body = await request.json().catch(() => null) as null | { url?: string }
    const url = body?.url?.trim()
    if (!url || !/^https:\/\//i.test(url)) {
      return NextResponse.json({ message: 'BLOB_URL_REQUIRED' }, { status: 400 })
    }

    await del(url, { storeId })
    return NextResponse.json({ ok: true })
  } catch (error) {
    const detail = compactError(error)
    console.error('[ivila blob] delete failed', { detail, error })
    return NextResponse.json({ message: 'BLOB_DELETE_FAILED', detail }, { status: 502 })
  }
}
