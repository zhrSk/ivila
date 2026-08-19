import { ArrowLeft, Compass } from 'lucide-react'
import { properties } from '@/lib/data'
import PropertyCard from './PropertyCard'

export default function FeaturedSection() {
  return (
    <section className="featured-section">
      <div className="container">
        <div className="section-heading compact-heading">
          <div><span className="eyebrow dark">فایل‌های منتخب</span><h2>چند انتخاب برای شروع.</h2></div>
          <a className="see-all" href="#search">دیدن روی نقشه <ArrowLeft size={17}/></a>
        </div>
        <div className="featured-grid">{properties.filter(p => p.featured).map(p => <PropertyCard property={p} key={p.id}/>)}</div>
        <div className="north-note"><Compass size={25}/><div><strong>موقعیت، بخشی از هویت ملک است.</strong><p>در نسخه واقعی هر فایل یک نقطه جغرافیایی دقیق دارد و می‌تواند همزمان عضو چند محدوده تجاری، روستایی یا سفارشی باشد.</p></div></div>
      </div>
    </section>
  )
}
