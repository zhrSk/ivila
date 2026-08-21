'use client'

import { ArrowRight, PauseCircle, PlayCircle, Plus, Trash2, UserRound, UsersRound } from 'lucide-react'
import { FormEvent, useEffect, useState } from 'react'
import { isValidIranMobile, normalizeIranPhone } from '@/lib/phone'
import { isEffectiveAdmin } from '@/lib/ivila-user-role'
import styles from './IvilaAdmin.module.css'

type UserDoc = {
  id: string | number
  name?: string
  username?: string
  phone?: string
  role?: 'admin' | 'agent'
  isActive?: boolean
  createdAt?: string
}

export default function IvilaAgentManager() {
  const [users, setUsers] = useState<UserDoc[]>([])
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)
  const [actionId, setActionId] = useState<string>('')

  async function load() {
    setLoading(true)
    try {
      const [me, response] = await Promise.all([
        fetch('/api/users/me', { credentials: 'include', cache: 'no-store' }),
        fetch('/api/users?limit=100&sort=name&where[role][equals]=agent', { credentials: 'include', cache: 'no-store' }),
      ])
      const meData = await me.json().catch(() => null) as any
      if (!me.ok || !isEffectiveAdmin(meData?.user)) { window.location.assign('/admin'); return }
      const data = await response.json().catch(() => null) as any
      if (!response.ok) throw new Error(data?.message || 'دریافت لیست مشاورها انجام نشد.')
      setUsers(data?.docs || [])
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'خطا در دریافت مشاورها')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  async function submit(event: FormEvent) {
    event.preventDefault(); if (busy) return
    const normalizedPhone = normalizeIranPhone(phone)
    if (!isValidIranMobile(normalizedPhone)) { setError('شماره موبایل را به شکل 09121234567 وارد کن.'); return }
    setBusy(true); setError('')
    try {
      const response = await fetch('/api/users', {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), username: normalizedPhone, phone: normalizedPhone, password, role: 'agent', isActive: true }),
      })
      const data = await response.json().catch(() => null) as any
      if (!response.ok) throw new Error(data?.errors?.[0]?.message || data?.message || 'ساخت حساب مشاور انجام نشد.')
      setName(''); setPhone(''); setPassword(''); await load()
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'خطا در ساخت مشاور') }
    finally { setBusy(false) }
  }

  async function setActive(user: UserDoc, isActive: boolean) {
    const key = String(user.id)
    setActionId(key); setError('')
    try {
      const response = await fetch(`/api/users/${user.id}`, {
        method: 'PATCH', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive }),
      })
      const data = await response.json().catch(() => null) as any
      if (!response.ok) throw new Error(data?.errors?.[0]?.message || data?.message || 'تغییر وضعیت حساب انجام نشد.')
      setUsers(current => current.map(item => String(item.id) === key ? { ...item, isActive } : item))
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'خطا در تغییر وضعیت حساب') }
    finally { setActionId('') }
  }

  async function removeUser(user: UserDoc) {
    const label = user.name || user.phone || 'این مشاور'
    if (!window.confirm(`حساب ${label} حذف شود؟ فایل‌های ملکی ثبت‌شده توسط او حذف نمی‌شوند.`)) return
    const key = String(user.id)
    setActionId(key); setError('')
    try {
      const response = await fetch(`/api/users/${user.id}`, { method: 'DELETE', credentials: 'include' })
      const data = await response.json().catch(() => null) as any
      if (!response.ok) throw new Error(data?.errors?.[0]?.message || data?.message || 'حذف حساب انجام نشد.')
      setUsers(current => current.filter(item => String(item.id) !== key))
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'خطا در حذف حساب') }
    finally { setActionId('') }
  }

  return <main className={styles.standaloneAdmin} dir="rtl">
    <header className={styles.simpleTopbar}><a href="/admin"><ArrowRight size={18}/> بازگشت</a><strong>مدیریت مشاورها</strong></header>
    <div className={styles.simpleAdminGrid}>
      <section className={styles.formCard}>
        <div className={styles.sectionTitle}><span><Plus size={16}/></span><div><h2>مشاور جدید</h2><p>با شماره موبایل برای مشاور حساب ورود بساز.</p></div></div>
        {error && <div className={styles.errorBox}>{error}</div>}
        <form className={styles.fieldsGrid} onSubmit={submit} autoComplete="off">
          <label className={`${styles.field} ${styles.span2}`}><span>نام و نام خانوادگی</span><input required name="new-agent-name" autoComplete="off" value={name} onChange={(e)=>setName(e.target.value)}/></label>
          <label className={`${styles.field} ${styles.span2}`}><span>شماره موبایل ورود</span><input required name="new-agent-phone" autoComplete="off" type="tel" inputMode="numeric" dir="ltr" placeholder="09121234567" value={phone} onChange={(e)=>setPhone(e.target.value)}/></label>
          <label className={`${styles.field} ${styles.span2}`}><span>رمز عبور اولیه</span><input required name="new-agent-password" autoComplete="new-password" minLength={8} type="password" dir="ltr" value={password} onChange={(e)=>setPassword(e.target.value)}/></label>
          <button className={`${styles.primaryButton} ${styles.span2}`} disabled={busy}><UsersRound size={18}/>{busy ? 'در حال ساخت...' : 'ساخت حساب مشاور'}</button>
        </form>
      </section>
      <section className={styles.formCard}>
        <div className={styles.sectionTitle}><span><UsersRound size={16}/></span><div><h2>مشاورها</h2><p>حساب‌های فعال، بسته‌شده و امکان حذف کامل.</p></div></div>
        {loading ? (
          <div className={styles.teamLoading} aria-label="در حال دریافت مشاورها">
            <span/><span/><span/>
          </div>
        ) : users.length === 0 ? (
          <div className={styles.empty}>هنوز مشاوری ساخته نشده است.</div>
        ) : (
          <div className={styles.teamList}>{users.map((user)=>{
            const active = user.isActive !== false
            const working = actionId === String(user.id)
            return <article key={user.id} className={`${styles.teamItem} ${!active ? styles.teamItemDisabled : ''}`}>
              <div className={styles.avatar}><UserRound size={17}/></div>
              <div className={styles.teamIdentity}><strong>{user.name || user.phone || 'مشاور ivila'}</strong><span dir="ltr">{user.phone || user.username || 'شماره ثبت نشده'}</span><small>{active ? 'حساب فعال' : 'حساب بسته شده'}</small></div>
              <div className={styles.teamActions}>
                <button type="button" disabled={working} className={active ? styles.pauseAgent : styles.resumeAgent} onClick={()=>void setActive(user, !active)}>{active ? <><PauseCircle size={15}/> بستن</> : <><PlayCircle size={15}/> فعال‌سازی</>}</button>
                <button type="button" disabled={working} className={styles.deleteAgent} onClick={()=>void removeUser(user)}><Trash2 size={15}/> حذف</button>
              </div>
            </article>
          })}</div>
        )}
      </section>
    </div>
  </main>
}
