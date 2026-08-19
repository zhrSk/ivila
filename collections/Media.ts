import type { CollectionConfig } from 'payload'

export const Media: CollectionConfig = {
  slug: 'media',
  labels: {
    singular: 'تصویر',
    plural: 'تصاویر',
  },
  admin: {
    useAsTitle: 'alt',
    group: 'فایل‌های ملکی',
  },
  access: {
    read: () => true,
    create: ({ req }) => Boolean(req.user),
    update: ({ req }) => Boolean(req.user),
    delete: ({ req }) => Boolean(req.user),
  },
  upload: {
    adminThumbnail: 'thumbnail',
    bulkUpload: true,
    mimeTypes: ['image/*'],
    imageSizes: [
      {
        name: 'thumbnail',
        width: 420,
        height: 280,
        fit: 'cover',
        position: 'centre',
      },
      {
        name: 'card',
        width: 960,
        height: 640,
        fit: 'cover',
        position: 'centre',
      },
      {
        name: 'detail',
        width: 1600,
        height: 1067,
        fit: 'cover',
        position: 'centre',
      },
    ],
  },
  fields: [
    {
      name: 'alt',
      type: 'text',
      label: 'متن جایگزین تصویر',
      required: true,
    },
  ],
}
