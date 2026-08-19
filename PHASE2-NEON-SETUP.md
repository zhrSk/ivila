# ivila — Phase 2: Neon + Payload Admin

این فاز UI تأییدشده‌ی سایت را تغییر نمی‌دهد. فقط Backend واقعی، دیتابیس و پنل مدیریت را اضافه می‌کند.

## چیزی که اضافه شده

- Payload CMS داخل همان پروژه Next.js
- پنل مدیریت در `/admin`
- Neon PostgreSQL به‌عنوان دیتابیس اصلی
- Point جغرافیایی هر ملک برای جستجوی مکانی
- PostGIS در Neon
- خواندن فایل‌های منتشرشده از دیتابیس در Home و صفحه جزئیات
- fallback به فایل‌های Demo تا وقتی دیتابیس خالی است
- Seed برای انتقال فایل‌های Demo به دیتابیس
- Vercel Blob اختیاری برای آپلود دائمی تصاویر

## 1) PostGIS را در Neon فعال کن

در Neon → SQL Editor این فایل را اجرا کن:

```sql
CREATE EXTENSION IF NOT EXISTS postgis;
SELECT PostGIS_Version();
```

همین SQL داخل `db/neon-postgis.sql` هم وجود دارد.

## 2) Environment Variables

چون Neon را به Vercel وصل کرده‌ای، `DATABASE_URL` باید در Vercel Project → Settings → Environment Variables موجود باشد.

یک secret جدید هم برای Payload لازم است. روی ویندوز می‌توانی بسازی:

```cmd
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

خروجی را در Vercel با نام زیر ذخیره کن:

```text
PAYLOAD_SECRET=<random-value>
```

برای اجرای Local، در ریشه پروژه `.env.local` بساز:

```env
DATABASE_URL=postgresql://...
PAYLOAD_SECRET=...
```

`PAYLOAD_SECRET` را commit نکن.

## 3) پکیج‌ها

```cmd
npm install
```

## 4) یک بار Schema را روی Neon بساز

چون دیتابیس فعلاً دیتابیس Demo/Development پروژه است، ساده‌ترین راه برای اولین راه‌اندازی این است که Local Dev را با همین `DATABASE_URL` اجرا کنی:

```cmd
npm run dev
```

Payload در Development از Drizzle push استفاده می‌کند و جدول‌های اولیه را می‌سازد.

بعد برو به:

```text
http://localhost:3000/admin
```

اولین Admin User را بساز.

## 5) فایل‌های Demo را وارد Neon کن

بعد از ساخته‌شدن schema:

```cmd
npm run seed
```

Seed بر اساس `code` کار می‌کند؛ دوباره اجرا شود رکوردهای همان فایل‌ها را Update می‌کند و Duplicate نمی‌سازد.

حالا صفحه اصلی باید اطلاعات را از Neon بگیرد. اگر دیتابیس خالی یا موقتاً در دسترس نباشد، سایت Demo به فایل‌های محلی fallback می‌کند تا نمایش مشتری خراب نشود.

## 6) تصاویر روی Vercel

برای اینکه عکس‌هایی که از `/admin` آپلود می‌شوند بعد از Redeploy از بین نروند، در Vercel برای پروژه یک Blob Store بساز.

وقتی `BLOB_READ_WRITE_TOKEN` در Environment Variables وجود داشته باشد، پروژه به‌صورت خودکار Vercel Blob را برای Collection تصاویر فعال می‌کند. `clientUploads` نیز فعال است.

بدون Blob، ثبت اطلاعات ملک کار می‌کند؛ ولی برای آپلود دائمی تصویر روی Vercel از Blob استفاده کن.

## 7) Redeploy

بعد از Push فایل‌های این فاز و اضافه‌کردن `PAYLOAD_SECRET`، پروژه را Redeploy کن.

آدرس‌های مهم:

```text
/                  سایت ivila
/admin             پنل مدیریت
/api/properties     REST API فایل‌ها
/api/media          REST API تصاویر
```

## Workflow فعلی دیتابیس

برای همین نسخه Demo، Neon فعلی را می‌توانیم sandbox پروژه در نظر بگیریم و با Development Push جلو برویم.

قبل از Production واقعی مشتری، workflow را به migration-based تغییر می‌دهیم:

1. تغییر schema در development
2. `npm run migrate:create`
3. commit فایل migration
4. اجرای `payload migrate` در CI قبل از build

## مرحله بعد

مرحله بعدی پنل مدیریت را مخصوص کار مشاور املاک می‌کنیم:

- انتخاب Point ملک با کلیک مستقیم روی MapLibre، نه واردکردن دستی longitude/latitude
- ثبت سریع فایل در یک فرم کوتاه
- Drag & Drop تصاویر
- محاسبه خودکار فاصله تا دریا/جنگل از PostGIS
- Import فایل‌ها از Excel/CSV
