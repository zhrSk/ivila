import { sql } from '@payloadcms/db-postgres'
import config from '@payload-config'
import { getPayload } from 'payload'
import { normalizeIranPhone } from '@/lib/phone'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type UserShape = {
  id?: string | number
  role?: 'admin' | 'agent' | string
  isActive?: boolean
  name?: string
  phone?: string
}

type DrizzleExecutor = { execute(query: unknown): Promise<unknown> }

type CustomerRow = {
  id: string
  full_name: string
  phone: string
  budget_toman: number | null
  desired_deal: string | null
  desired_type: string | null
  desired_area: string | null
  notes: string | null
  created_by_user_id: string
  created_at: string
  updated_at: string
  agent_name: string | null
  agent_phone: string | null
}

function rowsOf(result: unknown): Record<string, unknown>[] {
  if (Array.isArray(result)) return result.filter((row): row is Record<string, unknown> => Boolean(row && typeof row === 'object'))
  if (result && typeof result === 'object') {
    const rows = (result as { rows?: unknown }).rows
    if (Array.isArray(rows)) return rows.filter((row): row is Record<string, unknown> => Boolean(row && typeof row === 'object'))
  }
  return []
}

function drizzleOf(payload: Awaited<ReturnType<typeof getPayload>>): DrizzleExecutor {
  const drizzle = (payload.db as unknown as { drizzle?: DrizzleExecutor }).drizzle
  if (!drizzle) throw new Error('POSTGRES_DRIZZLE_UNAVAILABLE')
  return drizzle
}

function idOf(user: UserShape | null | undefined) {
  return user?.id === undefined || user?.id === null ? '' : String(user.id)
}

function isAdmin(user: UserShape | null | undefined) {
  return user?.role === 'admin'
}

function jsonError(message: string, status = 400, code = 'BAD_REQUEST') {
  return Response.json({ ok: false, code, message }, { status })
}

async function auth(request: Request) {
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: request.headers })
  const typed = user as UserShape | null
  if (!typed) return { payload, user: null }
  if (typed.isActive === false) return { payload, user: null }
  return { payload, user: typed }
}

function text(value: unknown, max = 500) {
  return typeof value === 'string' ? value.trim().slice(0, max) : ''
}

function optionalNumber(value: unknown) {
  if (value === null || value === undefined || value === '') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed >= 0 ? Math.round(parsed) : null
}

function optionalDate(value: unknown) {
  if (typeof value !== 'string' || !value.trim()) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

export async function GET(request: Request) {
  try {
    const { payload, user } = await auth(request)
    if (!user) return jsonError('نیاز به ورود دوباره است.', 401, 'UNAUTHORIZED')

    const drizzle = drizzleOf(payload)
    const userId = idOf(user)
    const url = new URL(request.url)
    const requestedAgent = text(url.searchParams.get('agentId'), 64)
    const agentId = isAdmin(user) && requestedAgent && requestedAgent !== 'all' ? requestedAgent : userId
    const adminAll = isAdmin(user) && (!requestedAgent || requestedAgent === 'all')

    const customersResult = adminAll
      ? await drizzle.execute(sql`
          SELECT c.id::text, c.full_name, c.phone, c.budget_toman, c.desired_deal, c.desired_type,
                 c.desired_area, c.notes, c.created_by_user_id, c.created_at, c.updated_at,
                 u.name AS agent_name, u.phone AS agent_phone
          FROM ivila_customers c
          LEFT JOIN users u ON u.id::text = c.created_by_user_id
          ORDER BY c.updated_at DESC
          LIMIT 500
        `)
      : await drizzle.execute(sql`
          SELECT c.id::text, c.full_name, c.phone, c.budget_toman, c.desired_deal, c.desired_type,
                 c.desired_area, c.notes, c.created_by_user_id, c.created_at, c.updated_at,
                 u.name AS agent_name, u.phone AS agent_phone
          FROM ivila_customers c
          LEFT JOIN users u ON u.id::text = c.created_by_user_id
          WHERE c.created_by_user_id = ${agentId}
          ORDER BY c.updated_at DESC
          LIMIT 500
        `)

    const visitsResult = adminAll
      ? await drizzle.execute(sql`
          SELECT v.id::text, v.customer_id::text, v.property_id, v.agent_user_id, v.visit_at, v.result,
                 v.note, v.offer_toman, v.followup_at, v.followup_done_at, v.created_at, v.updated_at,
                 c.full_name AS customer_name, c.phone AS customer_phone,
                 p.code AS property_code, p.title AS property_title, p.location_text AS property_location,
                 u.name AS agent_name, u.phone AS agent_phone
          FROM ivila_visits v
          JOIN ivila_customers c ON c.id = v.customer_id
          LEFT JOIN properties p ON p.id::text = v.property_id
          LEFT JOIN users u ON u.id::text = v.agent_user_id
          ORDER BY COALESCE(v.followup_at, v.visit_at) DESC
          LIMIT 700
        `)
      : await drizzle.execute(sql`
          SELECT v.id::text, v.customer_id::text, v.property_id, v.agent_user_id, v.visit_at, v.result,
                 v.note, v.offer_toman, v.followup_at, v.followup_done_at, v.created_at, v.updated_at,
                 c.full_name AS customer_name, c.phone AS customer_phone,
                 p.code AS property_code, p.title AS property_title, p.location_text AS property_location,
                 u.name AS agent_name, u.phone AS agent_phone
          FROM ivila_visits v
          JOIN ivila_customers c ON c.id = v.customer_id
          LEFT JOIN properties p ON p.id::text = v.property_id
          LEFT JOIN users u ON u.id::text = v.agent_user_id
          WHERE v.agent_user_id = ${agentId}
          ORDER BY COALESCE(v.followup_at, v.visit_at) DESC
          LIMIT 700
        `)

    const agentsResult = isAdmin(user)
      ? await drizzle.execute(sql`
          SELECT id::text, name, phone
          FROM users
          WHERE role = 'agent' AND COALESCE(is_active, TRUE) = TRUE
          ORDER BY name NULLS LAST, phone
        `)
      : []

    return Response.json({
      ok: true,
      currentUser: { id: userId, role: user.role, name: user.name, phone: user.phone },
      customers: rowsOf(customersResult),
      visits: rowsOf(visitsResult),
      agents: rowsOf(agentsResult),
    })
  } catch (error) {
    console.error('[ivila crm] GET failed', error)
    return jsonError('دریافت اطلاعات مشتری و بازدید انجام نشد.', 500, 'CRM_LOAD_FAILED')
  }
}

export async function POST(request: Request) {
  try {
    const { payload, user } = await auth(request)
    if (!user) return jsonError('نیاز به ورود دوباره است.', 401, 'UNAUTHORIZED')
    const drizzle = drizzleOf(payload)
    const body = await request.json().catch(() => null) as Record<string, unknown> | null
    if (!body) return jsonError('اطلاعات درخواست ناقص است.')

    if (body.kind === 'customer') {
      const fullName = text(body.fullName, 160)
      const phone = normalizeIranPhone(text(body.phone, 32))
      if (!fullName) return jsonError('نام مشتری اجباری است.')
      if (!phone) return jsonError('شماره موبایل مشتری معتبر نیست.')

      let ownerUserId = idOf(user)
      const requestedAgent = text(body.agentUserId, 64)
      if (isAdmin(user) && requestedAgent) ownerUserId = requestedAgent

      if (isAdmin(user) && requestedAgent) {
        const agentCheck = rowsOf(await drizzle.execute(sql`
          SELECT id::text FROM users WHERE id::text = ${requestedAgent} AND role = 'agent' AND COALESCE(is_active, TRUE) = TRUE LIMIT 1
        `))[0]
        if (!agentCheck) return jsonError('مشاور انتخاب‌شده معتبر نیست.')
      }

      const budget = optionalNumber(body.budgetToman)
      const desiredDeal = text(body.desiredDeal, 20) || null
      const desiredType = text(body.desiredType, 40) || null
      const desiredArea = text(body.desiredArea, 180) || null
      const notes = text(body.notes, 2000) || null

      const result = await drizzle.execute(sql`
        INSERT INTO ivila_customers
          (full_name, phone, budget_toman, desired_deal, desired_type, desired_area, notes, created_by_user_id)
        VALUES
          (${fullName}, ${phone}, ${budget}, ${desiredDeal}, ${desiredType}, ${desiredArea}, ${notes}, ${ownerUserId})
        ON CONFLICT (created_by_user_id, phone)
        DO UPDATE SET
          full_name = EXCLUDED.full_name,
          budget_toman = EXCLUDED.budget_toman,
          desired_deal = EXCLUDED.desired_deal,
          desired_type = EXCLUDED.desired_type,
          desired_area = EXCLUDED.desired_area,
          notes = EXCLUDED.notes,
          updated_at = now()
        RETURNING id::text, full_name, phone, budget_toman, desired_deal, desired_type, desired_area, notes,
                  created_by_user_id, created_at, updated_at
      `)
      const customer = rowsOf(result)[0]
      return Response.json({ ok: true, customer })
    }

    if (body.kind === 'visit') {
      const customerId = text(body.customerId, 32)
      const propertyId = text(body.propertyId, 64)
      if (!customerId || !propertyId) return jsonError('مشتری و فایل ملک را انتخاب کن.')

      const customerRows = rowsOf(await drizzle.execute(sql`
        SELECT id::text, created_by_user_id FROM ivila_customers WHERE id::text = ${customerId} LIMIT 1
      `))
      const customer = customerRows[0] as CustomerRow | undefined
      if (!customer) return jsonError('مشتری پیدا نشد.', 404, 'CUSTOMER_NOT_FOUND')
      if (!isAdmin(user) && String(customer.created_by_user_id) !== idOf(user)) return jsonError('به این مشتری دسترسی نداری.', 403, 'FORBIDDEN')

      const property = rowsOf(await drizzle.execute(sql`
        SELECT id::text, status FROM properties WHERE id::text = ${propertyId} LIMIT 1
      `))[0]
      if (!property) return jsonError('فایل ملک پیدا نشد.', 404, 'PROPERTY_NOT_FOUND')
      if (property.status !== 'published') return jsonError('بازدید فقط برای فایل فعال ثبت می‌شود.')

      let agentUserId = idOf(user)
      const requestedAgent = text(body.agentUserId, 64)
      if (isAdmin(user)) agentUserId = requestedAgent || String(customer.created_by_user_id || idOf(user))

      const visitAt = optionalDate(body.visitAt) || new Date().toISOString()
      const resultValue = text(body.result, 32) || 'planned'
      const allowedResults = new Set(['planned', 'visited', 'interested', 'offer', 'not_interested', 'cancelled'])
      if (!allowedResults.has(resultValue)) return jsonError('نتیجه بازدید معتبر نیست.')
      const note = text(body.note, 3000) || null
      const offer = optionalNumber(body.offerToman)
      const followupAt = optionalDate(body.followupAt)

      const inserted = rowsOf(await drizzle.execute(sql`
        INSERT INTO ivila_visits
          (customer_id, property_id, agent_user_id, visit_at, result, note, offer_toman, followup_at)
        VALUES
          (${Number(customerId)}, ${propertyId}, ${agentUserId}, ${visitAt}, ${resultValue}, ${note}, ${offer}, ${followupAt})
        RETURNING id::text, customer_id::text, property_id, agent_user_id, visit_at, result, note, offer_toman,
                  followup_at, followup_done_at, created_at, updated_at
      `))[0]
      return Response.json({ ok: true, visit: inserted })
    }

    return jsonError('نوع عملیات مشخص نیست.')
  } catch (error) {
    console.error('[ivila crm] POST failed', error)
    return jsonError('ذخیره اطلاعات CRM انجام نشد.', 500, 'CRM_SAVE_FAILED')
  }
}

export async function PATCH(request: Request) {
  try {
    const { payload, user } = await auth(request)
    if (!user) return jsonError('نیاز به ورود دوباره است.', 401, 'UNAUTHORIZED')
    const drizzle = drizzleOf(payload)
    const body = await request.json().catch(() => null) as Record<string, unknown> | null
    const visitId = text(body?.visitId, 32)
    if (!visitId) return jsonError('شناسه بازدید مشخص نیست.')

    const visit = rowsOf(await drizzle.execute(sql`
      SELECT id::text, agent_user_id FROM ivila_visits WHERE id::text = ${visitId} LIMIT 1
    `))[0]
    if (!visit) return jsonError('بازدید پیدا نشد.', 404, 'VISIT_NOT_FOUND')
    if (!isAdmin(user) && String(visit.agent_user_id || '') !== idOf(user)) return jsonError('به این بازدید دسترسی نداری.', 403, 'FORBIDDEN')

    if (body?.action === 'complete_followup') {
      await drizzle.execute(sql`
        UPDATE ivila_visits SET followup_done_at = now(), updated_at = now() WHERE id::text = ${visitId}
      `)
      return Response.json({ ok: true })
    }

    return jsonError('عملیات ویرایش معتبر نیست.')
  } catch (error) {
    console.error('[ivila crm] PATCH failed', error)
    return jsonError('به‌روزرسانی پیگیری انجام نشد.', 500, 'CRM_UPDATE_FAILED')
  }
}
