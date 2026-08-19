'use client'

import { useState, type FormEvent } from 'react'
import { Map, Search, Waves, Trees, House } from 'lucide-react'

type Deal = 'فروش' | 'اجاره'

export default function Hero() {
  const [query, setQuery] = useState('')
  const [deal, setDeal] = useState<Deal>('فروش')

  const scrollToSearch = () => document.getElementById('search')?.scrollIntoView({ behavior: 'smooth', block: 'start' })

  const runSearch = (event?: FormEvent) => {
    event?.preventDefault()
    window.dispatchEvent(new CustomEvent('ivila:hero-search', {
      detail: { query: query.trim(), deal }
    }))
    scrollToSearch()
  }

  const searchLifestyle = (lifestyle: 'coast' | 'forest' | 'village') => {
    window.dispatchEvent(new CustomEvent('ivila:hero-search', {
      detail: { query: '', deal, lifestyle }
    }))
    scrollToSearch()
  }

  return (
    <section className="hero" id="top">
      <div className="hero-bg" />
      <div className="hero-shade" />
      <div className="container hero-content">
        <div className="hero-copy">
          <span className="eyebrow">رویان · نور · روستاهای اطراف</span>
          <h1>ملکت را با <em>سبک زندگی</em> پیدا کن، نه فقط با یک آدرس.</h1>
          <p>از ویلاهای نزدیک ساحل تا زمین‌های حاشیه جنگل؛ جستجو را روی نقشه و محدوده‌ای که خودت انتخاب می‌کنی انجام بده.</p>
          <div className="hero-pills" aria-label="سبک زندگی">
            <button onClick={() => searchLifestyle('coast')}><Waves size={18}/> ساحلی</button>
            <button onClick={() => searchLifestyle('forest')}><Trees size={18}/> جنگلی</button>
            <button onClick={() => searchLifestyle('village')}><House size={18}/> روستایی</button>
          </div>
        </div>
        <form className="hero-search-card" onSubmit={runSearch}>
          <div className="search-tabs" role="tablist" aria-label="نوع معامله">
            <button type="button" className={deal === 'فروش' ? 'active' : ''} onClick={() => setDeal('فروش')}>خرید</button>
            <button type="button" className={deal === 'اجاره' ? 'active' : ''} onClick={() => setDeal('اجاره')}>اجاره</button>
          </div>
          <label htmlFor="hero-property-search">دنبال کجایی؟</label>
          <div className="hero-search-input">
            <Search size={20}/>
            <input
              id="hero-property-search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="محله، روستا یا کد فایل..."
              autoComplete="off"
            />
            <button type="submit">جستجو</button>
          </div>
          <div className="quick-grid">
            <button type="button" onClick={scrollToSearch}><span>نوع ملک</span><strong>همه</strong></button>
            <button type="button" onClick={scrollToSearch}><span>بودجه</span><strong>انتخاب بازه</strong></button>
            <button type="button" onClick={scrollToSearch}><span>متراژ</span><strong>از ۱۰۰ متر</strong></button>
          </div>
          <button type="button" className="map-search-cta" onClick={() => document.getElementById('map')?.scrollIntoView({behavior:'smooth', block:'center'})}><Map size={19}/> جستجوی پیشرفته روی نقشه</button>
        </form>
      </div>
      <div className="hero-statbar container">
        <div><strong>ساحل تا جنگل</strong><span>جستجو با سبک منطقه</span></div>
        <div><strong>روی نقشه</strong><span>محدوده دلخواه خودت</span></div>
        <div><strong>فاصله دقیق</strong><span>تا دریا و جنگل</span></div>
      </div>
    </section>
  )
}
