import type { Metadata } from 'next'
import '@fontsource-variable/vazirmatn/wght.css'
import './globals.css'
import 'maplibre-gl/dist/maplibre-gl.css'

const siteTitle = 'املاک شمال | فایل‌های ساحلی و جنگلی'
const siteDescription = 'جستجو و بررسی فایل‌های ملکی شمال با فیلترهای منطقه‌ای، نقشه و دسته‌بندی ساحلی و جنگلی.'

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://north-estate.vercel.app'),
  title: siteTitle,
  description: siteDescription,
  applicationName: 'املاک شمال',
  openGraph: {
    type: 'website',
    locale: 'fa_IR',
    url: '/',
    siteName: 'املاک شمال',
    title: siteTitle,
    description: siteDescription,
  },
  twitter: {
    card: 'summary_large_image',
    title: siteTitle,
    description: siteDescription,
  },
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fa" dir="rtl">
      <body>{children}</body>
    </html>
  )
}
