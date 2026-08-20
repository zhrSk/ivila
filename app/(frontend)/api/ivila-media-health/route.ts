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

export async function GET() {
  const storeId = process.env.BLOB_STORE_ID?.trim()

  if (!storeId) {
    return NextResponse.json({
      ready: false,
      provider: 'vercel-blob',
      code: 'BLOB_STORE_ID_MISSING',
      detail: 'BLOB_STORE_ID در Runtime این Deployment وجود ندارد. Blob Store جدید را به Project و Production متصل کن و Redeploy بزن.',
    })
  }

  try {
    // Do not manually read/pass VERCEL_OIDC_TOKEN here. On Vercel, the Blob SDK
    // obtains and refreshes the short-lived OIDC credential from the runtime.
    await list({
      limit: 1,
      storeId,
    })

    return NextResponse.json({
      ready: true,
      provider: 'vercel-blob',
      auth: 'vercel-oidc-sdk',
      storeConnected: true,
    })
  } catch (error) {
    const detail = compactError(error)
    console.error('[ivila blob health] SDK probe failed', { detail, error })

    return NextResponse.json({
      ready: false,
      provider: 'vercel-blob',
      code: 'BLOB_SDK_PROBE_FAILED',
      detail,
      storeConnected: true,
    })
  }
}
