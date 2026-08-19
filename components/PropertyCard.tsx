'use client'

import { useState } from 'react'
import Link from 'next/link'
import { BedDouble, Heart, LocateFixed, MapPin, Ruler, Trees, Waves } from 'lucide-react'
import type { Property } from '@/lib/data'

function formatDistance(meters: number) {
  if (meters < 1000) return `${meters.toLocaleString('fa-IR')} متر`
  return `${(meters / 1000).toLocaleString('fa-IR', { maximumFractionDigits: 1 })} کیلومتر`
}

export default function PropertyCard({
  property,
  compact = false,
  onMapFocus
}: {
  property: Property
  compact?: boolean
  onMapFocus?: (id: string) => void
}) {
  const [favorite, setFavorite] = useState(false)

  return (
    <article className={`property-card ${compact ? 'compact' : ''}`}>
      <div className="property-image-wrap">
        <Link href={`/properties/${property.id}`} className="property-image-link" aria-label={`مشاهده ${property.title}`}>
          <img className="property-image" src={property.image} alt={property.title} />
          <span className={`environment-badge ${property.lifestyle}`}>{property.badges[0]}</span>
          <span className="property-code">{property.code}</span>
        </Link>

        <button
          type="button"
          className={`heart-button ${favorite ? 'active' : ''}`}
          aria-label={favorite ? 'حذف از علاقه‌مندی‌ها' : 'افزودن به علاقه‌مندی'}
          aria-pressed={favorite}
          onClick={() => setFavorite(current => !current)}
        >
          <Heart size={18} fill={favorite ? 'currentColor' : 'none'} />
        </button>
      </div>

      <div className="property-body">
        <div className="property-kicker"><MapPin size={14}/>{property.location}</div>
        <Link href={`/properties/${property.id}`} className="property-title">{property.title}</Link>
        <div className="property-specs">
          <span><Ruler size={15}/>{property.area.toLocaleString('fa-IR')} متر</span>
          {property.rooms > 0 && <span><BedDouble size={15}/>{property.rooms.toLocaleString('fa-IR')} خواب</span>}
          <span>{property.type}</span>
        </div>

        {compact && (
          <div className="distance-row">
            <span><Waves size={13}/> دریا {formatDistance(property.seaDistanceM)}</span>
            <span><Trees size={13}/> جنگل {formatDistance(property.forestDistanceM)}</span>
          </div>
        )}

        <div className="property-footer">
          <div><small>قیمت</small><strong>{property.price}</strong></div>
          <div className="property-footer-actions">
            {onMapFocus && (
              <button type="button" className="map-focus-button" onClick={() => onMapFocus(property.id)}>
                <LocateFixed size={14}/> روی نقشه
              </button>
            )}
            <Link href={`/properties/${property.id}`} className="text-link">مشاهده فایل ←</Link>
          </div>
        </div>
      </div>
    </article>
  )
}
