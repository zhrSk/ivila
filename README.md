# ivila — Real Estate Map Platform

سامانه املاک نقشه‌محور برای رویان، نور و محدوده‌های ساحلی/جنگلی اطراف.

## Stack

- Next.js + React + TypeScript
- MapLibre GL
- Payload CMS
- Neon PostgreSQL
- PostGIS
- Vercel deployment
- Vercel Blob (اختیاری/پیشنهادی برای تصاویر)

## Phase 2

در این فاز Frontend تأییدشده به Backend واقعی متصل شده است:

- `/admin` برای مدیریت فایل‌ها
- داده‌های منتشرشده از Neon خوانده می‌شوند
- موقعیت هر فایل به‌صورت Point ذخیره می‌شود
- سایت تا قبل از Seed شدن دیتابیس، فایل‌های Demo را fallback نمایش می‌دهد

راهنمای راه‌اندازی دقیق:

```text
PHASE2-NEON-SETUP.md
```

## Development

```bash
npm install
npm run dev
```

## Admin

```text
http://localhost:3000/admin
```

## Important

Polygonهای نمایشی فعلی UI مرز ثبتی/قانونی نیستند. در Production مرز روستاها، نوار ساحلی، جنگل و محدوده‌های فروش باید از لایه‌های GIS واقعی یا محدوده‌های تأییدشده‌ی خود آژانس وارد PostGIS شوند.
