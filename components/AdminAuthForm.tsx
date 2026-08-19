'use client'

import { FormEvent, useMemo, useState } from 'react'
import styles from './AdminAuthForm.module.css'

type Props = {
  hasUsers: boolean
}

function getErrorMessage(payload: any, fallback: string) {
  if (typeof payload?.message === 'string' && payload.message.trim()) return payload.message
  if (Array.isArray(payload?.errors) && payload.errors.length) {
    const first = payload.errors[0]
    if (typeof first?.message === 'string') return first.message
  }
  return fallback
}

export default function AdminAuthForm({ hasUsers }: Props) {
  const mode = hasUsers ? 'login' : 'create'
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const title = useMemo(
    () => (mode === 'create' ? 'ساخت اولین مدیر ivila' : 'ورود به مدیریت ivila'),
    [mode],
  )

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy) return

    setError('')
    setBusy(true)

    try {
      const endpoint = mode === 'create' ? '/api/users/first-register' : '/api/users/login'
      const body = mode === 'create' ? { name, email, password } : { email, password }

      const response = await fetch(endpoint, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      })

      let result: any = null
      try {
        result = await response.json()
      } catch {
        // Payload may return a response without JSON in an unexpected failure path.
      }

      if (!response.ok) {
        setError(
          getErrorMessage(
            result,
            mode === 'create'
              ? 'ساخت حساب مدیر انجام نشد. اطلاعات را بررسی کن.'
              : 'ایمیل یا رمز عبور صحیح نیست.',
          ),
        )
        return
      }

      // Payload sets its own HTTP-only auth cookie. A full navigation makes the
      // authenticated /admin tree render from a clean request.
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
          <p>
            پنل مدیریت فایل‌های ساحلی، جنگلی و روستایی ivila متصل به دیتابیس واقعی.
          </p>
          <div className={styles.brandGlowOne} />
          <div className={styles.brandGlowTwo} />
        </aside>

        <div className={styles.formPanel}>
          <div className={styles.mobileBrand}>ivila</div>
          <div className={styles.heading}>
            <span className={styles.kicker}>{mode === 'create' ? 'راه‌اندازی اولیه' : 'پنل مدیریت'}</span>
            <h2>{title}</h2>
            <p>
              {mode === 'create'
                ? 'این حساب، مدیر اصلی پنل خواهد بود. بعد از ساخت، مستقیماً وارد داشبورد می‌شوی.'
                : 'برای ثبت، ویرایش و مدیریت فایل‌های املاک وارد حساب مدیر شو.'}
            </p>
          </div>

          <form className={styles.form} onSubmit={onSubmit}>
            {mode === 'create' && (
              <label className={styles.field}>
                <span>نام مدیر</span>
                <input
                  autoComplete="name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="مثلاً مدیر ivila"
                />
              </label>
            )}

            <label className={styles.field}>
              <span>ایمیل</span>
              <input
                required
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="admin@example.com"
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
                onChange={(event) => setPassword(event.target.value)}
                placeholder="حداقل ۸ کاراکتر"
                dir="ltr"
              />
            </label>

            {error && <div className={styles.error}>{error}</div>}

            <button className={styles.submit} type="submit" disabled={busy}>
              {busy
                ? 'در حال انجام...'
                : mode === 'create'
                  ? 'ساخت مدیر و ورود'
                  : 'ورود به پنل'}
            </button>
          </form>

          <a className={styles.back} href="/">
            بازگشت به سایت
          </a>
        </div>
      </section>
    </main>
  )
}
