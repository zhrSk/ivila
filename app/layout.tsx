import type { Metadata } from 'next'
import '@fontsource-variable/vazirmatn/wght.css'
import './globals.css'
import 'maplibre-gl/dist/maplibre-gl.css'

export const metadata: Metadata = {
  title: 'ivila | املاک ساحلی و جنگلی رویان',
  description: 'ivila؛ جستجو و کشف ملک در رویان با محور نقشه، محدوده‌های جغرافیایی و فایل‌های ساحلی و جنگلی.'
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fa" dir="rtl">
      <body>{children}</body>
    </html>
  )
}
