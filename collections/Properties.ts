import type { CollectionConfig } from 'payload'

function slugifyCode(code?: string) {
  return code?.trim().toLowerCase().replace(/\s+/g, '-')
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
      if (req.user) return true
      return {
        status: {
          equals: 'published',
        },
      }
    },
  },
  hooks: {
    beforeValidate: [
      ({ data }) => {
        if (data?.code) data.slug = slugifyCode(data.code)
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
                  required: true,
                  unique: true,
                  index: true,
                  admin: { width: '30%', placeholder: 'IV-109' },
                },
                {
                  name: 'title',
                  type: 'text',
                  label: 'عنوان فایل',
                  required: true,
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
                  required: true,
                  index: true,
                  defaultValue: 'sale',
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
                  required: true,
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
                  required: true,
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
                  min: 0,
                  index: true,
                  admin: { width: '50%' },
                },
                {
                  name: 'rooms',
                  type: 'number',
                  label: 'تعداد خواب',
                  required: true,
                  defaultValue: 0,
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
              required: true,
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
              required: true,
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
              name: 'locationText',
              type: 'text',
              label: 'آدرس/محدوده قابل نمایش',
              required: true,
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
                description: 'فرمت Payload: ابتدا Longitude و سپس Latitude. در مرحله بعد انتخاب مستقیم روی نقشه را به پنل اضافه می‌کنیم.',
              },
            },
            {
              type: 'row',
              fields: [
                {
                  name: 'seaDistanceM',
                  type: 'number',
                  label: 'فاصله تا دریا (متر)',
                  min: 0,
                  index: true,
                  admin: { width: '50%' },
                },
                {
                  name: 'forestDistanceM',
                  type: 'number',
                  label: 'فاصله تا جنگل (متر)',
                  min: 0,
                  index: true,
                  admin: { width: '50%' },
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
                appearance: 'drawer',
                description: 'تصویر اول، کاور اصلی فایل است. تصاویر را می‌توانی Drag & Drop مرتب کنی.',
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
