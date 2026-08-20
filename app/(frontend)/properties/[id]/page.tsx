import { notFound } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowRight,
  BedDouble,
  Building2,
  Check,
  FileCheck2,
  MapPin,
  Phone,
  Ruler,
  Share2,
  Trees,
  Waves
} from 'lucide-react'
import SiteHeader from '@/components/SiteHeader'
import Footer from '@/components/Footer'
import PropertyCard from '@/components/PropertyCard'
import PropertyLocationMap from '@/components/PropertyLocationMap'
import PropertyGallery from '@/components/PropertyGallery'
import { getPublicProperty, getSimilarProperties } from '@/lib/property-repository'

export const dynamic = 'force-dynamic'

export default async function PropertyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const property = await getPublicProperty(id)
  if (!property) notFound()

  const EnvironmentIcon = property.lifestyle === 'coast' ? Waves : property.lifestyle === 'forest' ? Trees : Building2
  const similar = await getSimilarProperties(property, 3)
  const gallery = property.images?.length ? property.images : [property.image]

  return (
    <main className="detail-page">
      <div className="detail-header"><SiteHeader/></div>
      <div className="container detail-main">
        <div className="detail-topline">
          <Link href="/#search" className="back-link"><ArrowRight size={16}/> بازگشت به فایل‌ها</Link>
          <span>کد فایل {property.code}</span>
        </div>

        <PropertyGallery images={gallery} title={property.title}/>

        <div className="detail-content-grid">
          <div className="detail-content-main">
            <span className="detail-kicker">{property.deal} · {property.type}</span>
            <h1 className="detail-title">{property.title}</h1>
            <div className="detail-meta">
              <span><MapPin size={15}/>{property.location}</span>
              <span><Ruler size={15}/>{property.area.toLocaleString('fa-IR')} متر</span>
              {property.rooms > 0 && <span><BedDouble size={15}/>{property.rooms.toLocaleString('fa-IR')} خواب</span>}
              <span><EnvironmentIcon size={15}/>{property.badges[0]}</span>
              <span><FileCheck2 size={15}/>{property.documentStatus}</span>
            </div>

            <div className="detail-highlight-grid">
              <div className="detail-highlight sea"><Waves size={20}/><div><small>فاصله تا دریا</small><strong>{property.seaDistanceM.toLocaleString('fa-IR')} متر</strong></div></div>
              <div className="detail-highlight forest"><Trees size={20}/><div><small>فاصله تا جنگل</small><strong>{property.forestDistanceM.toLocaleString('fa-IR')} متر</strong></div></div>
              <div className="detail-highlight"><FileCheck2 size={20}/><div><small>وضعیت سند</small><strong>{property.documentStatus}</strong></div></div>
            </div>

            <section className="detail-description">
              <h3>درباره این فایل</h3>
              <p>{property.description}</p>
            </section>

            <section className="detail-amenities">
              <div className="detail-section-heading compact">
                <div><span>ویژگی‌ها</span><h3>امکانات و مشخصات فایل</h3></div>
              </div>
              <div className="amenities-grid">
                {property.amenities.map(item => <div key={item}><Check size={16}/><span>{item}</span></div>)}
              </div>
            </section>

            <PropertyLocationMap property={property}/>
          </div>

          <aside className="contact-card">
            <small>قیمت پیشنهادی</small>
            <div className="contact-price">{property.price}</div>
            <div className="contact-subline"><span>{property.area.toLocaleString('fa-IR')} متر</span><i/> <span>{property.type}</span><i/> <span>{property.deal}</span></div>
            <div className="agent-row"><div className="agent-avatar">i</div><div><strong>مشاور ivila</strong><span>پاسخ‌گویی و هماهنگی بازدید</span></div></div>
            <button className="primary-contact"><Phone size={17}/> تماس با مشاور</button>
            <button className="secondary-contact"><Share2 size={17}/> اشتراک فایل</button>
            <div className="demo-alert">اطلاعات تماس و موقعیت دقیق در نسخه نمایشی عمومی نشده‌اند.</div>
          </aside>
        </div>

        <section className="similar-section">
          <div className="detail-section-heading">
            <div><span>پیشنهادهای نزدیک</span><h3>فایل‌های مشابه در اطراف</h3></div>
            <Link href="/#search">مشاهده همه فایل‌ها <ArrowRight size={16}/></Link>
          </div>
          <div className="similar-grid">
            {similar.map(item => <PropertyCard key={item.id} property={item}/>) }
          </div>
        </section>
      </div>
      <Footer/>
    </main>
  )
}
