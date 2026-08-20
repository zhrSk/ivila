'use client'

import { Menu, Search, UserRound, X } from 'lucide-react'
import { useEffect, useState } from 'react'

const navItems = [
  { label: 'خرید', href: '/#search' },
  { label: 'اجاره', href: '/#search' },
  { label: 'جستجو روی نقشه', href: '/#search' },
  { label: 'محدوده‌ها', href: '/#areas' },
]

export default function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    if (!menuOpen) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [menuOpen])

  return (
    <header className="site-header">
      <div className="container header-inner">
        <a className="brand" href="/" aria-label="ivila">
          <span className="brand-mark">i</span>
          <span>
            <strong dir="ltr">ivila</strong>
            <small>املاک شمال، دقیق‌تر از روی نقشه</small>
          </span>
        </a>

        <nav className="desktop-nav" aria-label="منوی اصلی">
          {navItems.map((item) => <a key={item.label} href={item.href}>{item.label}</a>)}
        </nav>

        <div className="header-actions">
          <a className="icon-button" href="/#search" aria-label="جستجو"><Search size={19}/></a>
          <a className="ghost-button" href="/admin"><UserRound size={18}/> ورود مشاور</a>
          <button
            type="button"
            className="menu-button"
            aria-label={menuOpen ? 'بستن منو' : 'منو'}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((value) => !value)}
          >
            {menuOpen ? <X size={22}/> : <Menu size={22}/>}
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="mobile-site-menu" role="dialog" aria-label="منوی سایت">
          <div className="mobile-site-menu-card">
            <nav>
              {navItems.map((item) => (
                <a key={item.label} href={item.href} onClick={() => setMenuOpen(false)}>{item.label}</a>
              ))}
            </nav>
            <a className="mobile-site-menu-login" href="/admin" onClick={() => setMenuOpen(false)}>
              <UserRound size={17}/> ورود مشاور
            </a>
          </div>
        </div>
      )}
    </header>
  )
}
