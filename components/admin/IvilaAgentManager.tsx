'use client'

import { ArrowRight, Plus, ShieldCheck, UserRound, UsersRound } from 'lucide-react'
import { FormEvent, useEffect, useState } from 'react'
import styles from './IvilaAdmin.module.css'

type UserDoc = { id: string | number; name?: string; email?: string; phone?: string; role?: 'admin' | 'agent'; createdAt?: string }

export default function IvilaAgentManager() {
  const [users, setUsers] = useState<UserDoc[]>([])
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function load() {
    const me = await fetch('/api/users/me', { credentials: 'include', cache: 'no-store' })
    const meData = await me.json().catch(() => null) as any
    if (!me.ok || meData?.user?.role !== 'admin') { window.location.assign('/admin'); return }
    const response = await fetch('/api/users?limit=100&sort=name', { credentials: 'include', cache: 'no-store' })
    const data = await response.json().catch(() => null) as any
    if (response.ok) setUsers(data?.docs || [])
  }

  useEffect(() => { void load() }, [])

  async function submit(event: FormEvent) {
    event.preventDefault(); if (busy) return
    setBusy(true); setError('')
    try {
      const response = await fetch('/api/users', {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), phone: phone.trim(), password, role: 'agent' }),
      })
      const data = await response.json().catch(() => null) as any
      if (!response.ok) throw new Error(data?.errors?.[0]?.message || data?.message || 'ساخت حساب مشاور انجام نشد.')
      setName(''); setEmail(''); setPhone(''); setPassword(''); await load()
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'خطا در ساخت مشاور') }
    finally { setBusy(false) }
  }

  return <main className={styles.standaloneAdmin} dir="rtl">
    <header className={styles.simpleTopbar}><a href="/admin"><ArrowRight size={18}/> بازگشت</a><strong>مدیریت مشاورها</strong></header>
    <div className={styles.simpleAdminGrid}>
      <section className={styles.formCard}>
        <div className={styles.sectionTitle}><span><Plus size={16}/></span><div><h2>مشاور جدید</h2><p>حساب ورود برای مشاور بساز.</p></div></div>
        {error && <div className={styles.errorBox}>{error}</div>}
        <form className={styles.fieldsGrid} onSubmit={submit}>
          <label className={`${styles.field} ${styles.span2}`}><span>نام و نام خانوادگی</span><input required value={name} onChange={(e)=>setName(e.target.value)}/></label>
          <label className={styles.field}><span>ایمیل ورود</span><input required type="email" dir="ltr" value={email} onChange={(e)=>setEmail(e.target.value)}/></label>
          <label className={styles.field}><span>موبایل</span><input dir="ltr" value={phone} onChange={(e)=>setPhone(e.target.value)}/></label>
          <label className={`${styles.field} ${styles.span2}`}><span>رمز عبور اولیه</span><input required minLength={8} type="password" dir="ltr" value={password} onChange={(e)=>setPassword(e.target.value)}/></label>
          <button className={`${styles.primaryButton} ${styles.span2}`} disabled={busy}><UsersRound size={18}/>{busy ? 'در حال ساخت...' : 'ساخت حساب مشاور'}</button>
        </form>
      </section>
      <section className={styles.formCard}>
        <div className={styles.sectionTitle}><span><UsersRound size={16}/></span><div><h2>اعضای تیم</h2><p>ادمین اصلی و مشاورهای فعال.</p></div></div>
        <div className={styles.teamList}>{users.map((user)=><article key={user.id} className={styles.teamItem}><div className={styles.avatar}><UserRound size={17}/></div><div><strong>{user.name || user.email}</strong><span>{user.email}{user.phone ? ` · ${user.phone}` : ''}</span></div><em className={user.role === 'admin' ? styles.adminRole : styles.agentRole}>{user.role === 'admin' ? <><ShieldCheck size={13}/> ادمین اصلی</> : 'مشاور'}</em></article>)}</div>
      </section>
    </div>
  </main>
}
