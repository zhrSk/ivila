import { list } from '@vercel/blob'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

function compactError(error: unknown) {
  if (!(error instanceof Error)) return 'UNKNOWN_BLOB_ERROR'

  return error.message
    .replace(/https?:\/\/\S+/gi, '[url]')
    .replace(/[A-Za-z0-9_-]{40,}/g, '[redacted]')
    .slice(0, 260)
}

export async function GET(request: Request) {
  const storeId = process.env.BLOB_STORE_ID?.trim()
  const oidcToken = request.headers.get('x-vercel-oidc-token')?.trim() || process.env.VERCEL_OIDC_TOKEN?.trim()

  if (!storeId) {
    return NextResponse.json({
      ready: false,
      provider: 'vercel-blob',
      auth: 'missing',
      storeConnected: false,
      code: 'BLOB_STORE_ID_MISSING',
    })
  }

  try {
    await list({
      limit: 1,
      storeId,
      ...(oidcToken ? { oidcToken } : {}),
    })

    return NextResponse.json({
      ready: true,
      provider: 'vercel-blob',
      auth: oidcToken ? 'explicit-oidc' : 'sdk-context',
      storeConnected: true,
    })
  } catch (error) {
    console.error('[ivila blob health] SDK probe failed', error)

    return NextResponse.json({
      ready: false,
      provider: 'vercel-blob',
      auth: 'probe-failed',
      storeConnected: true,
      code: 'BLOB_SDK_PROBE_FAILED',
      detail: compactError(error),
    })
  }
}
