'use client'

import {
  Archive,
  Building2,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  ExternalLink,
  FilePlus2,
  Home,
  LogOut,
  MapPin,
  MessageSquareWarning,
  Navigation,
  Pencil,
  Phone,
  Search,
  UserRound,
  UsersRound,
  Waves,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { effectiveUserRole } from '@/lib/ivila-user-role'
import styles from './IvilaAdmin.module.css'

type PropertyStatus = 'draft' | 'published' | 'sold' | 'rented' | 'archived'
type UserRole = 'admin' | 'agent'
type ViewMode = 'all' | 'mine' | 'active' | 'review'
type ReviewStatus = 'pending' | 'changes_requested' | 'approved' | 'rejected'

type PropertyDoc = {
  id: string | number
  slug?: string
  code?: string
  title?: string
  deal?: 'sale' | 'rent'
  type?: string
  lifestyle?: string
  locationText?: string
  priceDisplay?: string
  salePriceToman?: number
  depositToman?: number
  monthlyRentToman?: number
  status?: PropertyStatus
  createdByUserId?: string | number
  ownerPhone?: string
  ownerName?: string
  ownerNotes?: string
  coordinates?: [number, number]
  updatedAt?: string
  reviewStatus?: ReviewStatus
  reviewNote?: string
  reviewedAt?: string
}


type UserInfo = {
  id?: string | number
  name?: string
  username?: string
  role?: UserRole
  phone?: string
  email?: string
}

type MeResponse = { user?: UserInfo | null }
type PropertiesResponse = { docs?: PropertyDoc[]; totalDocs?: number }
type UsersResponse = { docs?: UserInfo[]; totalDocs?: number }

const statusLabels: Record<PropertyStatus, string> = {
  draft: 'پیش‌نویس', published: 'منتشر شده', sold: 'فروخته شده', rented: 'اجاره داده شده', archived: 'آرشیو',
}
const typeLabels: Record<string, string> = { villa: 'ویلا', land: 'زمین', apartment: 'آپارتمان' }
const reviewLabels: Record<ReviewStatus, string> = {
  pending: 'در انتظار بررسی',
  changes_requested: 'نیاز به اصلاح',
  approved: 'تأیید شده',
  rejected: 'رد شده',
}

function faNumber(value: number | string | undefined) {
  if (value === undefined || value === null || value === '') return '—'
  return Number(value).toLocaleString('fa-IR')
}
function propertyPrice(property: PropertyDoc) {
  if (property.priceDisplay) return property.priceDisplay
  if (property.deal === 'rent') {
    const deposit = property.depositToman ? `${faNumber(property.depositToman)} ودیعه` : ''
    const rent = property.monthlyRentToman ? `${faNumber(property.monthlyRentToman)} اجاره` : ''
    return [deposit, rent].filter(Boolean).join(' + ') || 'توافقی'
  }
  return property.salePriceToman ? `${faNumber(property.salePriceToman)} تومان` : 'توافقی'
}
function mapsUrl(property: PropertyDoc) {
  const [lng, lat] = property.coordinates || []
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return ''
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`
}
function neshanUrl(property: PropertyDoc) {
  const [lng, lat] = property.coordinates || []
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return ''
  return `https://maps.neshan.org/@${lat},${lng},17.0z,0.0p`
}

export default function IvilaAdminDashboard() {
  const [user, setUser] = useState<UserInfo | null>(null)
  const [properties, setProperties] = useState<PropertyDoc[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<'all' | PropertyStatus>('all')
  const [viewMode, setViewMode] = useState<ViewMode>('all')
  const [teamUsers, setTeamUsers] = useState<UserInfo[]>([])
  const [agentFilter, setAgentFilter] = useState('all')

  useEffect(() => {
    let alive = true
    async function load() {
      try {
        const [meResponse, propertiesResponse] = await Promise.all([
          fetch('/api/users/me', { credentials: 'include', cache: 'no-store' }),
          fetch('/api/properties?limit=200&sort=-updatedAt&depth=0', { credentials: 'include', cache: 'no-store' }),
        ])
        if (meResponse.status === 401 || propertiesResponse.status === 401) { window.location.assign('/login'); return }
        if (!meResponse.ok || !propertiesResponse.ok) throw new Error('API_NOT_READY')
        const me = await meResponse.json() as MeResponse
        const data = await propertiesResponse.json() as PropertiesResponse
        if (!alive) return
        const current = me.user || null
        let users: UserInfo[] = []
        if (effectiveUserRole(current) === 'admin') {
          const usersResponse = await fetch('/api/users?limit=200&sort=name&depth=0', {
            credentials: 'include',
            cache: 'no-store',
          })
          if (usersResponse.ok) {
            const usersData = await usersResponse.json() as UsersResponse
            users = usersData.docs || []
          }
        }
        if (!alive) return
        setUser(current)
        setViewMode(effectiveUserRole(current) === 'agent' ? 'mine' : 'all')
        setProperties(data.docs || [])
        setTeamUsers(users)
      } catch { if (alive) setError('دریافت اطلاعات پنل انجام نشد. یک‌بار صفحه را Refresh کن.') }
      finally { if (alive) setLoading(false) }
    }
    void load(); return () => { alive = false }
  }, [])

  const creatorById = useMemo(() => {
    const map = new Map<string, UserInfo>()
    teamUsers.forEach((member) => {
      if (member.id !== undefined && member.id !== null) map.set(String(member.id), member)
    })
    return map
  }, [teamUsers])

  const agents = useMemo(
    () => teamUsers.filter((member) => member.role === 'agent'),
    [teamUsers],
  )

  const counts = useMemo(() => {
    const value = { published: 0, draft: 0, sold: 0, rented: 0, archived: 0 }
    properties.forEach((property) => { if (property.status && property.status in value) value[property.status] += 1 })
    return value
  }, [properties])

  const pendingReviewCount = useMemo(() => properties.filter((property) => {
    if (property.status !== 'draft') return false
    const creator = creatorById.get(String(property.createdByUserId || ''))
    return creator?.role === 'agent' && (!property.reviewStatus || property.reviewStatus === 'pending')
  }).length, [properties, creatorById])

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    const myId = String(user?.id ?? '')
    return properties.filter((property) => {
      const creatorId = String(property.createdByUserId || '')
      if (viewMode === 'mine' && creatorId !== myId) return false
      if (viewMode === 'active' && property.status !== 'published') return false
      if (viewMode === 'review') {
        const creator = creatorById.get(creatorId)
        if (property.status !== 'draft' || creator?.role !== 'agent' || (property.reviewStatus && property.reviewStatus !== 'pending')) return false
      }
      if (status !== 'all' && property.status !== status) return false
      if (agentFilter !== 'all' && creatorId !== agentFilter) return false
      if (!normalized) return true
      const creator = creatorById.get(creatorId)
      return [
        property.code,
        property.title,
        property.locationText,
        property.type,
        property.ownerName,
        property.ownerPhone,
        creator?.name,
        creator?.phone,
      ].filter(Boolean).some((item) => String(item).toLowerCase().includes(normalized))
    })
  }, [properties, query, status, viewMode, user?.id, agentFilter, creatorById])

  const isAdmin = effectiveUserRole(user) === 'admin'

  return (
    <main className={styles.page} dir="rtl">
      <aside className={styles.sidebar}>
        <a className={styles.brand} href="/admin"><span className={styles.brandMark}>م</span><span>املاک شمال</span></a>
        <nav className={styles.nav}>
          <a className={`${styles.navItem} ${styles.navActive}`} href="/admin"><Home size={19}/><span>داشبورد</span></a>
          <a className={styles.navItem} href="/admin/new"><Building2 size={19}/><span>ثبت فایل</span></a>
          <a className={styles.navItem} href="/admin/crm"><CalendarDays size={19}/><span>بازدیدها</span></a>
          <a className={styles.navItem} href="/admin/profile"><UserRound size={19}/><span>پروفایل من</span></a>
          {isAdmin && <a className={styles.navItem} href="/admin/agents"><UsersRound size={19}/><span>مشاورها</span></a>}
          <a className={`${styles.navItem} ${styles.siteNavItem}`} href="/" target="_blank" rel="noreferrer"><ExternalLink size={19}/><span>مشاهده سایت</span></a>
        </nav>
        <div className={styles.sidebarFooter}>
          <div className={styles.userMini}><div className={styles.avatar}>{(user?.name || user?.phone || user?.username || 'i').slice(0,1)}</div><div><strong>{user?.name || 'کاربر پنل'}</strong><span>{isAdmin ? 'ادمین اصلی' : 'مشاور'}</span></div></div>
          <a className={styles.logout} href="/logout"><LogOut size={17}/> خروج</a>
        </div>
      </aside>

      <section className={styles.content}>
        <header className={styles.header}>
          <div><span className={styles.eyebrow}>{isAdmin ? 'مدیریت مرکزی املاک' : 'پنل مشاور املاک'}</span><h1>{isAdmin ? 'داشبورد مدیریت' : 'فایل‌های من و فایل‌های فعال'}</h1><p>{isAdmin ? 'پیش‌نویس‌های مشاورها را بررسی، ویرایش و منتشر کن.' : 'فایل جدید را سر ملک ثبت کن؛ انتشار نهایی با ادمین اصلی است.'}</p></div>
          <a className={styles.primaryButton} href="/admin/new"><FilePlus2 size={19}/> ثبت فایل جدید</a>
        </header>
        {error && <div className={styles.errorBox}>{error}</div>}

        <section className={styles.statsGrid}>
          <article className={styles.statCard}><div className={`${styles.statIcon} ${styles.seaIcon}`}><Waves size={21}/></div><div><span>فایل‌های قابل مشاهده</span><strong>{loading ? '—' : faNumber(properties.length)}</strong></div></article>
          <article className={styles.statCard}><div className={`${styles.statIcon} ${styles.greenIcon}`}><CheckCircle2 size={21}/></div><div><span>فعال</span><strong>{loading ? '—' : faNumber(counts.published)}</strong></div></article>
          <article className={styles.statCard}><div className={`${styles.statIcon} ${styles.orangeIcon}`}><Clock3 size={21}/></div><div><span>{isAdmin ? 'منتظر بررسی' : 'پیش‌نویس'}</span><strong>{loading ? '—' : faNumber(isAdmin ? pendingReviewCount : counts.draft)}</strong></div></article>
          <article className={styles.statCard}><div className={`${styles.statIcon} ${styles.grayIcon}`}><Archive size={21}/></div><div><span>مختومه</span><strong>{loading ? '—' : faNumber(counts.sold + counts.rented + counts.archived)}</strong></div></article>
        </section>

        <section className={styles.panel}>
          <div className={styles.panelHeader}>
            <div><h2>فایل‌ها</h2><span>{faNumber(filtered.length)} مورد در این نمایش</span></div>
            <div className={styles.filters}>
              <label className={styles.searchBox}><Search size={18}/><input value={query} onChange={(e)=>setQuery(e.target.value)} placeholder={isAdmin ? 'کد، عنوان، مالک، محدوده یا مشاور...' : 'کد، عنوان، مالک یا محدوده...'}/></label>
              <select value={status} onChange={(e)=>setStatus(e.target.value as typeof status)}><option value="all">همه وضعیت‌ها</option><option value="published">منتشر شده</option><option value="draft">پیش‌نویس</option><option value="sold">فروخته شده</option><option value="rented">اجاره داده شده</option><option value="archived">آرشیو</option></select>
              {isAdmin && <select value={agentFilter} onChange={(e) => { setAgentFilter(e.target.value); if (e.target.value !== 'all') setViewMode('all') }} aria-label="فیلتر مشاور"><option value="all">همه مشاورها</option>{agents.map((agent) => <option key={String(agent.id)} value={String(agent.id)}>{agent.name || agent.phone || 'مشاور بدون نام'}</option>)}</select>}
            </div>
          </div>

          <div className={styles.viewTabs}>
            {isAdmin && <button className={viewMode === 'all' ? styles.viewTabActive : ''} onClick={()=>setViewMode('all')}>همه فایل‌ها</button>}
            {isAdmin && <button className={viewMode === 'review' ? styles.viewTabActive : ''} onClick={()=>{ setViewMode('review'); setStatus('all'); setAgentFilter('all') }}>صف بررسی <span className={styles.tabCount}>{faNumber(pendingReviewCount)}</span></button>}
            <button className={viewMode === 'mine' ? styles.viewTabActive : ''} onClick={()=>{ setViewMode('mine'); setAgentFilter('all') }}>فایل‌های من</button>
            <button className={viewMode === 'active' ? styles.viewTabActive : ''} onClick={()=>setViewMode('active')}>فایل‌های فعال</button>
          </div>

          <div className={styles.internalPropertyList}>
            {loading && <div className={styles.empty}>در حال دریافت فایل‌ها...</div>}
            {!loading && filtered.length === 0 && <div className={styles.empty}>فایلی مطابق این فیلتر وجود ندارد.</div>}
            {!loading && filtered.map((property) => {
              const canEdit = isAdmin || (String(property.createdByUserId || '') === String(user?.id || '') && property.status === 'draft')
              const gmap = mapsUrl(property); const neshan = neshanUrl(property)
              const creator = creatorById.get(String(property.createdByUserId || ''))
              return <article className={styles.internalPropertyCard} key={property.id}>
                <div className={styles.internalPropertyTop}>
                  <div><span className={styles.code}>{property.code || 'بدون کد'}</span><h3>{property.title || 'بدون عنوان'}</h3><small>{typeLabels[property.type || ''] || property.type || 'ملک'} · {property.deal === 'rent' ? 'اجاره' : 'فروش'}</small></div>
                  <span className={`${styles.statusBadge} ${styles[`status_${property.status || 'draft'}`]}`}>{statusLabels[property.status || 'draft']}</span>
                </div>
                {isAdmin && <div className={styles.creatorLine}><UserRound size={15}/><span>ثبت‌کننده:</span><strong>{creator?.name || (property.createdByUserId ? 'کاربر حذف‌شده / نامشخص' : 'فایل قدیمی بدون ثبت‌کننده')}</strong>{creator?.phone && <em dir="ltr">{creator.phone}</em>}</div>}
                {(property.reviewStatus || creator?.role === 'agent') && <div className={`${styles.reviewStrip} ${styles[`review_${property.reviewStatus || 'pending'}`]}`}><div><MessageSquareWarning size={15}/><strong>{reviewLabels[property.reviewStatus || 'pending']}</strong></div>{property.reviewNote && <p>{property.reviewNote}</p>}</div>}
                <div className={styles.internalFacts}>
                  <span><MapPin size={15}/>{property.locationText || '—'}</span>
                  <span><CircleDollarSign size={15}/>{propertyPrice(property)}</span>
                </div>
                <div className={styles.ownerPrivateBox}>
                  <div className={styles.ownerPrivateHead}><strong>اطلاعات داخلی مالک</strong><span>فقط تیم داخلی</span></div>
                  <div className={styles.ownerPrivateGrid}>
                    <div className={styles.ownerPrivateItem}><small>نام مالک</small><strong><UserRound size={15}/>{property.ownerName || 'ثبت نشده'}</strong></div>
                    <div className={styles.ownerPrivateItem}><small>شماره مالک</small>{property.ownerPhone ? <a href={`tel:${property.ownerPhone}`} dir="ltr"><Phone size={15}/>{property.ownerPhone}</a> : <strong>ثبت نشده</strong>}</div>
                  </div>
                  {property.ownerNotes && <div className={styles.ownerPrivateNotes}><small>یادداشت داخلی</small><p>{property.ownerNotes}</p></div>}
                </div>
                <div className={styles.internalActions}>
                  {canEdit && <a className={styles.internalActionPrimary} href={`/admin/edit/${property.id}`}><Pencil size={15}/> ویرایش فایل</a>}
                  {property.status === 'published' && <a href={`/admin/crm?property=${property.id}`}><CalendarDays size={15}/> ثبت بازدید</a>}
                  {gmap && <a href={gmap} target="_blank" rel="noreferrer"><Navigation size={15}/> Google Maps</a>}
                  {neshan && <a href={neshan} target="_blank" rel="noreferrer"><MapPin size={15}/> نشان</a>}
                  {property.status === 'published' && property.slug && <a href={`/properties/${property.slug}`} target="_blank" rel="noreferrer"><ExternalLink size={15}/> صفحه عمومی</a>}
                </div>
              </article>
            })}
          </div>
        </section>
      </section>
    </main>
  )
}
