import { list } from '@vercel/blob'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

function compactError(error: unknown) {
  if (!(error instanceof Error)) return 'UNKNOWN_BLOB_ERROR'

  return error.message
    .replace(/https?:\/\/\S+/gi, '[url]')
    .replace(/[A-Za-z0-9_-]{40,}/g, '[redacted]')
    .slice(0, 220)
}

export async function GET(request: Request) {
  const hasStore = Boolean(process.env.BLOB_STORE_ID)

  if (!hasStore) {
    return NextResponse.json({
      ready: false,
      provider: 'vercel-blob',
      auth: 'missing',
      storeConnected: false,
      code: 'BLOB_STORE_ID_MISSING',
    })
  }

  try {
    // Do a real, read-only SDK call instead of assuming the OIDC token must
    // exist in process.env. On Vercel Functions the token can live in the
    // request context (x-vercel-oidc-token), which @vercel/blob resolves.
    await list({ limit: 1 })

    const requestOidc = Boolean(request.headers.get('x-vercel-oidc-token'))
    const buildOrLocalOidc = Boolean(process.env.VERCEL_OIDC_TOKEN)
    const legacyToken = Boolean(process.env.BLOB_READ_WRITE_TOKEN)

    return NextResponse.json({
      ready: true,
      provider: 'vercel-blob',
      auth: requestOidc
        ? 'oidc-request'
        : buildOrLocalOidc
          ? 'oidc-env'
          : legacyToken
            ? 'legacy-token'
            : 'sdk-context',
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
