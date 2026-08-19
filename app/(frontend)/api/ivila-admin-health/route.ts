import config from '@payload-config'
import { NextResponse } from 'next/server'
import { getPayload } from 'payload'

export const dynamic = 'force-dynamic'

type HealthCode =
  | 'OK'
  | 'MISSING_DATABASE_URL'
  | 'MISSING_PAYLOAD_SECRET'
  | 'DB_SCHEMA_MISSING'
  | 'DATABASE_UNREACHABLE'
  | 'PAYLOAD_INIT_FAILED'

function classifyError(error: unknown): { code: HealthCode; message: string } {
  const text = error instanceof Error ? `${error.name}: ${error.message}` : String(error)
  const lower = text.toLowerCase()

  if (
    lower.includes('does not exist') ||
    lower.includes('undefined table') ||
    lower.includes('relation') && lower.includes('exist')
  ) {
    return {
      code: 'DB_SCHEMA_MISSING',
      message: 'اتصال Neon برقرار است، اما جدول‌های اولیه Payload هنوز ساخته نشده‌اند.',
    }
  }

  if (
    lower.includes('connect') ||
    lower.includes('econn') ||
    lower.includes('timeout') ||
    lower.includes('getaddrinfo') ||
    lower.includes('password authentication') ||
    lower.includes('ssl')
  ) {
    return {
      code: 'DATABASE_UNREACHABLE',
      message: 'Payload نتوانست به دیتابیس Neon متصل شود.',
    }
  }

  return {
    code: 'PAYLOAD_INIT_FAILED',
    message: 'Payload در زمان راه‌اندازی Backend با خطا روبه‌رو شد.',
  }
}

export async function GET() {
  const hasDatabaseUrl = Boolean(process.env.DATABASE_URL)
  const hasPayloadSecret = Boolean(process.env.PAYLOAD_SECRET)

  if (!hasDatabaseUrl) {
    return NextResponse.json({
      ok: false,
      code: 'MISSING_DATABASE_URL' satisfies HealthCode,
      hasDatabaseUrl,
      hasPayloadSecret,
      message: 'متغیر DATABASE_URL در محیط Vercel تعریف نشده است.',
    })
  }

  if (!hasPayloadSecret) {
    return NextResponse.json({
      ok: false,
      code: 'MISSING_PAYLOAD_SECRET' satisfies HealthCode,
      hasDatabaseUrl,
      hasPayloadSecret,
      message: 'متغیر PAYLOAD_SECRET در محیط Vercel تعریف نشده است.',
    })
  }

  try {
    const payload = await getPayload({ config })
    const users = await payload.find({
      collection: 'users',
      depth: 0,
      limit: 1,
      overrideAccess: true,
    })

    return NextResponse.json({
      ok: true,
      code: 'OK' satisfies HealthCode,
      hasDatabaseUrl,
      hasPayloadSecret,
      hasUsers: users.totalDocs > 0,
      message: 'Backend مدیریت ivila آماده است.',
    })
  } catch (error) {
    console.error('[ivila admin health]', error)
    const diagnosed = classifyError(error)
    return NextResponse.json({
      ok: false,
      code: diagnosed.code,
      hasDatabaseUrl,
      hasPayloadSecret,
      message: diagnosed.message,
    })
  }
}
