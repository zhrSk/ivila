import SiteHeader from '@/components/SiteHeader'
import Hero from '@/components/Hero'
import FeaturedSection from '@/components/FeaturedSection'
import SearchExperience from '@/components/SearchExperience'
import Footer from '@/components/Footer'
import { getPublicProperties } from '@/lib/property-repository'

export const dynamic = 'force-dynamic'

export default async function Home() {
  const properties = await getPublicProperties()

  return (
    <main>
      <SiteHeader />
      <Hero />
      <FeaturedSection properties={properties} />
      <SearchExperience properties={properties} />
      <Footer />
    </main>
  )
}
