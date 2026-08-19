import SiteHeader from '@/components/SiteHeader'
import Hero from '@/components/Hero'
import FeaturedSection from '@/components/FeaturedSection'
import SearchExperience from '@/components/SearchExperience'
import Footer from '@/components/Footer'

export default function Home() {
  return (
    <main>
      <SiteHeader />
      <Hero />
      <FeaturedSection />
      <SearchExperience />
      <Footer />
    </main>
  )
}
