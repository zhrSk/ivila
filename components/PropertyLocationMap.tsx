'use client'

import { useEffect, useRef, useState } from 'react'
import { LocateFixed, ShieldCheck } from 'lucide-react'
import type { Property } from '@/lib/data'
import type { Map as MapLibreMap, Marker as MapLibreMarker } from 'maplibre-gl'

export default function PropertyLocationMap({ property }: { property: Property }) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<MapLibreMap | null>(null)
  const markerRef = useRef<MapLibreMarker | null>(null)
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
        zoom: 14.4,
        attributionControl: false,
        maxPitch: 0
      })
      mapRef.current = map
      map.addControl(new module.NavigationControl({ showCompass: false }), 'bottom-left')
      map.addControl(new module.AttributionControl({ compact: true }), 'bottom-right')

      const markerElement = document.createElement('div')
      markerElement.className = `detail-map-marker marker-${property.lifestyle}`
      markerElement.innerHTML = `<span>${property.code}</span>`
      markerRef.current = new module.Marker({ element: markerElement, anchor: 'bottom' })
        .setLngLat([property.lng, property.lat])
        .addTo(map)

      map.once('load', () => setReady(true))
      resizeObserver = new ResizeObserver(() => map.resize())
      resizeObserver.observe(containerRef.current)
    })

    return () => {
      disposed = true
      resizeObserver?.disconnect()
      markerRef.current?.remove()
      markerRef.current = null
      mapRef.current?.remove()
      mapRef.current = null
    }
  }, [property.code, property.lat, property.lng, property.lifestyle])

  const recenter = () => mapRef.current?.flyTo({
    center: [property.lng, property.lat],
    zoom: 14.4,
    duration: 700,
    essential: true
  })

  return (
    <section className="property-location-section">
      <div className="detail-section-heading">
        <div>
          <span>موقعیت مکانی</span>
          <h3>این فایل کجای منطقه قرار دارد؟</h3>
        </div>
        <div className="detail-map-note"><ShieldCheck size={15}/> موقعیت در نسخه دمو تقریبی است</div>
      </div>
      <div className="detail-map-shell">
        <div ref={containerRef} className="detail-map-canvas" />
        {!ready && <div className="detail-map-loading">در حال بارگذاری نقشه…</div>}
        <div className="detail-map-overlay">
          <strong>{property.location}</strong>
          <span>{property.seaDistanceM.toLocaleString('fa-IR')} متر تا دریا · {property.forestDistanceM.toLocaleString('fa-IR')} متر تا جنگل</span>
        </div>
        <button className="detail-map-recenter" type="button" onClick={recenter}><LocateFixed size={17}/> نمایش ملک</button>
      </div>
    </section>
  )
}
