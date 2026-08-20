import type { Metadata } from 'next'
import '@fontsource-variable/vazirmatn/wght.css'
import '../globals.css'
import 'maplibre-gl/dist/maplibre-gl.css'

export const metadata: Metadata = {
  title: 'املاک شمال | فایل‌های ملکی',
  description: 'سامانه جستجو و مدیریت فایل‌های ملکی شمال با محور نقشه و محدوده‌های جغرافیایی.'
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fa" dir="rtl">
      <body>{children}</body>
    </html>
  )
}
