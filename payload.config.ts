import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'
import { postgresAdapter } from '@payloadcms/db-postgres'
import { vercelBlobStorage } from '@payloadcms/storage-vercel-blob'
import { buildConfig } from 'payload'
import { Media } from './collections/Media'
import { Properties } from './collections/Properties'
import { Users } from './collections/Users'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)
const hasBlob = Boolean(process.env.BLOB_READ_WRITE_TOKEN)
const payloadSecret = process.env.PAYLOAD_SECRET || (process.env.NODE_ENV === 'development' ? 'ivila-local-development-secret-change-me' : '')

export default buildConfig({
  admin: {
    user: Users.slug,
    meta: {
      titleSuffix: ' | ivila Admin',
    },
    importMap: {
      baseDir: dirname,
      importMapFile: path.resolve(dirname, 'app/(payload)/admin/importMap.js'),
    },
  },
  collections: [Users, Properties, Media],
  db: postgresAdapter({
    pool: {
      connectionString: process.env.DATABASE_URL || '',
      max: 10,
    },
    migrationDir: path.resolve(dirname, 'migrations'),
  }),
  plugins: [
    vercelBlobStorage({
      enabled: hasBlob,
      collections: {
        media: true,
      },
      token: process.env.BLOB_READ_WRITE_TOKEN || '',
      clientUploads: true,
    }),
  ],
  secret: payloadSecret,
  sharp,
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
})
