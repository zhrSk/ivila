'use client'

import {
  Archive,
  Building2,
  CheckCircle2,
  ChevronLeft,
  CircleDollarSign,
  Clock3,
  ExternalLink,
  FilePlus2,
  Home,
  LogOut,
  MapPin,
  Search,
  Waves,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import styles from './IvilaAdmin.module.css'

type PropertyStatus = 'draft' | 'published' | 'sold' | 'rented' | 'archived'

type PropertyDoc = {
  id: string | number
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
  updatedAt?: string
}

type MeResponse = {
  user?: {
    id?: string | number
    name?: string
    email?: string
  } | null
}

type PropertiesResponse = {
  docs?: PropertyDoc[]
  totalDocs?: number
}

const statusLabels: Record<PropertyStatus, string> = {
  draft: 'پیش‌نویس',
  published: 'منتشر شده',
  sold: 'فروخته شده',
  rented: 'اجاره داده شده',
  archived: 'آرشیو',
}

const typeLabels: Record<string, string> = {
  villa: 'ویلا',
  land: 'زمین',
  apartment: 'آپارتمان',
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

export default function IvilaAdminDashboard() {
  const [user, setUser] = useState<MeResponse['user']>(null)
  const [properties, setProperties] = useState<PropertyDoc[]>([])
  const [totalDocs, setTotalDocs] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<'all' | PropertyStatus>('all')

  useEffect(() => {
    let alive = true

    async function load() {
      try {
        const [meResponse, propertiesResponse] = await Promise.all([
          fetch('/api/users/me', { credentials: 'include', cache: 'no-store' }),
          fetch('/api/properties?limit=100&sort=-updatedAt&depth=0', {
            credentials: 'include',
            cache: 'no-store',
          }),
        ])

        if (meResponse.status === 401 || propertiesResponse.status === 401) {
          window.location.assign('/ivila-login')
          return
        }

        if (!meResponse.ok || !propertiesResponse.ok) {
          throw new Error('API_NOT_READY')
        }

        const me = (await meResponse.json()) as MeResponse
        const propertyData = (await propertiesResponse.json()) as PropertiesResponse

        if (!alive) return
        setUser(me.user || null)
        setProperties(propertyData.docs || [])
        setTotalDocs(propertyData.totalDocs || propertyData.docs?.length || 0)
      } catch {
        if (alive) setError('دریافت اطلاعات پنل انجام نشد. یک‌بار صفحه را Refresh کن.')
      } finally {
        if (alive) setLoading(false)
      }
    }

    void load()
    return () => {
      alive = false
    }
  }, [])

  const counts = useMemo(() => {
    const value = {
      published: 0,
      draft: 0,
      sold: 0,
      rented: 0,
      archived: 0,
    }
    properties.forEach((property) => {
      if (property.status && property.status in value) value[property.status] += 1
    })
    return value
  }, [properties])

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    return properties.filter((property) => {
      if (status !== 'all' && property.status !== status) return false
      if (!normalized) return true
      return [property.code, property.title, property.locationText, property.type]
        .filter(Boolean)
        .some((item) => String(item).toLowerCase().includes(normalized))
    })
  }, [properties, query, status])

  return (
    <main className={styles.page} dir="rtl">
      <aside className={styles.sidebar}>
        <a className={styles.brand} href="/admin" aria-label="ivila admin">
          <span className={styles.brandMark}>i</span>
          <span>ivila</span>
        </a>

        <nav className={styles.nav}>
          <a className={`${styles.navItem} ${styles.navActive}`} href="/admin">
            <Home size={19} />
            <span>داشبورد</span>
          </a>
          <a className={styles.navItem} href="/admin/new">
            <Building2 size={19} />
            <span>فایل‌های املاک</span>
          </a>
          <a className={styles.navItem} href="/" target="_blank" rel="noreferrer">
            <ExternalLink size={19} />
            <span>مشاهده سایت</span>
          </a>
        </nav>

        <div className={styles.sidebarFooter}>
          <div className={styles.userMini}>
            <div className={styles.avatar}>{(user?.name || user?.email || 'A').slice(0, 1)}</div>
            <div>
              <strong>{user?.name || 'مدیر ivila'}</strong>
              <span>{user?.email || '...'}</span>
            </div>
          </div>
          <a className={styles.logout} href="/ivila-logout">
            <LogOut size={17} /> خروج
          </a>
        </div>
      </aside>

      <section className={styles.content}>
        <header className={styles.header}>
          <div>
            <span className={styles.eyebrow}>مدیریت املاک رویان</span>
            <h1>داشبورد ivila</h1>
            <p>فایل‌ها را سریع ثبت کن، وضعیتشان را ببین و برای انتشار آماده‌شان کن.</p>
          </div>
          <a className={styles.primaryButton} href="/admin/new">
            <FilePlus2 size={19} />
            ثبت فایل جدید
          </a>
        </header>

        {error && <div className={styles.errorBox}>{error}</div>}

        <section className={styles.statsGrid}>
          <article className={styles.statCard}>
            <div className={`${styles.statIcon} ${styles.seaIcon}`}><Waves size={21} /></div>
            <div><span>کل فایل‌ها</span><strong>{loading ? '—' : faNumber(totalDocs)}</strong></div>
          </article>
          <article className={styles.statCard}>
            <div className={`${styles.statIcon} ${styles.greenIcon}`}><CheckCircle2 size={21} /></div>
            <div><span>منتشر شده</span><strong>{loading ? '—' : faNumber(counts.published)}</strong></div>
          </article>
          <article className={styles.statCard}>
            <div className={`${styles.statIcon} ${styles.orangeIcon}`}><Clock3 size={21} /></div>
            <div><span>پیش‌نویس</span><strong>{loading ? '—' : faNumber(counts.draft)}</strong></div>
          </article>
          <article className={styles.statCard}>
            <div className={`${styles.statIcon} ${styles.grayIcon}`}><Archive size={21} /></div>
            <div><span>مختومه</span><strong>{loading ? '—' : faNumber(counts.sold + counts.rented + counts.archived)}</strong></div>
          </article>
        </section>

        <section className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <h2>آخرین فایل‌ها</h2>
              <span>{faNumber(filtered.length)} مورد در این نمایش</span>
            </div>
            <div className={styles.filters}>
              <label className={styles.searchBox}>
                <Search size={18} />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="کد، عنوان یا محدوده..."
                />
              </label>
              <select value={status} onChange={(event) => setStatus(event.target.value as typeof status)}>
                <option value="all">همه وضعیت‌ها</option>
                <option value="published">منتشر شده</option>
                <option value="draft">پیش‌نویس</option>
                <option value="sold">فروخته شده</option>
                <option value="rented">اجاره داده شده</option>
                <option value="archived">آرشیو</option>
              </select>
            </div>
          </div>

          <div className={styles.tableWrap}>
            <div className={`${styles.propertyRow} ${styles.propertyHead}`}>
              <span>فایل</span>
              <span>موقعیت</span>
              <span>قیمت</span>
              <span>وضعیت</span>
              <span />
            </div>

            {loading && <div className={styles.empty}>در حال دریافت فایل‌ها...</div>}
            {!loading && filtered.length === 0 && (
              <div className={styles.empty}>هنوز فایلی مطابق این فیلتر وجود ندارد.</div>
            )}

            {!loading && filtered.map((property) => (
              <div className={styles.propertyRow} key={property.id}>
                <div className={styles.propertyIdentity}>
                  <span className={styles.code}>{property.code || 'بدون کد'}</span>
                  <div>
                    <strong>{property.title || 'بدون عنوان'}</strong>
                    <small>{typeLabels[property.type || ''] || property.type || 'ملک'} · {property.deal === 'rent' ? 'اجاره' : 'فروش'}</small>
                  </div>
                </div>
                <div className={styles.locationCell}><MapPin size={16} /> {property.locationText || '—'}</div>
                <div className={styles.priceCell}><CircleDollarSign size={16} /> {propertyPrice(property)}</div>
                <div>
                  <span className={`${styles.statusBadge} ${styles[`status_${property.status || 'draft'}`]}`}>
                    {statusLabels[property.status || 'draft']}
                  </span>
                </div>
                <button className={styles.rowAction} type="button" title="ویرایش در مرحله بعد">
                  <ChevronLeft size={18} />
                </button>
              </div>
            ))}
          </div>
        </section>
      </section>
    </main>
  )
}
