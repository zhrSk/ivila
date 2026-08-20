import { computeEnvironmentalDistances } from '@/lib/spatial-distance'
import type { CollectionConfig, Where } from 'payload'

function slugifyCode(code?: string) {
  return code?.trim().toLowerCase().replace(/\s+/g, '-')
}

function roleOf(user: unknown) {
  return (user as { role?: string } | null | undefined)?.role
}

function isActiveUser(user: unknown) {
  return (user as { isActive?: boolean } | null | undefined)?.isActive !== false
}

function userId(user: unknown) {
  const value = (user as { id?: string | number } | null | undefined)?.id
  return value === undefined || value === null ? '' : String(value)
}

function isPublished(data: unknown) {
  return (data as { status?: string } | null | undefined)?.status === 'published'
}

function hasText(value: unknown) {
  return typeof value === 'string' && value.trim().length > 0
}

function blobImageCount(value: unknown) {
  if (typeof value !== 'string' || !value.trim()) return 0
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === 'string' && /^https?:\/\//i.test(item)).length : 0
  } catch {
    return 0
  }
}

function publishedOnlyWhere(): Where {
  return {
    status: { equals: 'published' },
  }
}

function agentReadableWhere(id: string): Where {
  return {
    or: [
      { status: { equals: 'published' } },
      { createdByUserId: { equals: id } },
    ],
  }
}

function agentOwnDraftWhere(id: string): Where {
  return {
    and: [
      { createdByUserId: { equals: id } },
      { status: { equals: 'draft' } },
    ],
  }
}

export const Properties: CollectionConfig = {
  slug: 'properties',
  labels: {
    singular: 'فایل ملک',
    plural: 'فایل‌های املاک',
  },
  admin: {
    useAsTitle: 'title',
    group: 'فایل‌های ملکی',
    defaultColumns: ['code', 'title', 'deal', 'type', 'locationText', 'status', 'updatedAt'],
    description: 'ثبت و مدیریت فایل‌های ivila؛ موقعیت هر ملک به‌صورت نقطه جغرافیایی ذخیره می‌شود.',
  },
  access: {
    read: ({ req }) => {
      if (!req.user) return publishedOnlyWhere()
      if (!isActiveUser(req.user)) return false
      if (roleOf(req.user) === 'admin') return true
      return agentReadableWhere(userId(req.user))
    },
    create: ({ req }) => Boolean(req.user && isActiveUser(req.user)),
    update: ({ req }) => {
      if (!req.user || !isActiveUser(req.user)) return false
      if (roleOf(req.user) === 'admin') return true
      return agentOwnDraftWhere(userId(req.user))
    },
    delete: ({ req }) => {
      if (!req.user || !isActiveUser(req.user)) return false
      if (roleOf(req.user) === 'admin') return true
      return agentOwnDraftWhere(userId(req.user))
    },
  },
  hooks: {
    beforeChange: [
      async ({ data, originalDoc, req }) => {
        const role = roleOf(req.user)
        const currentUserId = userId(req.user)
        if (currentUserId) {
          if (!originalDoc?.createdByUserId) data.createdByUserId = currentUserId
          else data.createdByUserId = originalDoc.createdByUserId
        }
        if (role === 'agent') {
          // Consultant submissions always return to the review queue.
          data.status = 'draft'
          data.featured = false
          data.reviewStatus = 'pending'
          data.reviewNote = originalDoc?.reviewNote || ''
          data.reviewedByUserId = originalDoc?.reviewedByUserId || ''
          data.reviewedAt = originalDoc?.reviewedAt || null
        } else if (role === 'admin') {
          const requestedReviewStatus = String(data?.reviewStatus || originalDoc?.reviewStatus || '')
          if (data?.status === 'published') {
            data.reviewStatus = 'approved'
            data.reviewedByUserId = currentUserId
            data.reviewedAt = new Date().toISOString()
          } else if (requestedReviewStatus === 'changes_requested' || requestedReviewStatus === 'rejected') {
            data.status = 'draft'
            data.featured = false
            data.reviewStatus = requestedReviewStatus
            data.reviewedByUserId = currentUserId
            data.reviewedAt = new Date().toISOString()
          } else if (!data?.reviewStatus && originalDoc?.reviewStatus) {
            data.reviewStatus = originalDoc.reviewStatus
          }
        }

        const coordinates = data?.coordinates ?? originalDoc?.coordinates
        if (Array.isArray(coordinates) && coordinates.length === 2) {
          const longitude = Number(coordinates[0])
          const latitude = Number(coordinates[1])
          if (Number.isFinite(longitude) && Number.isFinite(latitude)) {
            data.publicLng = Math.round(longitude * 100) / 100
            data.publicLat = Math.round(latitude * 100) / 100
            try {
              const distances = await computeEnvironmentalDistances(req.payload, longitude, latitude)
              if (distances.seaDistanceM !== null) data.seaDistanceM = distances.seaDistanceM
              if (distances.forestDistanceM !== null) data.forestDistanceM = distances.forestDistanceM
            } catch (error) {
              req.payload.logger.warn({ err: error }, 'ivila: environmental distance calculation failed')
            }
          }
        }
        return data
      },
    ],
    beforeValidate: [
      ({ data }) => {
        if (data?.code) data.slug = slugifyCode(data.code)
        // Environmental distances are backend-derived; never trust manual API values.
        if (data) {
          delete data.seaDistanceM
          delete data.forestDistanceM
        }
        return data
      },
    ],
  },
  fields: [
    {
      type: 'tabs',
      tabs: [
        {
          label: 'اطلاعات اصلی',
          fields: [
            {
              type: 'row',
              fields: [
                {
                  name: 'code',
                  type: 'text',
                  label: 'کد فایل',
                  unique: true,
                  validate: (value: unknown, { data, req }: any) =>
                    roleOf(req.user) === 'admin' && isPublished(data) && !hasText(value)
                      ? 'برای انتشار فایل، کد فایل اجباری است.'
                      : true,
                  index: true,
                  admin: { width: '30%', placeholder: 'IV-109' },
                },
                {
                  name: 'title',
                  type: 'text',
                  label: 'عنوان فایل',
                  validate: (value: unknown, { data, req }: any) =>
                    roleOf(req.user) === 'admin' && isPublished(data) && !hasText(value)
                      ? 'برای انتشار فایل، عنوان اجباری است.'
                      : true,
                  index: true,
                  admin: { width: '70%' },
                },
              ],
            },
            {
              name: 'slug',
              type: 'text',
              unique: true,
              index: true,
              admin: { hidden: true },
            },
            {
              type: 'row',
              fields: [
                {
                  name: 'deal',
                  type: 'select',
                  label: 'نوع معامله',
                  validate: (value: unknown, { data, req }: any) =>
                    roleOf(req.user) === 'admin' && isPublished(data) && !hasText(value)
                      ? 'برای انتشار فایل، نوع معامله اجباری است.'
                      : true,
                  index: true,
                  options: [
                    { label: 'فروش', value: 'sale' },
                    { label: 'اجاره', value: 'rent' },
                  ],
                  admin: { width: '33%' },
                },
                {
                  name: 'type',
                  type: 'select',
                  label: 'نوع ملک',
                  validate: (value: unknown, { data, req }: any) =>
                    roleOf(req.user) === 'admin' && isPublished(data) && !hasText(value)
                      ? 'برای انتشار فایل، نوع ملک اجباری است.'
                      : true,
                  index: true,
                  options: [
                    { label: 'ویلا', value: 'villa' },
                    { label: 'زمین', value: 'land' },
                    { label: 'آپارتمان', value: 'apartment' },
                  ],
                  admin: { width: '33%' },
                },
                {
                  name: 'lifestyle',
                  type: 'select',
                  label: 'سبک منطقه',
                  validate: (value: unknown, { data, req }: any) =>
                    roleOf(req.user) === 'admin' && isPublished(data) && !hasText(value)
                      ? 'برای انتشار فایل، سبک منطقه اجباری است.'
                      : true,
                  index: true,
                  options: [
                    { label: 'ساحلی', value: 'coast' },
                    { label: 'جنگلی', value: 'forest' },
                    { label: 'روستایی', value: 'village' },
                    { label: 'شهری', value: 'urban' },
                  ],
                  admin: { width: '34%' },
                },
              ],
            },
            {
              type: 'row',
              fields: [
                {
                  name: 'areaM2',
                  type: 'number',
                  label: 'متراژ (متر مربع)',
                  required: true,
                  min: 1,
                  index: true,
                  admin: { width: '50%' },
                },
                {
                  name: 'rooms',
                  type: 'number',
                  label: 'تعداد خواب',
                  validate: (value: unknown, { data, req }: any) =>
                    roleOf(req.user) === 'admin' && isPublished(data) && (value === null || value === undefined)
                      ? 'برای انتشار فایل، تعداد خواب را مشخص کن.'
                      : true,
                  min: 0,
                  index: true,
                  admin: { width: '50%' },
                },
              ],
            },
            {
              name: 'documentStatus',
              type: 'select',
              label: 'وضعیت سند',
              validate: (value: unknown, { data, req }: any) =>
                roleOf(req.user) === 'admin' && isPublished(data) && !hasText(value)
                  ? 'برای انتشار فایل، وضعیت سند را مشخص کن.'
                  : true,
              index: true,
              options: [
                { label: 'سند تک‌برگ', value: 'single-page' },
                { label: 'سند شورایی', value: 'council' },
                { label: 'قولنامه‌ای', value: 'contract' },
                { label: 'در حال اخذ سند', value: 'in-progress' },
              ],
            },
            {
              name: 'description',
              type: 'textarea',
              label: 'توضیحات فایل',
              validate: (value: unknown, { data, req }: any) =>
                roleOf(req.user) === 'admin' && isPublished(data) && !hasText(value)
                  ? 'برای انتشار فایل، توضیحات اجباری است.'
                  : true,
            },
          ],
        },
        {
          label: 'قیمت و شرایط',
          fields: [
            {
              name: 'priceDisplay',
              type: 'text',
              label: 'متن قیمت برای نمایش',
              admin: { description: 'اگر خالی باشد، سایت قیمت را از اعداد زیر می‌سازد.' },
            },
            {
              type: 'row',
              fields: [
                {
                  name: 'salePriceToman',
                  type: 'number',
                  label: 'قیمت فروش (تومان)',
                  min: 0,
                  index: true,
                  admin: { width: '33%' },
                },
                {
                  name: 'depositToman',
                  type: 'number',
                  label: 'ودیعه (تومان)',
                  min: 0,
                  admin: { width: '33%' },
                },
                {
                  name: 'monthlyRentToman',
                  type: 'number',
                  label: 'اجاره ماهانه (تومان)',
                  min: 0,
                  index: true,
                  admin: { width: '34%' },
                },
              ],
            },
          ],
        },
        {
          label: 'موقعیت روی نقشه',
          fields: [
            {
              type: 'row',
              fields: [
                {
                  name: 'ownerName',
                  type: 'text',
                  label: 'نام مالک',
                  validate: (value: unknown, { data, req }: any) =>
                    (roleOf(req.user) === 'agent' || (roleOf(req.user) === 'admin' && isPublished(data))) && !hasText(value)
                      ? 'نام مالک برای ثبت مشاور و انتشار فایل اجباری است.'
                      : true,
                  admin: { width: '50%' },
                  access: { read: ({ req }) => Boolean(req.user) },
                },
                {
                  name: 'ownerPhone',
                  type: 'text',
                  label: 'شماره مالک',
                  validate: (value: unknown, { data, req }: any) =>
                    (roleOf(req.user) === 'agent' || (roleOf(req.user) === 'admin' && isPublished(data))) && !hasText(value)
                      ? 'شماره مالک برای ثبت مشاور و انتشار فایل اجباری است.'
                      : true,
                  admin: { width: '50%' },
                  access: { read: ({ req }) => Boolean(req.user) },
                },
              ],
            },
            {
              name: 'ownerNotes',
              type: 'textarea',
              label: 'یادداشت داخلی مالک',
              access: { read: ({ req }) => Boolean(req.user) },
            },
            {
              name: 'locationText',
              type: 'text',
              label: 'آدرس/محدوده قابل نمایش',
              validate: (value: unknown, { data, req }: any) =>
                roleOf(req.user) === 'admin' && isPublished(data) && !hasText(value)
                  ? 'برای انتشار فایل، محدوده قابل نمایش را وارد کن.'
                  : true,
              index: true,
              admin: { placeholder: 'رویان، نوار ساحلی' },
            },
            {
              name: 'coordinates',
              type: 'point',
              label: 'مختصات ملک',
              required: true,
              index: true,
              admin: {
                description: 'مختصات دقیق فقط برای کاربران داخلی قابل مشاهده است.',
              },
              access: { read: ({ req }) => Boolean(req.user) },
            },
            { name: 'publicLng', type: 'number', admin: { hidden: true } },
            { name: 'publicLat', type: 'number', admin: { hidden: true } },
            { name: 'locationSource', type: 'text', admin: { hidden: true }, access: { read: ({ req }) => Boolean(req.user) } },
            { name: 'locationAccuracyM', type: 'number', admin: { hidden: true }, access: { read: ({ req }) => Boolean(req.user) } },
            { name: 'locationCapturedAt', type: 'date', admin: { hidden: true }, access: { read: ({ req }) => Boolean(req.user) } },
            {
              type: 'row',
              fields: [
                {
                  name: 'seaDistanceM',
                  type: 'number',
                  label: 'فاصله تا دریا (متر)',
                  min: 0,
                  index: true,
                  admin: { width: '50%', readOnly: true, description: 'خودکار از روی موقعیت ملک و لایه ساحلی PostGIS محاسبه می‌شود.' },
                },
                {
                  name: 'forestDistanceM',
                  type: 'number',
                  label: 'فاصله تا جنگل (متر)',
                  min: 0,
                  index: true,
                  admin: { width: '50%', readOnly: true, description: 'خودکار از روی موقعیت ملک و محدوده‌های جنگلی PostGIS محاسبه می‌شود.' },
                },
              ],
            },
          ],
        },
        {
          label: 'تصاویر و امکانات',
          fields: [
            {
              name: 'images',
              type: 'upload',
              relationTo: 'media',
              hasMany: true,
              maxRows: 30,
              label: 'تصاویر ملک',
              admin: {
                isSortable: true,
                description: 'تصویر اول، کاور اصلی فایل است. تصاویر را می‌توانی Drag & Drop مرتب کنی.',
              },
            },
            {
              name: 'imageUrlsJson',
              type: 'text',
              label: 'تصاویر Blob (OIDC)',
              validate: (value: unknown, { data, req }: any) => {
                const mustHaveImage = roleOf(req.user) === 'agent' || (roleOf(req.user) === 'admin' && isPublished(data))
                return mustHaveImage && blobImageCount(value) < 1
                  ? 'برای ثبت مشاور یا انتشار فایل، حداقل یک عکس اجباری است.'
                  : true
              },
              admin: {
                hidden: true,
                description: 'آرایه URL تصاویر Blob به‌صورت JSON. این فیلد عمداً تک‌ستونه است تا Migration production بدون table push انجام شود.',
              },
            },
            {
              name: 'fallbackImage',
              type: 'text',
              label: 'تصویر پیش‌فرض دمو',
              admin: { hidden: true },
            },
            {
              name: 'badges',
              type: 'text',
              hasMany: true,
              maxRows: 6,
              label: 'برچسب‌های کوتاه',
              admin: { description: 'مثلاً: ۳ دقیقه تا دریا، لب جنگل، نوساز' },
            },
            {
              name: 'amenities',
              type: 'text',
              hasMany: true,
              maxRows: 30,
              label: 'امکانات',
              admin: { description: 'مثلاً پارکینگ، آسانسور، حیاط خصوصی، تراس' },
            },
          ],
        },
        {
          label: 'انتشار',
          fields: [
            {
              name: 'createdByUserId',
              type: 'text',
              label: 'ثبت‌کننده',
              admin: { hidden: true },
              index: true,
              access: { read: ({ req }) => Boolean(req.user) },
            },
            {
              type: 'row',
              fields: [
                {
                  name: 'reviewStatus',
                  type: 'select',
                  label: 'وضعیت بررسی',
                  index: true,
                  options: [
                    { label: 'در انتظار بررسی', value: 'pending' },
                    { label: 'نیاز به اصلاح', value: 'changes_requested' },
                    { label: 'تأیید شده', value: 'approved' },
                    { label: 'رد شده', value: 'rejected' },
                  ],
                  access: { read: ({ req }) => Boolean(req.user) },
                  admin: { width: '50%' },
                },
                {
                  name: 'reviewedAt',
                  type: 'date',
                  label: 'زمان آخرین بررسی',
                  access: { read: ({ req }) => Boolean(req.user) },
                  admin: { width: '50%', readOnly: true },
                },
              ],
            },
            {
              name: 'reviewNote',
              type: 'textarea',
              label: 'یادداشت بررسی برای مشاور',
              validate: (value: unknown, { data, req }: any) =>
                roleOf(req.user) === 'admin' && ['changes_requested', 'rejected'].includes(String(data?.reviewStatus || '')) && !hasText(value)
                  ? 'برای نیاز به اصلاح یا رد فایل، توضیح ادمین را وارد کن.'
                  : true,
              access: { read: ({ req }) => Boolean(req.user) },
            },
            {
              name: 'reviewedByUserId',
              type: 'text',
              label: 'بررسی‌کننده',
              admin: { hidden: true },
              access: { read: ({ req }) => Boolean(req.user) },
            },
            {
              type: 'row',
              fields: [
                {
                  name: 'status',
                  type: 'select',
                  label: 'وضعیت فایل',
                  required: true,
                  index: true,
                  defaultValue: 'draft',
                  options: [
                    { label: 'پیش‌نویس', value: 'draft' },
                    { label: 'منتشر شده', value: 'published' },
                    { label: 'فروخته شده', value: 'sold' },
                    { label: 'اجاره داده شده', value: 'rented' },
                    { label: 'آرشیو', value: 'archived' },
                  ],
                  admin: { width: '50%' },
                },
                {
                  name: 'featured',
                  type: 'checkbox',
                  label: 'نمایش در فایل‌های منتخب',
                  defaultValue: false,
                  index: true,
                  admin: { width: '50%' },
                },
              ],
            },
          ],
        },
      ],
    },
  ],
}
