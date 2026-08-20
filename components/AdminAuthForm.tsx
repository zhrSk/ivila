'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'
import { isValidIranMobile, normalizeIranPhone } from '@/lib/phone'
import styles from './AdminAuthForm.module.css'

type Mode = 'login' | 'create'

type Health = {
  ok: boolean
  code?: string
  hasUsers?: boolean
  message?: string
}

function getErrorMessage(payload: any, fallback: string) {
  if (typeof payload?.message === 'string' && payload.message.trim()) return payload.message
  if (Array.isArray(payload?.errors) && payload.errors.length) {
    const first = payload.errors[0]
    if (typeof first?.message === 'string') return first.message
  }
  return fallback
}

export default function AdminAuthForm() {
  const [mode, setMode] = useState<Mode>('login')
  const [health, setHealth] = useState<Health | null>(null)
  const [healthLoading, setHealthLoading] = useState(true)
  const [name, setName] = useState('')
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let alive = true

    fetch('/api/ivila-admin-health', { cache: 'no-store' })
      .then(async response => {
        const data = (await response.json()) as Health
        if (!alive) return
        setHealth(data)
        if (data.ok && data.hasUsers === false) setMode('create')
      })
      .catch(() => {
        if (!alive) return
        setHealth({
          ok: false,
          code: 'HEALTH_REQUEST_FAILED',
          message: 'بررسی وضعیت Backend انجام نشد. لاگ Vercel را بررسی کن.',
        })
      })
      .finally(() => {
        if (alive) setHealthLoading(false)
      })

    return () => { alive = false }
  }, [])

  const title = useMemo(
    () => (mode === 'create' ? 'ساخت اولین مدیر ivila' : 'ورود به مدیریت ivila'),
    [mode],
  )

  const backendReady = health?.ok === true

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy) return

    if (!backendReady) {
      setError(health?.message || 'Backend مدیریت هنوز آماده نیست.')
      return
    }

    const rawIdentifier = identifier.trim()
    const isLegacyEmail = mode === 'login' && rawIdentifier.includes('@')
    const phone = normalizeIranPhone(rawIdentifier)

    if (!isLegacyEmail && !isValidIranMobile(phone)) {
      setError('شماره موبایل را به شکل 09121234567 وارد کن.')
      return
    }

    setError('')
    setBusy(true)

    try {
      const endpoint = mode === 'create' ? '/api/users/first-register' : '/api/users/login'
      const body = mode === 'create'
        ? { name: name.trim(), username: phone, phone, password, role: 'admin' }
        : isLegacyEmail
          ? { email: rawIdentifier, password }
          : { username: phone, password }

      const response = await fetch(endpoint, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      let result: any = null
      try { result = await response.json() } catch { /* readable fallback below */ }

      if (!response.ok) {
        setError(getErrorMessage(result, mode === 'create'
          ? 'ساخت حساب مدیر انجام نشد. اطلاعات را بررسی کن.'
          : 'شماره موبایل یا رمز عبور صحیح نیست.'))
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
          <div className={styles.brand}>ivila</div>
          <p className={styles.brandEyebrow}>ROYAN REAL ESTATE</p>
          <h1>مدیریت فایل‌های ملکی، سریع و نقشه‌محور.</h1>
          <p>پنل مدیریت فایل‌های ساحلی، جنگلی و روستایی ivila متصل به دیتابیس واقعی.</p>
          <div className={styles.brandGlowOne} />
          <div className={styles.brandGlowTwo} />
        </aside>

        <div className={styles.formPanel}>
          <div className={styles.mobileBrand}>ivila</div>
          <div className={styles.heading}>
            <span className={styles.kicker}>{mode === 'create' ? 'راه‌اندازی اولیه' : 'پنل مدیریت'}</span>
            <h2>{title}</h2>
            <p>{mode === 'create' ? 'این حساب، مدیر اصلی پنل خواهد بود.' : 'با شماره موبایل و رمز عبور وارد شو.'}</p>
          </div>

          {healthLoading && <div className={styles.status}>در حال بررسی اتصال Neon و Payload...</div>}
          {!healthLoading && health && !health.ok && (
            <div className={styles.error}>
              <strong>Backend هنوز آماده نیست.</strong>
              <div>{health.message}</div>
              <div style={{ marginTop: 6, opacity: 0.75, direction: 'ltr' }}>Code: {health.code}</div>
            </div>
          )}

          <form className={styles.form} onSubmit={onSubmit}>
            {mode === 'create' && (
              <label className={styles.field}>
                <span>نام مدیر</span>
                <input autoComplete="name" value={name} onChange={event => setName(event.target.value)} placeholder="مثلاً مدیر ivila" />
              </label>
            )}

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
                autoComplete={mode === 'create' ? 'new-password' : 'current-password'}
                value={password}
                onChange={event => setPassword(event.target.value)}
                placeholder="حداقل ۸ کاراکتر"
                dir="ltr"
              />
            </label>

            {error && <div className={styles.error}>{error}</div>}
            <button className={styles.submit} type="submit" disabled={busy || !backendReady}>
              {busy ? 'در حال انجام...' : mode === 'create' ? 'ساخت مدیر و ورود' : 'ورود به پنل'}
            </button>
          </form>

          {backendReady && (
            <button
              type="button"
              onClick={() => { setError(''); setMode(current => current === 'login' ? 'create' : 'login') }}
              style={{ border: 0, background: 'transparent', font: 'inherit', cursor: 'pointer', color: '#315f55', marginTop: 14 }}
            >
              {mode === 'login' ? 'اولین راه‌اندازی است؟ ساخت مدیر' : 'قبلاً مدیر ساخته‌ای؟ ورود'}
            </button>
          )}

          <a className={styles.back} href="/">بازگشت به سایت</a>
        </div>
      </section>
    </main>
  )
}
