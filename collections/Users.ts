import type { CollectionConfig } from 'payload'
import { normalizeIranPhone } from '@/lib/phone'
import { effectiveUserRole } from '@/lib/ivila-user-role'

function isActiveUser(user: unknown) {
  return (user as { isActive?: boolean } | null | undefined)?.isActive !== false
}

export const Users: CollectionConfig = {
  slug: 'users',
  labels: {
    singular: 'کاربر',
    plural: 'کاربران',
  },
  auth: {
    loginWithUsername: {
      allowEmailLogin: true, // migration fallback for the existing admin account
      requireEmail: false,
    },
  },
  admin: {
    useAsTitle: 'name',
    group: 'مدیریت',
    defaultColumns: ['name', 'phone', 'role', 'updatedAt'],
  },
  access: {
    create: ({ req }) => effectiveUserRole(req.user) === 'admin',
    read: ({ req }) => {
      if (effectiveUserRole(req.user) === 'admin') return true
      if (!req.user || !isActiveUser(req.user)) return false
      return { id: { equals: req.user.id } }
    },
    update: ({ req }) => {
      if (effectiveUserRole(req.user) === 'admin') return true
      if (!req.user || !isActiveUser(req.user)) return false
      return { id: { equals: req.user.id } }
    },
    delete: ({ req }) => effectiveUserRole(req.user) === 'admin',
  },
  hooks: {
    beforeLogin: [
      ({ user }: any) => {
        if (user?.isActive === false) throw new Error('این حساب توسط ادمین غیرفعال شده است.')
        return user
      },
    ],
    beforeChange: [
      ({ data, originalDoc }) => {
        const phone = normalizeIranPhone(data?.phone ?? originalDoc?.phone)
        if (phone) {
          data.phone = phone
          // Payload's username is the real auth identifier; keep it pinned to
          // the phone even on partial PATCH requests.
          data.username = phone
        }
        // If an old bootstrap admin was accidentally migrated as `agent`, any
        // subsequent profile save permanently repairs the stored role too.
        if (effectiveUserRole(originalDoc) === 'admin' && originalDoc?.role !== 'admin') {
          data.role = 'admin'
        }
        return data
      },
    ],
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      label: 'نام و نام خانوادگی',
      required: true,
    },
    {
      name: 'phone',
      type: 'text',
      label: 'شماره موبایل ورود',
      required: true,
      unique: true,
      admin: {
        description: 'شماره ورود به پنل؛ مانند 09121234567',
      },
    },
    {
      name: 'role',
      type: 'select',
      label: 'نقش',
      required: true,
      defaultValue: 'agent',
      options: [
        { label: 'ادمین اصلی', value: 'admin' },
        { label: 'مشاور', value: 'agent' },
      ],
      access: {
        update: ({ req }) => effectiveUserRole(req.user) === 'admin',
      },
    },
    {
      name: 'isActive',
      type: 'checkbox',
      label: 'حساب فعال',
      defaultValue: true,
      access: {
        update: ({ req }) => effectiveUserRole(req.user) === 'admin',
      },
      admin: {
        description: 'اگر خاموش شود، مشاور دیگر اجازه ورود و استفاده از پنل را ندارد.',
      },
    },
    {
      name: 'bio',
      type: 'textarea',
      label: 'توضیحات پروفایل',
    },
  ],
}
