'use client'

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  Building2,
  House,
  MapPinned,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Sparkles,
  Trees,
  Waves,
  X
} from 'lucide-react'
import { lifestyleLabels, type DocumentStatus, type Lifestyle, type Property } from '@/lib/data'
import MapExplorer from './MapExplorer'
import PropertyCard from './PropertyCard'
import FilterSelect from './FilterSelect'

const lifestyles: { key: Lifestyle; icon: ReactNode; description: string }[] = [
  { key: 'all', icon: <Sparkles size={18}/>, description: 'همه فایل‌های منتخب' },
  { key: 'coast', icon: <Waves size={18}/>, description: 'نزدیک دریا و دسترسی ساحلی' },
  { key: 'forest', icon: <Trees size={18}/>, description: 'حاشیه جنگل و مسیرهای سبز' },
  { key: 'village', icon: <House size={18}/>, description: 'بافت آرام و کم‌تراکم' },
  { key: 'urban', icon: <Building2 size={18}/>, description: 'مرکز شهر و خدمات شهری' }
]

const documentOptions: Array<'همه' | DocumentStatus> = ['همه', 'سند تک‌برگ', 'سند شورایی', 'قولنامه‌ای', 'در حال اخذ سند']


type HeroSearchDetail = {
  query?: string
  deal?: 'فروش' | 'اجاره'
  lifestyle?: Lifestyle
}

function normalizeSearchText(value: string) {
  const persianDigits = '۰۱۲۳۴۵۶۷۸۹'
  return value
    .trim()
    .toLowerCase()
    .replace(/ي/g, 'ی')
    .replace(/ك/g, 'ک')
    .replace(/[۰-۹]/g, digit => String(persianDigits.indexOf(digit)))
    .replace(/[ـ‌]/g, ' ')
    .replace(/[-_/\,،.]+/g, ' ')
    .replace(/\s+/g, ' ')
}

function propertyMatchesQuery(property: Property, rawQuery: string) {
  const query = normalizeSearchText(rawQuery)
  if (!query) return true
  const haystack = normalizeSearchText([
    property.code,
    property.title,
    property.location,
    property.type,
    property.deal,
    lifestyleLabels[property.lifestyle],
    ...property.badges
  ].join(' '))
  return query.split(' ').filter(Boolean).every(token => haystack.includes(token))
}

export default function SearchExperience({ properties }: { properties: Property[] }) {
  const [lifestyle, setLifestyle] = useState<Lifestyle>('all')
  const [areaIds, setAreaIds] = useState<string[] | null>(null)
  const [type, setType] = useState<'همه' | 'ویلا' | 'زمین' | 'آپارتمان'>('همه')
  const [maxPrice, setMaxPrice] = useState<number | null>(null)
  const [minArea, setMinArea] = useState<number | null>(null)
  const [minRooms, setMinRooms] = useState<number | null>(null)
  const [document, setDocument] = useState<'همه' | DocumentStatus>('همه')
  const [maxSeaDistance, setMaxSeaDistance] = useState<number | null>(null)
  const [maxForestDistance, setMaxForestDistance] = useState<number | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [textQuery, setTextQuery] = useState('')
  const [deal, setDeal] = useState<'همه' | 'فروش' | 'اجاره'>('همه')

  useEffect(() => {
    const handleHeroSearch = (event: Event) => {
      const detail = (event as CustomEvent<HeroSearchDetail>).detail || {}
      setTextQuery(detail.query ?? '')
      setDeal(detail.deal ?? 'همه')
      if (detail.lifestyle) setLifestyle(detail.lifestyle)
      setAreaIds(null)
      setSelectedId(null)
    }
    window.addEventListener('ivila:hero-search', handleHeroSearch)
    return () => window.removeEventListener('ivila:hero-search', handleHeroSearch)
  }, [])

  const filtered = useMemo(() => properties.filter(p => {
    const byLifestyle = lifestyle === 'all' || p.lifestyle === lifestyle
    const byType = type === 'همه' || p.type === type
    const byArea = !areaIds || areaIds.includes(p.id)
    const byPrice = maxPrice === null || p.priceBillions <= maxPrice
    const byMinArea = minArea === null || p.area >= minArea
    const byRooms = minRooms === null || p.rooms >= minRooms
    const byDocument = document === 'همه' || p.documentStatus === document
    const bySea = maxSeaDistance === null || p.seaDistanceM <= maxSeaDistance
    const byForest = maxForestDistance === null || p.forestDistanceM <= maxForestDistance
    const byDeal = deal === 'همه' || p.deal === deal
    const byText = propertyMatchesQuery(p, textQuery)
    return byLifestyle && byType && byArea && byPrice && byMinArea && byRooms && byDocument && bySea && byForest && byDeal && byText
  }), [lifestyle, areaIds, type, maxPrice, minArea, minRooms, document, maxSeaDistance, maxForestDistance, deal, textQuery])

  const filterBaseForMap = useMemo(() => properties.filter(p => {
    const byLifestyle = lifestyle === 'all' || p.lifestyle === lifestyle
    const byType = type === 'همه' || p.type === type
    const byPrice = maxPrice === null || p.priceBillions <= maxPrice
    const byMinArea = minArea === null || p.area >= minArea
    const byRooms = minRooms === null || p.rooms >= minRooms
    const byDocument = document === 'همه' || p.documentStatus === document
    const bySea = maxSeaDistance === null || p.seaDistanceM <= maxSeaDistance
    const byForest = maxForestDistance === null || p.forestDistanceM <= maxForestDistance
    const byDeal = deal === 'همه' || p.deal === deal
    const byText = propertyMatchesQuery(p, textQuery)
    return byLifestyle && byType && byPrice && byMinArea && byRooms && byDocument && bySea && byForest && byDeal && byText
  }), [lifestyle, type, maxPrice, minArea, minRooms, document, maxSeaDistance, maxForestDistance, deal, textQuery])

  const activeFilterCount = [
    type !== 'همه', maxPrice !== null, minArea !== null, minRooms !== null,
    document !== 'همه', maxSeaDistance !== null, maxForestDistance !== null, areaIds !== null,
    deal !== 'همه', textQuery.trim().length > 0
  ].filter(Boolean).length

  const resetFilters = () => {
    setLifestyle('all')
    setAreaIds(null)
    setType('همه')
    setMaxPrice(null)
    setMinArea(null)
    setMinRooms(null)
    setDocument('همه')
    setMaxSeaDistance(null)
    setMaxForestDistance(null)
    setSelectedId(null)
    setTextQuery('')
    setDeal('همه')
  }

  return (
    <section className="search-section" id="search">
      <div className="container">
        <div className="section-heading search-heading">
          <div>
            <span className="eyebrow dark">جستجوی جغرافیایی ivila</span>
            <h2>بین دریا و جنگل، دقیقاً همان محدوده‌ای را پیدا کن که می‌خواهی.</h2>
          </div>
          <p>فایل‌ها را با سبک منطقه، فاصله تا ساحل یا جنگل، قیمت، متراژ و سند فیلتر کن؛ یا محدوده دلخواهت را مستقیم روی نقشه بکش.</p>
        </div>

        <div className="lifestyle-grid" id="areas">
          {lifestyles.map(item => (
            <button
              key={item.key}
              className={`lifestyle-card tone-${item.key} ${lifestyle === item.key ? 'active' : ''}`}
              onClick={() => { setLifestyle(item.key); setAreaIds(null); setSelectedId(null) }}
            >
              <span className="lifestyle-icon">{item.icon}</span>
              <strong>{lifestyleLabels[item.key]}</strong>
              <small>{item.description}</small>
            </button>
          ))}
        </div>

        {(textQuery || deal !== 'همه') && (
          <div className="hero-search-resultbar" aria-live="polite">
            <div>
              <Search size={17}/>
              <span>جستجوی بالای صفحه:</span>
              {textQuery && <strong>«{textQuery}»</strong>}
              {deal !== 'همه' && <b>{deal === 'فروش' ? 'خرید' : 'اجاره'}</b>}
              <small>{filtered.length.toLocaleString('fa-IR')} فایل پیدا شد</small>
            </div>
            <button onClick={() => { setTextQuery(''); setDeal('همه'); setAreaIds(null) }} aria-label="حذف جستجوی بالای صفحه"><X size={16}/> پاک کردن</button>
          </div>
        )}

        <div className="filter-panel">
          <div className="filter-panel-head">
            <div className="filter-summary">
              <SlidersHorizontal size={18}/>
              <strong>فیلتر حرفه‌ای فایل‌ها</strong>
              <span>{filtered.length.toLocaleString('fa-IR')} نتیجه</span>
              {activeFilterCount > 0 && <b>{activeFilterCount.toLocaleString('fa-IR')} فیلتر فعال</b>}
            </div>
            {activeFilterCount > 0 && <button className="reset-filters" onClick={resetFilters}><RotateCcw size={15}/> پاک کردن فیلترها</button>}
          </div>

          <div className="filter-controls primary-filters">
            <FilterSelect
              label="نوع ملک"
              value={type}
              options={[
                { value: 'همه', label: 'همه' },
                { value: 'ویلا', label: 'ویلا' },
                { value: 'زمین', label: 'زمین' },
                { value: 'آپارتمان', label: 'آپارتمان' }
              ]}
              onChange={(value) => { setType(value as typeof type); setAreaIds(null) }}
            />
            <FilterSelect
              label="حداکثر قیمت"
              value={maxPrice?.toString() ?? ''}
              options={[
                { value: '', label: 'بدون محدودیت' },
                { value: '8', label: 'تا ۸ میلیارد' },
                { value: '12', label: 'تا ۱۲ میلیارد' },
                { value: '20', label: 'تا ۲۰ میلیارد' },
                { value: '30', label: 'تا ۳۰ میلیارد' }
              ]}
              onChange={(value) => { setMaxPrice(value ? Number(value) : null); setAreaIds(null) }}
            />
            <FilterSelect
              label="حداقل متراژ"
              value={minArea?.toString() ?? ''}
              options={[
                { value: '', label: 'بدون محدودیت' },
                { value: '150', label: 'از ۱۵۰ متر' },
                { value: '300', label: 'از ۳۰۰ متر' },
                { value: '500', label: 'از ۵۰۰ متر' },
                { value: '700', label: 'از ۷۰۰ متر' }
              ]}
              onChange={(value) => { setMinArea(value ? Number(value) : null); setAreaIds(null) }}
            />
            <FilterSelect
              label="تعداد خواب"
              value={minRooms?.toString() ?? ''}
              options={[
                { value: '', label: 'مهم نیست' },
                { value: '2', label: '۲ خواب به بالا' },
                { value: '3', label: '۳ خواب به بالا' },
                { value: '4', label: '۴ خواب به بالا' }
              ]}
              onChange={(value) => { setMinRooms(value ? Number(value) : null); setAreaIds(null) }}
            />
            <FilterSelect
              label="وضعیت سند"
              className="document-filter"
              value={document}
              options={documentOptions.map(item => ({ value: item, label: item }))}
              onChange={(value) => { setDocument(value as typeof document); setAreaIds(null) }}
            />
          </div>

          <div className="spatial-filter-row">
            <div className="spatial-filter-title"><MapPinned size={17}/><div><strong>فیلترهای مخصوص شمال</strong><span>فاصله تا دریا و جنگل را هم مثل قیمت و متراژ وارد جستجو کن.</span></div></div>
            <div className="spatial-filter-controls">
              <FilterSelect
                label="فاصله تا دریا"
                className="spatial-dropdown sea"
                icon={<Waves size={18}/>}
                active={maxSeaDistance !== null}
                value={maxSeaDistance?.toString() ?? ''}
                options={[
                  { value: '', label: 'مهم نیست' },
                  { value: '250', label: 'تا ۲۵۰ متر' },
                  { value: '500', label: 'تا ۵۰۰ متر' },
                  { value: '1000', label: 'تا ۱ کیلومتر' },
                  { value: '3000', label: 'تا ۳ کیلومتر' }
                ]}
                onChange={(value) => { setMaxSeaDistance(value ? Number(value) : null); setAreaIds(null) }}
              />
              <FilterSelect
                label="فاصله تا جنگل"
                className="spatial-dropdown forest"
                icon={<Trees size={18}/>}
                active={maxForestDistance !== null}
                value={maxForestDistance?.toString() ?? ''}
                options={[
                  { value: '', label: 'مهم نیست' },
                  { value: '250', label: 'تا ۲۵۰ متر' },
                  { value: '500', label: 'تا ۵۰۰ متر' },
                  { value: '1000', label: 'تا ۱ کیلومتر' },
                  { value: '3000', label: 'تا ۳ کیلومتر' }
                ]}
                onChange={(value) => { setMaxForestDistance(value ? Number(value) : null); setAreaIds(null) }}
              />
            </div>
          </div>
        </div>

        <div className="discovery-layout">
          <div className="results-pane">
            <div className="results-head">
              <div><MapPinned size={18}/><strong>{areaIds ? 'داخل محدوده رسم‌شده' : lifestyleLabels[lifestyle]}</strong><span>{filtered.length.toLocaleString('fa-IR')} فایل</span></div>
              {areaIds && <button onClick={() => setAreaIds(null)}>حذف محدوده</button>}
            </div>
            <div className="property-list">
              {filtered.map(p => <PropertyCard key={p.id} property={p} compact onMapFocus={(id) => setSelectedId(id)} />)}
              {filtered.length === 0 && <div className="empty-state"><MapPinned size={28}/><strong>با این ترکیب فیلتر، فایل نمونه‌ای نداریم.</strong><span>فاصله تا دریا/جنگل یا بازه قیمت را کمی بازتر کن.</span><button onClick={resetFilters}>نمایش همه فایل‌ها</button></div>}
            </div>
          </div>
          <div className="map-pane">
            <MapExplorer
              properties={areaIds ? filtered : filterBaseForMap}
              selectedId={selectedId}
              onSelectProperty={setSelectedId}
              onStartDrawing={() => { setAreaIds(null); setSelectedId(null) }}
              onAreaSelection={setAreaIds}
            />
          </div>
        </div>
      </div>
    </section>
  )
}
