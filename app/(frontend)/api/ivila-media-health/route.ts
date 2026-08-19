import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const hasStore = Boolean(process.env.BLOB_STORE_ID)
  const hasOidc = Boolean(process.env.VERCEL_OIDC_TOKEN)
  const hasLegacyToken = Boolean(process.env.BLOB_READ_WRITE_TOKEN)

  return NextResponse.json({
    ready: hasStore && (hasOidc || hasLegacyToken),
    provider: 'vercel-blob',
    auth: hasOidc ? 'oidc' : hasLegacyToken ? 'legacy-token' : 'missing',
    storeConnected: hasStore,
  })
}
