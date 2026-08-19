import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  return NextResponse.json({
    ready: Boolean(process.env.BLOB_READ_WRITE_TOKEN),
    provider: 'vercel-blob',
  })
}
