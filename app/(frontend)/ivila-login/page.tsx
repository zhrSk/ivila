import AdminAuthForm from '@/components/AdminAuthForm'

export const dynamic = 'force-dynamic'
export const revalidate = 0

// Keep this page independent from Payload/Neon during SSR. If the database or
// environment is not ready yet, the login screen must still render and show a
// useful diagnostic instead of crashing the whole route.
export default function IvilaLoginPage() {
  return <AdminAuthForm />
}
