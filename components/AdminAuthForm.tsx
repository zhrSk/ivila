'use client'

import { FormEvent, useState } from 'react'
import { isValidIranMobile, normalizeIranPhone } from '@/lib/phone'
import styles from './AdminAuthForm.module.css'

function getErrorMessage(payload: any, fallback: string) {
  if (typeof payload?.message === 'string' && payload.message.trim()) return payload.message
  if (Array.isArray(payload?.errors) && payload.errors.length) {
    const first = payload.errors[0]
    if (typeof first?.message === 'string') return first.message
  }
  return fallback
}

export default function AdminAuthForm() {
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy) return

    const rawIdentifier = identifier.trim()
    const isLegacyEmail = rawIdentifier.includes('@')
    const phone = normalizeIranPhone(rawIdentifier)

    if (!isLegacyEmail && !isValidIranMobile(phone)) {
      setError('شماره موبایل را به شکل 09121234567 وارد کن.')
      return
    }

    setError('')
    setBusy(true)

    try {
      const response = await fetch('/api/users/login', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(isLegacyEmail
          ? { email: rawIdentifier, password }
          : { username: phone, password }),
      })

      let result: any = null
      try { result = await response.json() } catch { /* readable fallback below */ }

      if (!response.ok) {
        setError(getErrorMessage(result, 'شماره موبایل یا رمز عبور صحیح نیست.'))
        return
      }

      window.location.assign('/admin')
    } catch {
      setError('ارتباط با سرور برقرار نشد. دوباره تلاش کن.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className={styles.page} dir="rtl">
      <section className={styles.shell}>
        <aside className={styles.brandPanel}>
          <div className={styles.brand}>املاک شمال</div>
          <p className={styles.brandEyebrow}>PROPERTY MANAGEMENT</p>
          <h1>مدیریت فایل‌های ملکی، سریع و نقشه‌محور.</h1>
          <p>پنل مدیریت فایل‌های ساحلی، جنگلی و روستایی متصل به دیتابیس واقعی.</p>
          <div className={styles.brandGlowOne} />
          <div className={styles.brandGlowTwo} />
        </aside>

        <div className={styles.formPanel}>
          <div className={styles.mobileBrand}>املاک شمال</div>
          <div className={styles.heading}>
            <span className={styles.kicker}>پنل مدیریت</span>
            <h2>ورود به مدیریت املاک</h2>
            <p>با شماره موبایل و رمز عبور وارد شو.</p>
          </div>

          <form className={styles.form} onSubmit={onSubmit}>
            <label className={styles.field}>
              <span>شماره موبایل</span>
              <input
                required
                type="tel"
                inputMode="numeric"
                autoComplete="username"
                value={identifier}
                onChange={event => setIdentifier(event.target.value)}
                placeholder="09121234567"
                dir="ltr"
              />
            </label>

            <label className={styles.field}>
              <span>رمز عبور</span>
              <input
                required
                minLength={8}
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={event => setPassword(event.target.value)}
                placeholder="حداقل ۸ کاراکتر"
                dir="ltr"
              />
            </label>

            {error && <div className={styles.error}>{error}</div>}
            <button className={styles.submit} type="submit" disabled={busy}>
              {busy ? 'در حال ورود...' : 'ورود به پنل'}
            </button>
          </form>

          <a className={styles.back} href="/">بازگشت به سایت</a>
        </div>
      </section>
    </main>
  )
}
