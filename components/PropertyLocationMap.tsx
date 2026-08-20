'use client'

import { useEffect, useRef, useState } from 'react'
import { LocateFixed, ShieldCheck } from 'lucide-react'
import type { Property } from '@/lib/data'
import type { Map as MapLibreMap } from 'maplibre-gl'

const SOURCE_ID = 'ivila-public-approx-location'
const LAYER_ID = 'ivila-public-approx-circle'

export default function PropertyLocationMap({ property }: { property: Property }) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<MapLibreMap | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return
    let disposed = false
    let resizeObserver: ResizeObserver | undefined

    import('maplibre-gl').then(async (module) => {
      if (disposed || !containerRef.current) return

      module.setWorkerUrl('/maplibre/maplibre-gl-worker.mjs')
      const rtlStatus = module.getRTLTextPluginStatus()
      if (rtlStatus === 'unavailable' || rtlStatus === 'error') {
        try {
          await module.setRTLTextPlugin('/maplibre/mapbox-gl-rtl-text.js', false)
        } catch (error) {
          console.warn('MapLibre RTL text plugin could not be initialized:', error)
        }
      }

      const map = new module.Map({
        container: containerRef.current,
        style: process.env.NEXT_PUBLIC_MAP_STYLE_URL || 'https://tiles.openfreemap.org/styles/liberty',
        center: [property.lng, property.lat],
        zoom: 12.8,
        attributionControl: false,
        maxPitch: 0,
      })
      mapRef.current = map
      map.addControl(new module.NavigationControl({ showCompass: false }), 'bottom-left')
      map.addControl(new module.AttributionControl({ compact: true }), 'bottom-right')

      map.once('load', () => {
        if (disposed) return
        map.addSource(SOURCE_ID, {
          type: 'geojson',
          data: {
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [property.lng, property.lat] },
            properties: {},
          },
        })
        map.addLayer({
          id: LAYER_ID,
          type: 'circle',
          source: SOURCE_ID,
          paint: {
            'circle-radius': ['interpolate', ['linear'], ['zoom'], 10, 20, 12, 38, 14, 78, 16, 155],
            'circle-color': property.lifestyle === 'coast' ? '#0f93bd' : '#0b7a50',
            'circle-opacity': 0.17,
            'circle-stroke-color': property.lifestyle === 'coast' ? '#087fa6' : '#07533f',
            'circle-stroke-width': 2,
            'circle-stroke-opacity': 0.7,
          },
        })
        setReady(true)
      })

      resizeObserver = new ResizeObserver(() => map.resize())
      resizeObserver.observe(containerRef.current)
    })

    return () => {
      disposed = true
      resizeObserver?.disconnect()
      mapRef.current?.remove()
      mapRef.current = null
    }
  }, [property.lat, property.lng, property.lifestyle])

  const recenter = () => mapRef.current?.flyTo({
    center: [property.lng, property.lat],
    zoom: 12.8,
    duration: 700,
    essential: true,
  })

  return (
    <section className="property-location-section">
      <div className="detail-section-heading">
        <div>
          <span>موقعیت مکانی</span>
          <h3>محدوده تقریبی فایل</h3>
        </div>
        <div className="detail-map-note"><ShieldCheck size={15}/> نقطه دقیق فقط برای تیم داخلی قابل مشاهده است</div>
      </div>
      <div className="detail-map-shell detail-map-private">
        <div ref={containerRef} className="detail-map-canvas" />
        {!ready && <div className="detail-map-loading">در حال بارگذاری نقشه…</div>}
        <div className="detail-map-overlay">
          <strong>{property.location}</strong>
          <span>دایره فقط محدوده تقریبی را نشان می‌دهد؛ محل واقعی ملک مخفی است.</span>
        </div>
        <button className="detail-map-recenter" type="button" onClick={recenter}><LocateFixed size={17}/> نمایش محدوده</button>
      </div>
    </section>
  )
}
