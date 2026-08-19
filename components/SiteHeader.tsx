'use client'

import { Menu, Search, UserRound } from 'lucide-react'

export default function SiteHeader() {
  return (
    <header className="site-header">
      <div className="container header-inner">
        <a className="brand" href="#top" aria-label="ivila">
          <span className="brand-mark">i</span>
          <span>
            <strong dir="ltr">ivila</strong>
            <small>املاک شمال، دقیق‌تر از روی نقشه</small>
          </span>
        </a>
        <nav className="desktop-nav" aria-label="منوی اصلی">
          <a href="#search">خرید</a>
          <a href="#search">اجاره</a>
          <a href="#map">جستجو روی نقشه</a>
          <a href="#areas">محدوده‌ها</a>
        </nav>
        <div className="header-actions">
          <button className="icon-button" aria-label="جستجو"><Search size={19}/></button>
          <button className="ghost-button"><UserRound size={18}/> ورود مشاور</button>
          <button className="menu-button" aria-label="منو"><Menu size={22}/></button>
        </div>
      </div>
    </header>
  )
}
