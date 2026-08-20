import IvilaPropertyForm from '@/components/admin/IvilaPropertyForm'
export const dynamic = 'force-dynamic'
export default async function EditPropertyPage({ params }:{ params: Promise<{id:string}> }){ const {id}=await params; return <IvilaPropertyForm propertyId={id}/> }
