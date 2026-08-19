'use client'

import { useEffect, useRef, useState } from 'react'
import { Check, Expand, LocateFixed, Pencil, RotateCcw, ShieldCheck, WifiOff } from 'lucide-react'
import type { Property } from '@/lib/data'
import { demoZones } from '@/lib/data'
import type { Map as MapLibreMap, Marker as MapLibreMarker, GeoJSONSource, StyleSpecification, MapMouseEvent } from 'maplibre-gl'

type LngLat = [number, number]
type MapStatus = 'loading' | 'ready' | 'fallback'

function pointInPolygon(point: LngLat, polygon: LngLat[]) {
  const [x, y] = point
  let inside = false
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i]
    const [xj, yj] = polygon[j]
    const intersect = ((yi > y) !== (yj > y)) && (x < ((xj - xi) * (y - yi)) / ((yj - yi) || 1e-12) + xi)
    if (intersect) inside = !inside
  }
  return inside
}

const rasterFallback: StyleSpecification = {
  version: 8,
  sources: {
    osm: {
      type: 'raster',
      tiles: [
        'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png',
        'https://b.tile.openstreetmap.org/{z}/{x}/{y}.png',
        'https://c.tile.openstreetmap.org/{z}/{x}/{y}.png'
      ],
      tileSize: 256,
      attribution: '© OpenStreetMap contributors'
    }
  },
  layers: [
    { id: 'map-bg', type: 'background', paint: { 'background-color': '#dff2ec' } },
    { id: 'osm', type: 'raster', source: 'osm', paint: { 'raster-saturation': 0.18, 'raster-contrast': 0.06 } }
  ]
}

function compactPrice(price: string) {
  return price.replace(' میلیارد', 'B')
}

export default function MapExplorer({
  properties,
  selectedId,
  onSelectProperty,
  onStartDrawing,
  onAreaSelection
}: {
  properties: Property[]
  selectedId?: string | null
  onSelectProperty?: (id: string | null) => void
  onStartDrawing?: () => void
  onAreaSelection: (ids: string[] | null) => void
}) {
  const mapContainer = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<MapLibreMap | null>(null)
  const markersRef = useRef<Map<string, MapLibreMarker>>(new Map())
  const fallbackTriedRef = useRef(false)
  const readyRef = useRef(false)
  const [drawMode, setDrawMode] = useState(false)
  const [points, setPoints] = useState<LngLat[]>([])
  const [mapReady, setMapReady] = useState(false)
  const [status, setStatus] = useState<MapStatus>('loading')

  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return
    let disposed = false
    let fallbackTimer: ReturnType<typeof setTimeout> | undefined
    let resizeObserver: ResizeObserver | undefined

    import('maplibre-gl').then(async (module) => {
      if (disposed || !mapContainer.current) return
      module.setWorkerUrl('/maplibre/maplibre-gl-worker.mjs')

      const rtlStatus = module.getRTLTextPluginStatus()
      if (rtlStatus === 'unavailable' || rtlStatus === 'error') {
        try {
          await module.setRTLTextPlugin('/maplibre/mapbox-gl-rtl-text.js', false)
        } catch (error) {
          console.warn('MapLibre RTL text plugin could not be initialized:', error)
        }
      }

      const configuredStyle = process.env.NEXT_PUBLIC_MAP_STYLE_URL
      const style: StyleSpecification | string = configuredStyle || 'https://tiles.openfreemap.org/styles/liberty'

      const map = new module.Map({
        container: mapContainer.current,
        style,
        center: [51.9607, 36.5665],
        zoom: 11.9,
        attributionControl: false,
        maxPitch: 60
      })
      mapRef.current = map
      map.addControl(new module.NavigationControl({ showCompass: false }), 'bottom-left')
      map.addControl(new module.AttributionControl({ compact: true }), 'bottom-right')

      // Keep the WebGL canvas at the exact container pixel size.
      // This prevents a stretched/soft map when the search layout changes width.
      resizeObserver = new ResizeObserver(() => map.resize())
      resizeObserver.observe(mapContainer.current)

      const ensureLayers = () => {
        if (!map.getSource('demo-zones')) {
          map.addSource('demo-zones', { type: 'geojson', data: demoZones })
          map.addLayer({
            id: 'demo-zone-fill', type: 'fill', source: 'demo-zones',
            paint: {
              'fill-color': ['match', ['get', 'kind'], 'coast', '#0b98d4', 'forest', '#0d9962', '#a07a42'],
              'fill-opacity': 0.17
            }
          })
          map.addLayer({
            id: 'demo-zone-line', type: 'line', source: 'demo-zones',
            paint: {
              'line-color': ['match', ['get', 'kind'], 'coast', '#087bb0', 'forest', '#087648', '#896638'],
              'line-width': 2.6,
              'line-dasharray': [2, 1.4]
            }
          })
        }

        if (!map.getSource('user-draw')) {
          map.addSource('user-draw', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } })
          map.addLayer({ id: 'user-draw-fill', type: 'fill', source: 'user-draw', paint: { 'fill-color': '#0d8f65', 'fill-opacity': 0.19 } })
          map.addLayer({ id: 'user-draw-line', type: 'line', source: 'user-draw', paint: { 'line-color': '#08744f', 'line-width': 3.2, 'line-dasharray': [1.5, 1] } })
        }

        readyRef.current = true
        setMapReady(true)
        setStatus(fallbackTriedRef.current ? 'fallback' : 'ready')
      }

      map.on('style.load', ensureLayers)

      // Do not downgrade to the raster fallback because of a transient tile/glyph error.
      // The raster fallback is visibly softer on high-DPI displays.
      map.on('error', (event) => {
        if (!readyRef.current) console.warn('MapLibre initial load warning:', event.error)
      })

      // Only use raster if the vector style truly never becomes ready.
      fallbackTimer = setTimeout(() => {
        if (disposed || readyRef.current || fallbackTriedRef.current) return
        fallbackTriedRef.current = true
        setStatus('fallback')
        try { map.setStyle(rasterFallback) } catch { /* no-op */ }
      }, 12000)
    })

    return () => {
      disposed = true
      if (fallbackTimer) clearTimeout(fallbackTimer)
      resizeObserver?.disconnect()
      markersRef.current.forEach(marker => marker.remove())
      markersRef.current.clear()
      mapRef.current?.remove()
      mapRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!mapReady || !mapRef.current) return
    let cancelled = false

    import('maplibre-gl').then((module) => {
      if (cancelled || !mapRef.current) return
      markersRef.current.forEach(marker => marker.remove())
      markersRef.current.clear()

      properties.forEach((p) => {
        const el = document.createElement('button')
        el.type = 'button'
        el.className = `map-price-marker marker-${p.lifestyle} ${selectedId === p.id ? 'selected' : ''}`
        el.textContent = compactPrice(p.price)
        el.title = p.title
        el.addEventListener('click', () => onSelectProperty?.(p.id))

        const popupHtml = `
          <div class="ivila-map-popup" dir="rtl">
            <img src="${p.image}" alt="" />
            <div>
              <small>${p.code} · ${p.location}</small>
              <strong>${p.title}</strong>
              <span>${p.area.toLocaleString('fa-IR')} متر · ${p.type}</span>
              <b>${p.price}</b>
            </div>
          </div>`

        const marker = new module.Marker({ element: el, anchor: 'bottom' })
          .setLngLat([p.lng, p.lat])
          .setPopup(new module.Popup({ offset: 22, closeButton: false, maxWidth: '285px' }).setHTML(popupHtml))
          .addTo(mapRef.current!)

        markersRef.current.set(p.id, marker)
      })
    })

    return () => { cancelled = true }
  }, [properties, mapReady, selectedId, onSelectProperty])

  useEffect(() => {
    if (!mapReady || !mapRef.current || !selectedId) return
    const property = properties.find(p => p.id === selectedId)
    if (!property) return
    mapRef.current.flyTo({ center: [property.lng, property.lat], zoom: 14.2, duration: 850, essential: true })
    markersRef.current.get(selectedId)?.togglePopup()
  }, [selectedId, properties, mapReady])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapReady) return
    const handleClick = (event: MapMouseEvent) => {
      if (!drawMode) return
      setPoints(prev => [...prev, [event.lngLat.lng, event.lngLat.lat]])
    }
    map.on('click', handleClick)
    map.getCanvas().style.cursor = drawMode ? 'crosshair' : ''
    return () => {
      map.off('click', handleClick)
      if (map.getCanvas()) map.getCanvas().style.cursor = ''
    }
  }, [drawMode, mapReady])

  useEffect(() => {
    if (!mapRef.current || !mapReady) return
    const source = mapRef.current.getSource('user-draw') as GeoJSONSource | undefined
    if (!source) return

    if (points.length === 0) {
      source.setData({ type: 'FeatureCollection', features: [] })
      return
    }
    if (points.length < 3) {
      source.setData({
        type: 'FeatureCollection',
        features: [{ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: points } }]
      })
      return
    }
    source.setData({
      type: 'FeatureCollection',
      features: [{ type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [[...points, points[0]]] } }]
    })
  }, [points, mapReady])

  const finishArea = () => {
    if (points.length < 3) return
    const ids = properties.filter(p => pointInPolygon([p.lng, p.lat], points)).map(p => p.id)
    onAreaSelection(ids)
    setDrawMode(false)
  }

  const resetArea = () => {
    setPoints([])
    onAreaSelection(null)
    setDrawMode(false)
  }

  const startDrawing = () => {
    setPoints([])
    onStartDrawing?.()
    setDrawMode(true)
  }

  const recenter = () => mapRef.current?.flyTo({ center: [51.9607, 36.5665], zoom: 11.9, duration: 900 })

  const fitResults = () => {
    const map = mapRef.current
    if (!map || properties.length === 0) return
    const lngs = properties.map(p => p.lng)
    const lats = properties.map(p => p.lat)
    const minLng = Math.min(...lngs)
    const maxLng = Math.max(...lngs)
    const minLat = Math.min(...lats)
    const maxLat = Math.max(...lats)

    if (properties.length === 1) {
      map.flyTo({ center: [properties[0].lng, properties[0].lat], zoom: 14.2, duration: 850 })
      return
    }

    map.fitBounds([[minLng, minLat], [maxLng, maxLat]], { padding: 90, maxZoom: 13.3, duration: 900 })
  }

  return (
    <div className="map-shell" id="map">
      <div className="map-offline-backdrop" aria-hidden="true"><span>دریای خزر</span><i/><b>رویان</b></div>
      <div ref={mapContainer} className="map-canvas" />

      <div className="map-topbar">
        <div className="map-topbar-group">
          <span className="map-result-pill"><strong>{properties.length.toLocaleString('fa-IR')}</strong> فایل روی نقشه</span>
          <span className="map-demo-label"><ShieldCheck size={15}/> محدوده‌ها در دمو تقریبی‌اند</span>
        </div>
        <div className="map-topbar-actions">
          <button onClick={fitResults} className="map-tool"><Expand size={16}/><span>همه نتایج</span></button>
          <button onClick={recenter} className="map-tool"><LocateFixed size={17}/><span>مرکز رویان</span></button>
        </div>
      </div>

      {status === 'loading' && <div className="map-status">در حال بارگذاری نقشه…</div>}
      {status === 'fallback' && <div className="map-status fallback"><WifiOff size={14}/> حالت جایگزین نقشه</div>}

      <div className="map-draw-panel">
        {!drawMode ? (
          <button className="draw-primary" onClick={startDrawing}><Pencil size={17}/> رسم محدوده دلخواه</button>
        ) : (
          <>
            <div className="draw-hint"><strong>{points.length.toLocaleString('fa-IR')} نقطه</strong><span>روی نقشه چند نقطه بزن و محدوده را ببند.</span></div>
            <button className="draw-primary" disabled={points.length < 3} onClick={finishArea}><Check size={17}/> اعمال این محدوده</button>
            <button className="draw-reset" onClick={resetArea}><RotateCcw size={16}/> لغو</button>
          </>
        )}
      </div>

      <div className="map-legend">
        <span><i className="legend-dot coast"/> ساحلی</span>
        <span><i className="legend-dot forest"/> جنگلی</span>
        <span><i className="legend-dot village"/> روستایی</span>
      </div>
    </div>
  )
}
