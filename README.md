# Royan Estate — Phase 1 Demo

دموی رابط کاربری سامانه املاک نقشه‌محور برای رویان و اطراف، با تمرکز روی املاک ساحلی، جنگلی، روستایی و شهری.

## قابلیت‌های این فاز

- صفحه Home اختصاصی و Responsive با طراحی RTL
- دسته‌بندی بر اساس سبک منطقه: ساحلی، جنگلی، روستایی، شهری
- فیلتر نوع ملک
- MapLibre GL JS با مرکز رویان
- Marker قیمت ملک‌ها
- Polygonهای نمایشی ساحلی/جنگلی
- رسم محدوده دلخواه توسط کاربر و فیلتر فایل‌های داخل Polygon
- صفحه جزئیات ملک
- ساختار TypeScript آماده اتصال به API و PostGIS

> Polygonهای پیش‌فرض دمو مرز قانونی/ثبتی نیستند و فقط برای نمایش UX ساخته شده‌اند.

## اجرا

```bash
npm install
npm run dev
```

سپس:

```text
http://localhost:3000
```

## Deploy روی Vercel

1. پروژه را در GitHub قرار دهید.
2. در Vercel گزینه **New Project** را بزنید.
3. Repository را Import کنید.
4. Framework به صورت خودکار Next.js تشخیص داده می‌شود.
5. Deploy را بزنید.

برای نسخه دمو، در صورت خالی بودن `NEXT_PUBLIC_MAP_STYLE_URL` از Raster Tile عمومی OpenStreetMap استفاده می‌شود. برای نسخه Production بهتر است یک Map Style تجاری/اختصاصی یا Tile Server خودمان تعریف شود.

## اتصال فاز بعد به PostGIS

مدل پیشنهادی حداقلی:

```sql
CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE properties (
  id bigserial PRIMARY KEY,
  title text NOT NULL,
  location geography(Point, 4326) NOT NULL
);

CREATE INDEX properties_location_gix
  ON properties USING GIST (location);

CREATE TABLE areas (
  id bigserial PRIMARY KEY,
  name text NOT NULL,
  kind text NOT NULL,
  boundary geography(Polygon, 4326) NOT NULL
);

CREATE INDEX areas_boundary_gix
  ON areas USING GIST (boundary);
```

جستجوی ملک داخل Polygon رسم‌شده کاربر بعداً در API با `ST_Intersects` / `ST_Within` انجام می‌شود و UI همین ساختار را حفظ می‌کند.
