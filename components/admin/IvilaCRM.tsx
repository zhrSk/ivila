'use client'

import {
  ArrowRight,
  Building2,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  Phone,
  Plus,
  Search,
  UserPlus,
  UserRound,
  X,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { effectiveUserRole } from '@/lib/ivila-user-role'
import styles from './IvilaAdmin.module.css'

type UserRole = 'admin' | 'agent'
type CurrentUser = { id?: string; role?: UserRole; name?: string; phone?: string; email?: string; username?: string }
type Agent = { id: string; name?: string; phone?: string }
type Customer = {
  id: string
  full_name: string
  phone: string
  budget_toman?: number | null
  desired_deal?: string | null
  desired_type?: string | null
  desired_area?: string | null
  notes?: string | null
  created_by_user_id: string
  created_at?: string
  updated_at?: string
  agent_name?: string | null
  agent_phone?: string | null
}
type Visit = {
  id: string
  customer_id: string
  property_id: string
  agent_user_id: string
  visit_at: string
  result: VisitResult
  note?: string | null
  offer_toman?: number | null
  followup_at?: string | null
  followup_done_at?: string | null
  customer_name?: string | null
  customer_phone?: string | null
  property_code?: string | null
  property_title?: string | null
  property_location?: string | null
  agent_name?: string | null
  agent_phone?: string | null
}
type VisitResult = 'planned' | 'visited' | 'interested' | 'offer' | 'not_interested' | 'cancelled'
type PropertyDoc = {
  id: string | number
  code?: string
  title?: string
  locationText?: string
  status?: string
}
type CRMResponse = {
  ok?: boolean
  currentUser?: CurrentUser
  customers?: Customer[]
  visits?: Visit[]
  agents?: Agent[]
  message?: string
}
type PropertiesResponse = { docs?: PropertyDoc[] }
type Tab = 'visits' | 'followups' | 'customers'

const resultLabels: Record<VisitResult, string> = {
  planned: 'برنامه‌ریزی شده',
  visited: 'بازدید انجام شد',
  interested: 'مشتری علاقه‌مند است',
  offer: 'پیشنهاد قیمت داده',
  not_interested: 'عدم تمایل',
  cancelled: 'لغو شد',
}

function faNumber(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === '') return '—'
  return Number(value).toLocaleString('fa-IR')
}

function formatMoney(value?: number | null) {
  if (!value) return '—'
  return `${faNumber(value)} تومان`
}

function formatDate(value?: string | null) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('fa-IR', {
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
  }).format(date)
}

function localDateTimeValue(date = new Date()) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
  return local.toISOString().slice(0, 16)
}

function isSameLocalDay(value: string | undefined, now = new Date()) {
  if (!value) return false
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return false
  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() && date.getDate() === now.getDate()
}

export default function IvilaCRM() {
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null)
  const [agents, setAgents] = useState<Agent[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [visits, setVisits] = useState<Visit[]>([])
  const [properties, setProperties] = useState<PropertyDoc[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [tab, setTab] = useState<Tab>('visits')
  const [query, setQuery] = useState('')
  const [agentFilter, setAgentFilter] = useState('all')
  const [customerOpen, setCustomerOpen] = useState(false)
  const [visitOpen, setVisitOpen] = useState(false)
  const [busy, setBusy] = useState(false)

  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [customerBudget, setCustomerBudget] = useState('')
  const [customerDeal, setCustomerDeal] = useState('')
  const [customerType, setCustomerType] = useState('')
  const [customerArea, setCustomerArea] = useState('')
  const [customerNotes, setCustomerNotes] = useState('')
  const [customerAgentId, setCustomerAgentId] = useState('')

  const [visitCustomerId, setVisitCustomerId] = useState('')
  const [visitPropertyId, setVisitPropertyId] = useState('')
  const [visitAt, setVisitAt] = useState(localDateTimeValue())
  const [visitResult, setVisitResult] = useState<VisitResult>('planned')
  const [visitOffer, setVisitOffer] = useState('')
  const [visitFollowup, setVisitFollowup] = useState('')
  const [visitNote, setVisitNote] = useState('')

  const isAdmin = effectiveUserRole(currentUser) === 'admin'

  async function loadCRM(agentId = agentFilter) {
    setError('')
    const suffix = agentId && agentId !== 'all' ? `?agentId=${encodeURIComponent(agentId)}` : ''
    const response = await fetch(`/api/ivila-crm${suffix}`, { credentials: 'include', cache: 'no-store' })
    if (response.status === 401) { window.location.assign('/login'); return }
    const result = await response.json().catch(() => null) as CRMResponse | null
    if (!response.ok) throw new Error(result?.message || 'CRM_LOAD_FAILED')
    setCurrentUser(result?.currentUser || null)
    setCustomers(result?.customers || [])
    setVisits(result?.visits || [])
    setAgents(result?.agents || [])
  }

  useEffect(() => {
    let alive = true
    async function initialLoad() {
      try {
        const [crmResponse, propertiesResponse] = await Promise.all([
          fetch('/api/ivila-crm', { credentials: 'include', cache: 'no-store' }),
          fetch('/api/properties?limit=300&sort=-updatedAt&depth=0', { credentials: 'include', cache: 'no-store' }),
        ])
        if (crmResponse.status === 401 || propertiesResponse.status === 401) { window.location.assign('/login'); return }
        const crm = await crmResponse.json().catch(() => null) as CRMResponse | null
        const propertyData = await propertiesResponse.json().catch(() => null) as PropertiesResponse | null
        if (!crmResponse.ok) throw new Error(crm?.message || 'CRM_LOAD_FAILED')
        if (!alive) return
        setCurrentUser(crm?.currentUser || null)
        setCustomers(crm?.customers || [])
        setVisits(crm?.visits || [])
        setAgents(crm?.agents || [])
        const active = (propertyData?.docs || []).filter((property) => property.status === 'published')
        setProperties(active)

        const params = new URLSearchParams(window.location.search)
        const requestedProperty = params.get('property') || ''
        if (requestedProperty && active.some((property) => String(property.id) === requestedProperty)) {
          setVisitPropertyId(requestedProperty)
          setVisitOpen(true)
        }
      } catch (err) {
        if (alive) setError(err instanceof Error && err.message !== 'CRM_LOAD_FAILED' ? err.message : 'دریافت اطلاعات مشتری‌ها و بازدیدها انجام نشد.')
      } finally {
        if (alive) setLoading(false)
      }
    }
    void initialLoad()
    return () => { alive = false }
  }, [])

  const filteredCustomers = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return customers
    return customers.filter((customer) => [customer.full_name, customer.phone, customer.desired_area, customer.agent_name]
      .filter(Boolean).some((value) => String(value).toLowerCase().includes(q)))
  }, [customers, query])

  const filteredVisits = useMemo(() => {
    const q = query.trim().toLowerCase()
    const base = tab === 'followups'
      ? visits.filter((visit) => visit.followup_at && !visit.followup_done_at)
      : visits
    if (!q) return base
    return base.filter((visit) => [
      visit.customer_name, visit.customer_phone, visit.property_code, visit.property_title,
      visit.property_location, visit.agent_name,
    ].filter(Boolean).some((value) => String(value).toLowerCase().includes(q)))
  }, [visits, query, tab])

  const stats = useMemo(() => {
    const now = new Date()
    return {
      customers: customers.length,
      today: visits.filter((visit) => isSameLocalDay(visit.visit_at, now)).length,
      followups: visits.filter((visit) => visit.followup_at && !visit.followup_done_at).length,
      overdue: visits.filter((visit) => visit.followup_at && !visit.followup_done_at && new Date(visit.followup_at).getTime() < now.getTime()).length,
    }
  }, [customers, visits])

  function resetCustomerForm() {
    setCustomerName(''); setCustomerPhone(''); setCustomerBudget(''); setCustomerDeal(''); setCustomerType('');
    setCustomerArea(''); setCustomerNotes(''); setCustomerAgentId(agentFilter !== 'all' ? agentFilter : '')
  }

  async function saveCustomer(event: React.FormEvent) {
    event.preventDefault()
    setBusy(true); setError(''); setSuccess('')
    try {
      const response = await fetch('/api/ivila-crm', {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind: 'customer', fullName: customerName, phone: customerPhone,
          budgetToman: customerBudget || null, desiredDeal: customerDeal || null,
          desiredType: customerType || null, desiredArea: customerArea || null,
          notes: customerNotes || null, agentUserId: customerAgentId || null,
        }),
      })
      const result = await response.json().catch(() => null) as { message?: string; customer?: Customer } | null
      if (!response.ok) throw new Error(result?.message || 'ذخیره مشتری انجام نشد.')
      await loadCRM(agentFilter)
      if (result?.customer?.id) setVisitCustomerId(String(result.customer.id))
      setCustomerOpen(false); resetCustomerForm(); setSuccess('مشتری ذخیره شد و آماده ثبت بازدید است.')
    } catch (err) { setError(err instanceof Error ? err.message : 'ذخیره مشتری انجام نشد.') }
    finally { setBusy(false) }
  }

  async function saveVisit(event: React.FormEvent) {
    event.preventDefault()
    setBusy(true); setError(''); setSuccess('')
    try {
      const response = await fetch('/api/ivila-crm', {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind: 'visit', customerId: visitCustomerId, propertyId: visitPropertyId,
          visitAt: new Date(visitAt).toISOString(), result: visitResult,
          offerToman: visitOffer || null,
          followupAt: visitFollowup ? new Date(visitFollowup).toISOString() : null,
          note: visitNote || null,
        }),
      })
      const result = await response.json().catch(() => null) as { message?: string } | null
      if (!response.ok) throw new Error(result?.message || 'ثبت بازدید انجام نشد.')
      await loadCRM(agentFilter)
      setVisitOpen(false); setVisitResult('planned'); setVisitOffer(''); setVisitFollowup(''); setVisitNote('');
      setVisitAt(localDateTimeValue()); setSuccess('بازدید و پیگیری مشتری ثبت شد.')
    } catch (err) { setError(err instanceof Error ? err.message : 'ثبت بازدید انجام نشد.') }
    finally { setBusy(false) }
  }

  async function completeFollowup(visitId: string) {
    setBusy(true); setError('')
    try {
      const response = await fetch('/api/ivila-crm', {
        method: 'PATCH', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visitId, action: 'complete_followup' }),
      })
      const result = await response.json().catch(() => null) as { message?: string } | null
      if (!response.ok) throw new Error(result?.message || 'ثبت انجام پیگیری ناموفق بود.')
      await loadCRM(agentFilter)
      setSuccess('پیگیری انجام‌شده ثبت شد.')
    } catch (err) { setError(err instanceof Error ? err.message : 'ثبت انجام پیگیری ناموفق بود.') }
    finally { setBusy(false) }
  }

  async function changeAgent(value: string) {
    setAgentFilter(value); setLoading(true)
    try { await loadCRM(value) }
    catch { setError('فیلتر مشاور بارگذاری نشد.') }
    finally { setLoading(false) }
  }

  return (
    <main className={styles.standaloneAdmin} dir="rtl">
      <header className={styles.simpleTopbar}>
        <a href="/admin"><ArrowRight size={18}/> بازگشت به داشبورد</a>
        <strong>مشتری‌ها و بازدیدها</strong>
      </header>

      <section className={styles.crmShell}>
        <header className={styles.crmHero}>
          <div><span className={styles.eyebrow}>CRM املاک</span><h1>مشتری، بازدید و پیگیری</h1><p>بعد از هر تماس یا بازدید، نتیجه و پیگیری بعدی را همین‌جا ثبت کن.</p></div>
          <div className={styles.crmHeroActions}>
            <button type="button" onClick={() => { resetCustomerForm(); setCustomerOpen(true) }}><UserPlus size={18}/> مشتری جدید</button>
            <button type="button" className={styles.crmPrimaryAction} onClick={() => setVisitOpen(true)}><Plus size={18}/> ثبت بازدید</button>
          </div>
        </header>

        {error && <div className={styles.errorBox}>{error}</div>}
        {success && <div className={styles.successBox}>{success}</div>}

        <section className={styles.crmStats}>
          <article><UserRound size={20}/><div><span>{isAdmin ? 'مشتری‌ها' : 'مشتری‌های من'}</span><strong>{loading ? '—' : faNumber(stats.customers)}</strong></div></article>
          <article><CalendarDays size={20}/><div><span>بازدید امروز</span><strong>{loading ? '—' : faNumber(stats.today)}</strong></div></article>
          <article><Clock3 size={20}/><div><span>پیگیری باز</span><strong>{loading ? '—' : faNumber(stats.followups)}</strong></div></article>
          <article className={stats.overdue ? styles.crmStatAlert : ''}><CheckCircle2 size={20}/><div><span>پیگیری عقب‌افتاده</span><strong>{loading ? '—' : faNumber(stats.overdue)}</strong></div></article>
        </section>

        {(customerOpen || visitOpen) && <section className={styles.crmComposer}>
          {customerOpen && <form className={styles.crmFormCard} onSubmit={saveCustomer}>
            <div className={styles.crmFormTitle}><div><UserPlus size={20}/><div><strong>مشتری جدید</strong><span>اطلاعات پایه برای پیگیری‌های بعدی</span></div></div><button type="button" onClick={() => setCustomerOpen(false)}><X size={18}/></button></div>
            <div className={styles.crmFields}>
              <label><span>نام مشتری *</span><input required value={customerName} onChange={(e)=>setCustomerName(e.target.value)} placeholder="نام و نام خانوادگی"/></label>
              <label><span>موبایل *</span><input required dir="ltr" inputMode="tel" value={customerPhone} onChange={(e)=>setCustomerPhone(e.target.value)} placeholder="0912..."/></label>
              <label><span>بودجه تقریبی</span><input dir="ltr" inputMode="numeric" value={customerBudget} onChange={(e)=>setCustomerBudget(e.target.value)} placeholder="تومان"/></label>
              <label><span>نوع معامله</span><select value={customerDeal} onChange={(e)=>setCustomerDeal(e.target.value)}><option value="">مهم نیست</option><option value="sale">خرید</option><option value="rent">اجاره</option></select></label>
              <label><span>نوع ملک</span><select value={customerType} onChange={(e)=>setCustomerType(e.target.value)}><option value="">مهم نیست</option><option value="villa">ویلا</option><option value="land">زمین</option><option value="apartment">آپارتمان</option></select></label>
              <label><span>محدوده مدنظر</span><input value={customerArea} onChange={(e)=>setCustomerArea(e.target.value)} placeholder="مثلاً رویان، سیسنگان..."/></label>
              {isAdmin && <label><span>مشاور مسئول</span><select value={customerAgentId} onChange={(e)=>setCustomerAgentId(e.target.value)}><option value="">خود ادمین</option>{agents.map((agent)=><option key={agent.id} value={agent.id}>{agent.name || agent.phone || 'مشاور'}</option>)}</select></label>}
              <label className={styles.crmSpan2}><span>یادداشت</span><textarea rows={3} value={customerNotes} onChange={(e)=>setCustomerNotes(e.target.value)} placeholder="نیاز مشتری، شرایط تماس یا توضیح کوتاه..."/></label>
            </div>
            <button className={styles.crmSubmit} disabled={busy}>{busy ? 'در حال ذخیره...' : 'ذخیره مشتری'}</button>
          </form>}

          {visitOpen && <form className={styles.crmFormCard} onSubmit={saveVisit}>
            <div className={styles.crmFormTitle}><div><CalendarDays size={20}/><div><strong>ثبت بازدید</strong><span>نتیجه و پیگیری بعدی را ثبت کن</span></div></div><button type="button" onClick={() => setVisitOpen(false)}><X size={18}/></button></div>
            {customers.length === 0 && <div className={styles.crmInlineNotice}>اول یک مشتری ثبت کن؛ بعد می‌توانی بازدید را به او متصل کنی.</div>}
            <div className={styles.crmFields}>
              <label><span>مشتری *</span><select required value={visitCustomerId} onChange={(e)=>setVisitCustomerId(e.target.value)}><option value="">انتخاب مشتری</option>{customers.map((customer)=><option key={customer.id} value={customer.id}>{customer.full_name} · {customer.phone}</option>)}</select></label>
              <label><span>فایل ملک *</span><select required value={visitPropertyId} onChange={(e)=>setVisitPropertyId(e.target.value)}><option value="">انتخاب فایل فعال</option>{properties.map((property)=><option key={String(property.id)} value={String(property.id)}>{property.code || 'بدون کد'} · {property.title || property.locationText || 'ملک'}</option>)}</select></label>
              <label><span>زمان بازدید</span><input required type="datetime-local" value={visitAt} onChange={(e)=>setVisitAt(e.target.value)}/></label>
              <label><span>نتیجه</span><select value={visitResult} onChange={(e)=>setVisitResult(e.target.value as VisitResult)}>{Object.entries(resultLabels).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
              <label><span>پیشنهاد مشتری</span><input dir="ltr" inputMode="numeric" value={visitOffer} onChange={(e)=>setVisitOffer(e.target.value)} placeholder="تومان"/></label>
              <label><span>پیگیری بعدی</span><input type="datetime-local" value={visitFollowup} onChange={(e)=>setVisitFollowup(e.target.value)}/></label>
              <label className={styles.crmSpan2}><span>نتیجه / توضیحات</span><textarea rows={3} value={visitNote} onChange={(e)=>setVisitNote(e.target.value)} placeholder="نظر مشتری، نکته مهم، دلیل عدم تمایل و..."/></label>
            </div>
            <button className={styles.crmSubmit} disabled={busy || customers.length === 0}>{busy ? 'در حال ذخیره...' : 'ثبت بازدید'}</button>
          </form>}
        </section>}

        <section className={styles.crmPanel}>
          <div className={styles.crmToolbar}>
            <div className={styles.crmTabs}>
              <button className={tab === 'visits' ? styles.crmTabActive : ''} onClick={()=>setTab('visits')}>بازدیدها</button>
              <button className={tab === 'followups' ? styles.crmTabActive : ''} onClick={()=>setTab('followups')}>پیگیری‌ها <em>{faNumber(stats.followups)}</em></button>
              <button className={tab === 'customers' ? styles.crmTabActive : ''} onClick={()=>setTab('customers')}>مشتری‌ها</button>
            </div>
            <div className={styles.crmFilters}>
              <label><Search size={17}/><input value={query} onChange={(e)=>setQuery(e.target.value)} placeholder="نام، موبایل، کد فایل..."/></label>
              {isAdmin && <select value={agentFilter} onChange={(e)=>void changeAgent(e.target.value)}><option value="all">همه مشاورها</option>{agents.map((agent)=><option key={agent.id} value={agent.id}>{agent.name || agent.phone || 'مشاور'}</option>)}</select>}
            </div>
          </div>

          {loading && <div className={styles.empty}>در حال دریافت اطلاعات...</div>}

          {!loading && tab === 'customers' && <div className={styles.crmCustomerGrid}>
            {filteredCustomers.length === 0 && <div className={styles.empty}>مشتری‌ای مطابق این جستجو وجود ندارد.</div>}
            {filteredCustomers.map((customer)=><article key={customer.id} className={styles.crmCustomerCard}>
              <div className={styles.crmCustomerHead}><div className={styles.crmAvatar}>{customer.full_name.slice(0,1)}</div><div><strong>{customer.full_name}</strong><a href={`tel:${customer.phone}`} dir="ltr"><Phone size={14}/>{customer.phone}</a></div></div>
              <div className={styles.crmCustomerFacts}>
                <span><CircleDollarSign size={14}/>بودجه: {formatMoney(customer.budget_toman)}</span>
                <span><Building2 size={14}/>{customer.desired_area || 'محدوده ثبت نشده'}</span>
              </div>
              {isAdmin && <small className={styles.crmAgentLine}>مشاور: {customer.agent_name || customer.agent_phone || 'ادمین / نامشخص'}</small>}
              {customer.notes && <p>{customer.notes}</p>}
              <button type="button" onClick={()=>{ setVisitCustomerId(customer.id); setVisitOpen(true); window.scrollTo({ top: 0, behavior: 'smooth' }) }}><CalendarDays size={15}/> ثبت بازدید برای این مشتری</button>
            </article>)}
          </div>}

          {!loading && tab !== 'customers' && <div className={styles.crmVisitList}>
            {filteredVisits.length === 0 && <div className={styles.empty}>{tab === 'followups' ? 'پیگیری بازی وجود ندارد.' : 'هنوز بازدیدی ثبت نشده.'}</div>}
            {filteredVisits.map((visit)=>{
              const overdue = Boolean(visit.followup_at && !visit.followup_done_at && new Date(visit.followup_at).getTime() < Date.now())
              return <article key={visit.id} className={`${styles.crmVisitCard} ${overdue ? styles.crmVisitOverdue : ''}`}>
                <div className={styles.crmVisitMain}>
                  <div className={styles.crmVisitTitle}><span className={`${styles.crmResultBadge} ${styles[`crmResult_${visit.result}`]}`}>{resultLabels[visit.result] || visit.result}</span><strong>{visit.property_code || 'بدون کد'} · {visit.property_title || visit.property_location || 'فایل ملک'}</strong></div>
                  <div className={styles.crmVisitMeta}><span><UserRound size={14}/>{visit.customer_name || 'مشتری'}</span>{visit.customer_phone && <a href={`tel:${visit.customer_phone}`} dir="ltr"><Phone size={14}/>{visit.customer_phone}</a>}<span><CalendarDays size={14}/>{formatDate(visit.visit_at)}</span></div>
                  {visit.note && <p>{visit.note}</p>}
                  {visit.offer_toman ? <div className={styles.crmOffer}><CircleDollarSign size={15}/> پیشنهاد: {formatMoney(visit.offer_toman)}</div> : null}
                  {isAdmin && <small className={styles.crmAgentLine}>مشاور: {visit.agent_name || visit.agent_phone || 'نامشخص'}</small>}
                </div>
                <div className={styles.crmFollowupBox}>
                  <small>پیگیری بعدی</small>
                  <strong>{visit.followup_at ? formatDate(visit.followup_at) : 'ثبت نشده'}</strong>
                  {visit.followup_at && !visit.followup_done_at && <button type="button" disabled={busy} onClick={()=>void completeFollowup(visit.id)}><CheckCircle2 size={15}/> انجام شد</button>}
                  {visit.followup_done_at && <span className={styles.crmDone}><CheckCircle2 size={14}/> انجام شده</span>}
                </div>
              </article>
            })}
          </div>}
        </section>
      </section>
    </main>
  )
}
