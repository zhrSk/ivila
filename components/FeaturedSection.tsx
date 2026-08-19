import { ArrowLeft, Compass } from 'lucide-react'
import type { Property } from '@/lib/data'
import PropertyCard from './PropertyCard'

export default function FeaturedSection({ properties }: { properties: Property[] }) {
  const featured = properties.filter(p => p.featured)
  const visible = featured.length ? featured : properties.slice(0, 3)

  return (
    <section className="featured-section">
      <div className="container">
        <div className="section-heading compact-heading">
          <div><span className="eyebrow dark">فایل‌های منتخب</span><h2>چند انتخاب برای شروع.</h2></div>
          <a className="see-all" href="#search">دیدن روی نقشه <ArrowLeft size={17}/></a>
        </div>
        <div className="featured-grid">{visible.map(p => <PropertyCard property={p} key={p.id}/>)}</div>
        <div className="north-note"><Compass size={25}/><div><strong>موقعیت، بخشی از هویت ملک است.</strong><p>هر فایل ivila یک نقطه جغرافیایی دقیق دارد و می‌تواند همزمان عضو محدوده‌های ساحلی، جنگلی، روستایی یا سفارشی باشد.</p></div></div>
      </div>
    </section>
  )
}
