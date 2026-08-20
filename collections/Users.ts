import type { CollectionConfig } from 'payload'

function roleOf(user: unknown) {
  return (user as { role?: string } | null | undefined)?.role
}

export const Users: CollectionConfig = {
  slug: 'users',
  labels: {
    singular: 'کاربر',
    plural: 'کاربران',
  },
  auth: true,
  admin: {
    useAsTitle: 'email',
    group: 'مدیریت',
    defaultColumns: ['name', 'email', 'role', 'phone', 'updatedAt'],
  },
  access: {
    create: ({ req }) => roleOf(req.user) === 'admin',
    read: ({ req }) => {
      if (roleOf(req.user) === 'admin') return true
      if (!req.user) return false
      return { id: { equals: req.user.id } }
    },
    update: ({ req }) => {
      if (roleOf(req.user) === 'admin') return true
      if (!req.user) return false
      return { id: { equals: req.user.id } }
    },
    delete: ({ req }) => roleOf(req.user) === 'admin',
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
      label: 'شماره موبایل',
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
        update: ({ req }) => roleOf(req.user) === 'admin',
      },
    },
    {
      name: 'bio',
      type: 'textarea',
      label: 'توضیحات پروفایل',
    },
  ],
}
