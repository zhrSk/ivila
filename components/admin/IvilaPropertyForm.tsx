'use client'

import {
  ArrowRight,
  Check,
  FilePlus2,
  LocateFixed,
  MapPin,
  Save,
} from 'lucide-react'
import { FormEvent, useEffect, useRef, useState } from 'react'
import styles from './IvilaAdmin.module.css'

type Deal = 'sale' | 'rent'
type PropertyType = 'villa' | 'land' | 'apartment'
type Lifestyle = 'coast' | 'forest' | 'village' | 'urban'
type DocumentStatus = 'single-page' | 'council' | 'contract' | 'in-progress'
type PublishStatus = 'draft' | 'published'

function numeric(value: string) {
  if (!value.trim()) return undefined
  const number = Number(value.replace(/,/g, ''))
  return Number.isFinite(number) ? number : undefined
}

export default function IvilaPropertyForm() {
  const mapContainer = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<any>(null)
  const markerRef = useRef<any>(null)

  const [code, setCode] = useState('IV-')
  const [title, setTitle] = useState('')
  const [deal, setDeal] = useState<Deal>('sale')
  const [type, setType] = useState<PropertyType>('villa')
  const [lifestyle, setLifestyle] = useState<Lifestyle>('coast')
  const [area, setArea] = useState('')
  const [rooms, setRooms] = useState('0')
  const [documentStatus, setDocumentStatus] = useState<DocumentStatus>('single-page')
  const [locationText, setLocationText] = useState('')
  const [longitude, setLongitude] = useState<number | null>(null)
  const [latitude, setLatitude] = useState<number | null>(null)
  const [seaDistance, setSeaDistance] = useState('')
  const [forestDistance, setForestDistance] = useState('')
  const [salePrice, setSalePrice] = useState('')
  const [deposit, setDeposit] = useState('')
  const [monthlyRent, setMonthlyRent] = useState('')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState<PublishStatus>('draft')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    let disposed = false

    async function setupMap() {
      if (!mapContainer.current || mapRef.current) return
      const maplibregl = await import('maplibre-gl')
      if (disposed || !mapContainer.current) return

      try {
        maplibregl.setWorkerUrl('/maplibre/maplibre-gl-worker.mjs')
      } catch {}

      try {
        maplibregl.setRTLTextPlugin('/maplibre/mapbox-gl-rtl-text.js', true)
      } catch {}

      const map = new maplibregl.Map({
        container: mapContainer.current,
        style: 'https://tiles.openfreemap.org/styles/liberty',
        center: [51.9607, 36.5665],
        zoom: 10.8,
      })

      map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-left')
      mapRef.current = map

      map.on('click', (event) => {
        const lng = Number(event.lngLat.lng.toFixed(6))
        const lat = Number(event.lngLat.lat.toFixed(6))
        setLongitude(lng)
        setLatitude(lat)

        if (markerRef.current) markerRef.current.remove()
        markerRef.current = new maplibregl.Marker({ color: '#087c70' })
          .setLngLat([lng, lat])
          .addTo(map)
      })
    }

    void setupMap()

    return () => {
      disposed = true
      markerRef.current?.remove?.()
      mapRef.current?.remove?.()
      markerRef.current = null
      mapRef.current = null
    }
  }, [])

  function locateRoyan() {
    mapRef.current?.flyTo?.({ center: [51.9607, 36.5665], zoom: 12, essential: true })
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy) return

    if (longitude === null || latitude === null) {
      setError('محل ملک را روی نقشه انتخاب کن.')
      return
    }

    setBusy(true)
    setError('')
    setSuccess(false)

    try {
      const body = {
        code: code.trim(),
        title: title.trim(),
        deal,
        type,
        lifestyle,
        areaM2: numeric(area),
        rooms: numeric(rooms) ?? 0,
        documentStatus,
        description: description.trim(),
        locationText: locationText.trim(),
        coordinates: [longitude, latitude],
        seaDistanceM: numeric(seaDistance),
        forestDistanceM: numeric(forestDistance),
        salePriceToman: deal === 'sale' ? numeric(salePrice) : undefined,
        depositToman: deal === 'rent' ? numeric(deposit) : undefined,
        monthlyRentToman: deal === 'rent' ? numeric(monthlyRent) : undefined,
        status,
        featured: false,
      }

      const response = await fetch('/api/properties', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      let result: any = null
      try { result = await response.json() } catch {}

      if (response.status === 401) {
        window.location.assign('/ivila-login')
        return
      }

      if (!response.ok) {
        const message = result?.errors?.[0]?.message || result?.message || 'ذخیره فایل انجام نشد.'
        setError(message)
        return
      }

      setSuccess(true)
      setTimeout(() => window.location.assign('/admin'), 700)
    } catch {
      setError('ارتباط با Backend برقرار نشد. دوباره تلاش کن.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className={styles.formPage} dir="rtl">
      <header className={styles.formTopbar}>
        <a href="/admin" className={styles.backButton}><ArrowRight size={18} /> بازگشت</a>
        <div className={styles.formBrand}>ivila</div>
        <span className={styles.saveHint}>ثبت سریع فایل</span>
      </header>

      <form className={styles.propertyForm} onSubmit={submit}>
        <section className={styles.formIntro}>
          <div>
            <span className={styles.eyebrow}>فایل جدید</span>
            <h1>ثبت ملک در ivila</h1>
            <p>اطلاعات اصلی را وارد کن و محل دقیق ملک را با یک کلیک روی نقشه مشخص کن.</p>
          </div>
          <FilePlus2 size={42} />
        </section>

        {error && <div className={styles.errorBox}>{error}</div>}
        {success && <div className={styles.successBox}><Check size={18} /> فایل با موفقیت ذخیره شد.</div>}

        <div className={styles.formGrid}>
          <section className={styles.formCard}>
            <div className={styles.sectionTitle}><span>۱</span><div><h2>اطلاعات اصلی</h2><p>مشخصاتی که مشتری اول می‌بیند.</p></div></div>
            <div className={styles.fieldsGrid}>
              <label className={styles.field}><span>کد فایل</span><input required value={code} onChange={(e) => setCode(e.target.value)} dir="ltr" /></label>
              <label className={`${styles.field} ${styles.span2}`}><span>عنوان فایل</span><input required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="مثلاً ویلای مدرن ۳۰۰ متری نزدیک دریا" /></label>
              <label className={styles.field}><span>نوع معامله</span><select value={deal} onChange={(e) => setDeal(e.target.value as Deal)}><option value="sale">فروش</option><option value="rent">اجاره</option></select></label>
              <label className={styles.field}><span>نوع ملک</span><select value={type} onChange={(e) => setType(e.target.value as PropertyType)}><option value="villa">ویلا</option><option value="land">زمین</option><option value="apartment">آپارتمان</option></select></label>
              <label className={styles.field}><span>سبک منطقه</span><select value={lifestyle} onChange={(e) => setLifestyle(e.target.value as Lifestyle)}><option value="coast">ساحلی</option><option value="forest">جنگلی</option><option value="village">روستایی</option><option value="urban">شهری</option></select></label>
              <label className={styles.field}><span>متراژ</span><input required inputMode="numeric" value={area} onChange={(e) => setArea(e.target.value)} placeholder="۳۲۰" /></label>
              <label className={styles.field}><span>تعداد خواب</span><input required inputMode="numeric" value={rooms} onChange={(e) => setRooms(e.target.value)} /></label>
              <label className={styles.field}><span>وضعیت سند</span><select value={documentStatus} onChange={(e) => setDocumentStatus(e.target.value as DocumentStatus)}><option value="single-page">سند تک‌برگ</option><option value="council">سند شورایی</option><option value="contract">قولنامه‌ای</option><option value="in-progress">در حال اخذ سند</option></select></label>
            </div>
          </section>

          <section className={styles.formCard}>
            <div className={styles.sectionTitle}><span>۲</span><div><h2>قیمت و انتشار</h2><p>قیمت و وضعیت نمایش فایل.</p></div></div>
            <div className={styles.fieldsGrid}>
              {deal === 'sale' ? (
                <label className={`${styles.field} ${styles.span2}`}><span>قیمت فروش (تومان)</span><input inputMode="numeric" value={salePrice} onChange={(e) => setSalePrice(e.target.value)} placeholder="مثلاً 18500000000" dir="ltr" /></label>
              ) : (
                <>
                  <label className={styles.field}><span>ودیعه (تومان)</span><input inputMode="numeric" value={deposit} onChange={(e) => setDeposit(e.target.value)} dir="ltr" /></label>
                  <label className={styles.field}><span>اجاره ماهانه (تومان)</span><input inputMode="numeric" value={monthlyRent} onChange={(e) => setMonthlyRent(e.target.value)} dir="ltr" /></label>
                </>
              )}
              <label className={`${styles.field} ${styles.span2}`}><span>وضعیت فایل</span><select value={status} onChange={(e) => setStatus(e.target.value as PublishStatus)}><option value="draft">فعلاً پیش‌نویس</option><option value="published">همین حالا منتشر شود</option></select></label>
            </div>
          </section>

          <section className={`${styles.formCard} ${styles.mapCard}`}>
            <div className={styles.sectionTitle}><span>۳</span><div><h2>موقعیت ملک</h2><p>روی نقطه دقیق ملک در نقشه کلیک کن.</p></div></div>
            <label className={styles.field}><span>نام محدوده / آدرس قابل نمایش</span><input required value={locationText} onChange={(e) => setLocationText(e.target.value)} placeholder="رویان، نوار ساحلی" /></label>
            <div className={styles.adminMapWrap}>
              <div ref={mapContainer} className={styles.adminMap} />
              <button type="button" className={styles.mapLocate} onClick={locateRoyan}><LocateFixed size={17} /> رویان</button>
              <div className={styles.mapCoordinate}><MapPin size={15} /> {longitude === null ? 'هنوز نقطه‌ای انتخاب نشده' : `${latitude}, ${longitude}`}</div>
            </div>
            <div className={styles.fieldsGrid}>
              <label className={styles.field}><span>فاصله تا دریا (متر)</span><input inputMode="numeric" value={seaDistance} onChange={(e) => setSeaDistance(e.target.value)} /></label>
              <label className={styles.field}><span>فاصله تا جنگل (متر)</span><input inputMode="numeric" value={forestDistance} onChange={(e) => setForestDistance(e.target.value)} /></label>
            </div>
          </section>

          <section className={`${styles.formCard} ${styles.fullCard}`}>
            <div className={styles.sectionTitle}><span>۴</span><div><h2>توضیحات</h2><p>نکته‌هایی که فروش فایل را راحت‌تر می‌کنند.</p></div></div>
            <label className={styles.field}><span>توضیحات فایل</span><textarea required value={description} onChange={(e) => setDescription(e.target.value)} placeholder="ویژگی‌های مهم ملک، دسترسی، وضعیت بنا و..." rows={6} /></label>
            <div className={styles.uploadNotice}>آپلود چندعکس را در مرحله بعد با Vercel Blob به همین فرم اضافه می‌کنیم؛ فایل بدون عکس هم فعلاً قابل ثبت است.</div>
          </section>
        </div>

        <div className={styles.stickySave}>
          <div><strong>{code || 'فایل جدید'}</strong><span>{status === 'published' ? 'بعد از ذخیره در سایت دیده می‌شود' : 'به‌صورت پیش‌نویس ذخیره می‌شود'}</span></div>
          <button type="submit" disabled={busy}><Save size={18} /> {busy ? 'در حال ذخیره...' : 'ذخیره فایل'}</button>
        </div>
      </form>
    </main>
  )
}
