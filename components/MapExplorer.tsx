'use client'

import { useEffect, useRef, useState } from 'react'
import { Check, Expand, LocateFixed, Pencil, RotateCcw, WifiOff } from 'lucide-react'
import type { Property } from '@/lib/data'
import type {
  GeoJSONSource,
  Map as MapLibreMap,
  MapMouseEvent,
  Marker as MapLibreMarker,
  StyleSpecification,
} from 'maplibre-gl'

type LngLat = [number, number]
type MapStatus = 'loading' | 'ready' | 'fallback'

function pointInPolygon(point: LngLat, polygon: LngLat[]) {
  const [x, y] = point
  let inside = false
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i]
    const [xj, yj] = polygon[j]
    const intersect = ((yi > y) !== (yj > y))
      && (x < ((xj - xi) * (y - yi)) / ((yj - yi) || 1e-12) + xi)
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
        'https://c.tile.openstreetmap.org/{z}/{x}/{y}.png',
      ],
      tileSize: 256,
      attribution: '© OpenStreetMap contributors',
    },
  },
  layers: [
    { id: 'map-bg', type: 'background', paint: { 'background-color': '#dff2ec' } },
    { id: 'osm', type: 'raster', source: 'osm', paint: { 'raster-saturation': 0.12, 'raster-contrast': 0.04 } },
  ],
}

function compactPrice(price: string) {
  return price.replace(' میلیارد', 'B').replace('ماهانه ', '')
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function fitProperties(map: MapLibreMap, properties: Property[], animated = true) {
  if (!properties.length) return

  if (properties.length === 1) {
    map.flyTo({
      center: [properties[0].lng, properties[0].lat],
      zoom: 14.2,
      duration: animated ? 800 : 0,
      essential: true,
    })
    return
  }

  const lngs = properties.map(property => property.lng)
  const lats = properties.map(property => property.lat)
  map.fitBounds(
    [
      [Math.min(...lngs), Math.min(...lats)],
      [Math.max(...lngs), Math.max(...lats)],
    ],
    {
      padding: 84,
      maxZoom: 13.2,
      duration: animated ? 800 : 0,
    },
  )
}

export default function MapExplorer({
  properties,
  selectedId,
  onSelectProperty,
  onStartDrawing,
  onAreaSelection,
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
  const lastFitSignatureRef = useRef('')

  const [drawMode, setDrawMode] = useState(false)
  const [points, setPoints] = useState<LngLat[]>([])
  const [mapReady, setMapReady] = useState(false)
  const [status, setStatus] = useState<MapStatus>('loading')
  const [areaLoading, setAreaLoading] = useState(false)

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
        maxPitch: 60,
      })

      mapRef.current = map
      map.addControl(new module.NavigationControl({ showCompass: false }), 'bottom-left')
      map.addControl(new module.AttributionControl({ compact: true }), 'bottom-right')

      resizeObserver = new ResizeObserver(() => map.resize())
      resizeObserver.observe(mapContainer.current)

      const ensureLayers = () => {
        if (!map.getSource('user-draw')) {
          map.addSource('user-draw', {
            type: 'geojson',
            data: { type: 'FeatureCollection', features: [] },
          })
          map.addLayer({
            id: 'user-draw-fill',
            type: 'fill',
            source: 'user-draw',
            paint: { 'fill-color': '#0d8f65', 'fill-opacity': 0.18 },
          })
          map.addLayer({
            id: 'user-draw-line',
            type: 'line',
            source: 'user-draw',
            paint: { 'line-color': '#08744f', 'line-width': 3.2, 'line-dasharray': [1.5, 1] },
          })
        }

        readyRef.current = true
        setMapReady(true)
        setStatus(fallbackTriedRef.current ? 'fallback' : 'ready')
      }

      map.on('style.load', ensureLayers)
      map.on('error', (event) => {
        if (!readyRef.current) console.warn('MapLibre initial load warning:', event.error)
      })

      fallbackTimer = setTimeout(() => {
        if (disposed || readyRef.current || fallbackTriedRef.current) return
        fallbackTriedRef.current = true
        setStatus('fallback')
        try {
          map.setStyle(rasterFallback)
        } catch {
          // no-op
        }
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
      const map = mapRef.current
      if (cancelled || !map) return

      markersRef.current.forEach(marker => marker.remove())
      markersRef.current.clear()

      properties.forEach((property) => {
        const el = document.createElement('button')
        el.type = 'button'
        el.className = `map-price-marker marker-${property.lifestyle} ${selectedId === property.id ? 'selected' : ''}`
        el.textContent = compactPrice(property.price)
        el.title = property.title
        el.addEventListener('click', () => onSelectProperty?.(property.id))

        const popupHtml = `
          <div class="ivila-map-popup" dir="rtl">
            <img src="${escapeHtml(property.image)}" alt="" />
            <div>
              <small>${escapeHtml(property.code)} · ${escapeHtml(property.location)}</small>
              <strong>${escapeHtml(property.title)}</strong>
              <span>${property.area.toLocaleString('fa-IR')} متر · ${escapeHtml(property.type)}</span>
              <b>${escapeHtml(property.price)}</b>
            </div>
          </div>`

        const marker = new module.Marker({ element: el, anchor: 'bottom' })
          .setLngLat([property.lng, property.lat])
          .setPopup(new module.Popup({ offset: 22, closeButton: false, maxWidth: '285px' }).setHTML(popupHtml))
          .addTo(map)

        markersRef.current.set(property.id, marker)
      })

      const signature = properties.map(property => property.id).sort().join('|')
      if (!selectedId && !drawMode && signature && signature !== lastFitSignatureRef.current) {
        lastFitSignatureRef.current = signature
        fitProperties(map, properties, false)
      }
    })

    return () => {
      cancelled = true
    }
  }, [properties, mapReady, selectedId, onSelectProperty, drawMode])

  useEffect(() => {
    if (!mapReady || !mapRef.current || !selectedId) return
    const property = properties.find(item => item.id === selectedId)
    if (!property) return

    mapRef.current.flyTo({
      center: [property.lng, property.lat],
      zoom: 14.2,
      duration: 850,
      essential: true,
    })
    markersRef.current.get(selectedId)?.togglePopup()
  }, [selectedId, properties, mapReady])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapReady) return

    const handleClick = (event: MapMouseEvent) => {
      if (!drawMode) return
      setPoints(previous => [...previous, [event.lngLat.lng, event.lngLat.lat]])
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
        features: [
          {
            type: 'Feature',
            properties: {},
            geometry: { type: 'LineString', coordinates: points },
          },
        ],
      })
      return
    }

    source.setData({
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: {},
          geometry: { type: 'Polygon', coordinates: [[...points, points[0]]] },
        },
      ],
    })
  }, [points, mapReady])

  const finishArea = async () => {
    if (points.length < 3 || areaLoading) return
    setAreaLoading(true)

    try {
      const response = await fetch('/api/spatial/properties-within', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ points }),
      })
      const result = await response.json() as { ok?: boolean; ids?: string[] }
      if (!response.ok || !result.ok || !Array.isArray(result.ids)) {
        throw new Error('SPATIAL_QUERY_FAILED')
      }
      onAreaSelection(result.ids)
    } catch (error) {
      console.warn('ivila server-side polygon query failed; using local fallback', error)
      const ids = properties
        .filter(property => pointInPolygon([property.lng, property.lat], points))
        .map(property => property.id)
      onAreaSelection(ids)
    } finally {
      setAreaLoading(false)
      setDrawMode(false)
    }
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

  const recenter = () => {
    mapRef.current?.flyTo({ center: [51.9607, 36.5665], zoom: 11.9, duration: 900 })
  }

  const fitResults = () => {
    if (!mapRef.current) return
    fitProperties(mapRef.current, properties)
  }

  return (
    <div className="map-shell map-search-shell" id="map">
      <div className="map-offline-backdrop" aria-hidden="true"><span>دریای خزر</span><i/><b>رویان</b></div>
      <div ref={mapContainer} className="map-canvas" />

      <div className="map-topbar">
        <div className="map-topbar-group">
          <span className="map-result-pill"><strong>{properties.length.toLocaleString('fa-IR')}</strong> فایل روی نقشه</span>
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
            <div className="draw-hint">
              <strong>{points.length.toLocaleString('fa-IR')} نقطه</strong>
              <span>روی نقشه چند نقطه بزن و بعد محدوده را اعمال کن.</span>
            </div>
            <button className="draw-primary" disabled={points.length < 3 || areaLoading} onClick={() => void finishArea()}>
              <Check size={17}/>{areaLoading ? 'در حال بررسی…' : 'اعمال این محدوده'}
            </button>
            <button className="draw-reset" disabled={areaLoading} onClick={resetArea}><RotateCcw size={16}/> لغو</button>
          </>
        )}
      </div>
    </div>
  )
}
