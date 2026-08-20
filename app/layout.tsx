import type { Metadata } from 'next'
import '@fontsource-variable/vazirmatn/wght.css'
import './globals.css'
import 'maplibre-gl/dist/maplibre-gl.css'

export const metadata: Metadata = {
  title: { default: 'املاک شمال', template: '%s | املاک شمال' },
  description: 'سامانه عمومی جستجو و مدیریت فایل‌های ملکی شمال.'
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fa" dir="rtl">
      <body>{children}</body>
    </html>
  )
}
