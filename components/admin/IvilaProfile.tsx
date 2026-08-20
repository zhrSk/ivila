'use client'

import { ArrowRight, Save, UserRound } from 'lucide-react'
import { FormEvent, useEffect, useState } from 'react'
import styles from './IvilaAdmin.module.css'

export default function IvilaProfile() {
  const [id, setId] = useState<string | number>('')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [bio, setBio] = useState('')
  const [role, setRole] = useState('agent')
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => { fetch('/api/users/me', { credentials:'include', cache:'no-store' }).then(async r => { if (r.status===401) { window.location.assign('/ivila-login'); return } const d=await r.json() as any; const u=d?.user; if (!u) return; setId(u.id); setName(u.name||''); setEmail(u.email||''); setPhone(u.phone||''); setBio(u.bio||''); setRole(u.role||'agent') }) }, [])

  async function submit(e:FormEvent){e.preventDefault(); setSaved(false); setError(''); const r=await fetch(`/api/users/${id}`,{method:'PATCH',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:name.trim(),phone:phone.trim(),bio:bio.trim()})}); if(!r.ok){const d=await r.json().catch(()=>null) as any; setError(d?.message||'ذخیره پروفایل انجام نشد.');return} setSaved(true)}

  return <main className={styles.standaloneAdmin} dir="rtl"><header className={styles.simpleTopbar}><a href="/admin"><ArrowRight size={18}/> بازگشت</a><strong>پروفایل من</strong></header><section className={`${styles.formCard} ${styles.profileCard}`}><div className={styles.profileHero}><div className={styles.profileAvatar}><UserRound size={28}/></div><div><h1>{name || 'پروفایل ivila'}</h1><span>{role==='admin'?'ادمین اصلی':'مشاور'}</span></div></div>{error&&<div className={styles.errorBox}>{error}</div>}{saved&&<div className={styles.successBox}>پروفایل ذخیره شد.</div>}<form className={styles.fieldsGrid} onSubmit={submit}><label className={styles.field}><span>نام و نام خانوادگی</span><input required value={name} onChange={e=>setName(e.target.value)}/></label><label className={styles.field}><span>ایمیل ورود</span><input value={email} disabled dir="ltr"/></label><label className={styles.field}><span>شماره موبایل</span><input value={phone} onChange={e=>setPhone(e.target.value)} dir="ltr"/></label><label className={`${styles.field} ${styles.span2}`}><span>درباره من</span><textarea rows={4} value={bio} onChange={e=>setBio(e.target.value)} placeholder="مثلاً محدوده تخصصی، سابقه و توضیح کوتاه"/></label><button className={`${styles.primaryButton} ${styles.span2}`}><Save size={17}/> ذخیره پروفایل</button></form></section></main>
}
