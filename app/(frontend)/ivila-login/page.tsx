import config from '@payload-config'
import { getPayload } from 'payload'
import AdminAuthForm from '@/components/AdminAuthForm'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function IvilaLoginPage() {
  const payload = await getPayload({ config })
  const users = await payload.find({
    collection: 'users',
    depth: 0,
    limit: 1,
    overrideAccess: true,
  })

  return <AdminAuthForm hasUsers={users.totalDocs > 0} />
}
