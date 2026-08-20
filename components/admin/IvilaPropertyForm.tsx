'use client'

import {
  ArrowRight,
  Check,
  ChevronLeft,
  ChevronRight,
  FilePlus2,
  GripVertical,
  ImagePlus,
  LocateFixed,
  MapPin,
  Save,
  Star,
  Trees,
  UploadCloud,
  Waves,
  X,
} from 'lucide-react'
import { FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import styles from './IvilaAdmin.module.css'

type Deal = '' | 'sale' | 'rent'
type PropertyType = '' | 'villa' | 'land' | 'apartment'
type Lifestyle = '' | 'coast' | 'forest' | 'village' | 'urban'
type DocumentStatus = '' | 'single-page' | 'council' | 'contract' | 'in-progress'
type PublishStatus = 'draft' | 'published' | 'sold' | 'rented' | 'archived'
type UserRole = 'admin' | 'agent'
type BlobStatus = 'loading' | 'ready' | 'missing' | 'error'
type UploadState = 'ready' | 'uploading' | 'uploaded' | 'error'

type ImageDraft = {
  key: string
  file?: File
  preview: string
  originalName: string
  uploadState: UploadState
  blobUrl?: string
  error?: string
}

const DEFAULT_AMENITIES = ['پارکینگ','آسانسور','انباری','بالکن','تراس','حیاط','حیاط خصوصی','استخر','لابی','نگهبانی','اتاق مستر','مبله','دسترسی آسفالت','نورگیری عالی','آب و برق مستقل']

const MAX_IMAGES = 30
const MAX_UPLOAD_BYTES = 3_800_000
const SUPPORTED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])

function numeric(value: string) {
  if (!value.trim()) return undefined
  const number = Number(value.replace(/,/g, ''))
  return Number.isFinite(number) ? number : undefined
}

function randomKey() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function baseName(filename: string) {
  return filename.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9-_]+/g, '-').replace(/^-+|-+$/g, '') || 'property-image'
}

function formatBytes(bytes?: number) {
  if (!bytes) return 'ذخیره‌شده'
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024)).toLocaleString('fa-IR')} کیلوبایت`
  return `${(bytes / (1024 * 1024)).toLocaleString('fa-IR', { maximumFractionDigits: 1 })} مگابایت`
}

async function loadImage(file: File) {
  const url = URL.createObjectURL(file)
  try {
    const image = new Image()
    image.decoding = 'async'
    image.src = url
    await image.decode()
    return image
  } finally {
    URL.revokeObjectURL(url)
  }
}

async function canvasBlob(canvas: HTMLCanvasElement, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob)
      else reject(new Error('IMAGE_ENCODE_FAILED'))
    }, 'image/webp', quality)
  })
}

async function prepareImage(file: File): Promise<File> {
  if (!SUPPORTED_TYPES.has(file.type)) throw new Error('فقط JPG، PNG و WebP پشتیبانی می‌شود.')

  const image = await loadImage(file)
  const maxSide = 2400
  const scale = Math.min(1, maxSide / Math.max(image.naturalWidth, image.naturalHeight))
  const width = Math.max(1, Math.round(image.naturalWidth * scale))
  const height = Math.max(1, Math.round(image.naturalHeight * scale))
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (!context) throw new Error('پردازش تصویر در مرورگر انجام نشد.')
  context.drawImage(image, 0, 0, width, height)

  let blob = await canvasBlob(canvas, 0.86)
  if (blob.size > MAX_UPLOAD_BYTES) blob = await canvasBlob(canvas, 0.74)

  if (blob.size > MAX_UPLOAD_BYTES && Math.max(width, height) > 1900) {
    const reducedScale = 1900 / Math.max(width, height)
    const reduced = document.createElement('canvas')
    reduced.width = Math.round(width * reducedScale)
    reduced.height = Math.round(height * reducedScale)
    const reducedContext = reduced.getContext('2d')
    if (!reducedContext) throw new Error('پردازش تصویر در مرورگر انجام نشد.')
    reducedContext.drawImage(canvas, 0, 0, reduced.width, reduced.height)
    blob = await canvasBlob(reduced, 0.72)
  }

  if (blob.size > MAX_UPLOAD_BYTES) throw new Error('حجم این تصویر بعد از فشرده‌سازی هنوز زیاد است.')

  return new File([blob], `${baseName(file.name)}.webp`, {
    type: 'image/webp',
    lastModified: Date.now(),
  })
}

export default function IvilaPropertyForm({ propertyId }: { propertyId?: string | number }) {
  const mapContainer = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<any>(null)
  const markerRef = useRef<any>(null)
  const distanceRequestRef = useRef(0)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const dragIndexRef = useRef<number | null>(null)
  const imagesRef = useRef<ImageDraft[]>([])
  const originalBlobUrlsRef = useRef<string[]>([])
  const gpsWatchRef = useRef<number | null>(null)
  const gpsTimerRef = useRef<number | null>(null)
  const gpsBestRef = useRef<GeolocationPosition | null>(null)

  const [code, setCode] = useState('')
  const [title, setTitle] = useState('')
  const [deal, setDeal] = useState<Deal>('')
  const [type, setType] = useState<PropertyType>('')
  const [lifestyle, setLifestyle] = useState<Lifestyle>('')
  const [area, setArea] = useState('')
  const [rooms, setRooms] = useState('')
  const [documentStatus, setDocumentStatus] = useState<DocumentStatus>('')
  const [ownerName, setOwnerName] = useState('')
  const [ownerPhone, setOwnerPhone] = useState('')
  const [ownerNotes, setOwnerNotes] = useState('')
  const [amenities, setAmenities] = useState<string[]>([])
  const [customAmenity, setCustomAmenity] = useState('')
  const [userRole, setUserRole] = useState<UserRole>('agent')
  const [loadingExisting, setLoadingExisting] = useState(Boolean(propertyId))
  const [locationSource, setLocationSource] = useState<'map' | 'gps'>('map')
  const [locationAccuracyM, setLocationAccuracyM] = useState<number | null>(null)
  const [locationCapturedAt, setLocationCapturedAt] = useState<string | null>(null)
  const [locationText, setLocationText] = useState('')
  const [longitude, setLongitude] = useState<number | null>(null)
  const [latitude, setLatitude] = useState<number | null>(null)
  const [seaDistance, setSeaDistance] = useState<number | null>(null)
  const [forestDistance, setForestDistance] = useState<number | null>(null)
  const [distanceStatus, setDistanceStatus] = useState<'idle' | 'loading' | 'ready' | 'missing' | 'error'>('idle')
  const [salePrice, setSalePrice] = useState('')
  const [deposit, setDeposit] = useState('')
  const [monthlyRent, setMonthlyRent] = useState('')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState<PublishStatus>('draft')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [images, setImages] = useState<ImageDraft[]>([])
  const [addingImages, setAddingImages] = useState(false)
  const [dropActive, setDropActive] = useState(false)
  const [blobStatus, setBlobStatus] = useState<BlobStatus>('loading')
  const [blobHealthDetail, setBlobHealthDetail] = useState('')
  const [gpsStatus, setGpsStatus] = useState<'idle' | 'locating' | 'good' | 'weak' | 'error'>('idle')
  const [gpsMessage, setGpsMessage] = useState('')

  const uploadedCount = useMemo(() => images.filter((item) => item.uploadState === 'uploaded').length, [images])

  function formatDistance(value: number | null) {
    if (value === null) return '—'
    if (value < 1000) return `${value.toLocaleString('fa-IR')} متر`
    return `${(value / 1000).toLocaleString('fa-IR', { maximumFractionDigits: 1 })} کیلومتر`
  }

  async function calculateEnvironmentalDistances(lng: number, lat: number) {
    const requestId = ++distanceRequestRef.current
    setDistanceStatus('loading')
    setSeaDistance(null)
    setForestDistance(null)

    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        const response = await fetch(`/api/spatial/distances?lng=${encodeURIComponent(lng)}&lat=${encodeURIComponent(lat)}`, {
          cache: 'no-store',
          credentials: 'include',
        })
        const result = await response.json().catch(() => null) as null | {
          ready?: boolean
          seaDistanceM?: number | null
          forestDistanceM?: number | null
          message?: string
          detail?: string
        }

        if (requestId !== distanceRequestRef.current) return
        if (response.ok) {
          setSeaDistance(typeof result?.seaDistanceM === 'number' ? result.seaDistanceM : null)
          setForestDistance(typeof result?.forestDistanceM === 'number' ? result.forestDistanceM : null)
          setDistanceStatus(result?.ready ? 'ready' : 'missing')
          return
        }

        // A transient serverless/DB connection error gets one automatic retry.
        if (attempt === 0 && response.status >= 500) {
          await new Promise((resolve) => window.setTimeout(resolve, 450))
          continue
        }
        setDistanceStatus('error')
        return
      } catch {
        if (requestId !== distanceRequestRef.current) return
        if (attempt === 0) {
          await new Promise((resolve) => window.setTimeout(resolve, 450))
          continue
        }
        setDistanceStatus('error')
      }
    }
  }

  useEffect(() => {
    let disposed = false

    fetch('/api/users/me', { cache: 'no-store', credentials: 'include' })
      .then(async (response) => {
        if (response.status === 401) { window.location.assign('/ivila-login'); return }
        const result = await response.json().catch(() => null) as any
        if (!disposed && result?.user) {
          setUserRole(result.user.role === 'admin' ? 'admin' : 'agent')
          if (result.user.role !== 'admin') setStatus('draft')
        }
      })
      .catch(() => {})

    if (propertyId) {
      fetch(`/api/properties/${propertyId}?depth=0`, { cache: 'no-store', credentials: 'include' })
        .then(async (response) => {
          if (response.status === 401) { window.location.assign('/ivila-login'); return }
          if (!response.ok) throw new Error('PROPERTY_LOAD_FAILED')
          const doc = await response.json() as any
          if (disposed) return
          setCode(doc.code || '')
          setTitle(doc.title || '')
          setDeal(doc.deal === 'sale' || doc.deal === 'rent' ? doc.deal : '')
          setType(['villa','land','apartment'].includes(doc.type) ? doc.type : '')
          setLifestyle(['coast','forest','village','urban'].includes(doc.lifestyle) ? doc.lifestyle : '')
          setArea(doc.areaM2 == null ? '' : String(doc.areaM2))
          setRooms(doc.rooms == null ? '' : String(doc.rooms))
          setDocumentStatus(['single-page','council','contract','in-progress'].includes(doc.documentStatus) ? doc.documentStatus : '')
          setOwnerName(doc.ownerName || '')
          setOwnerPhone(doc.ownerPhone || '')
          setOwnerNotes(doc.ownerNotes || '')
          setLocationText(doc.locationText || '')
          if (Array.isArray(doc.coordinates) && doc.coordinates.length === 2) {
            setLongitude(Number(doc.coordinates[0])); setLatitude(Number(doc.coordinates[1]))
          }
          setLocationSource(doc.locationSource === 'gps' ? 'gps' : 'map')
          setLocationAccuracyM(typeof doc.locationAccuracyM === 'number' ? doc.locationAccuracyM : null)
          setLocationCapturedAt(doc.locationCapturedAt || null)
          setSalePrice(doc.salePriceToman == null ? '' : String(doc.salePriceToman))
          setDeposit(doc.depositToman == null ? '' : String(doc.depositToman))
          setMonthlyRent(doc.monthlyRentToman == null ? '' : String(doc.monthlyRentToman))
          setDescription(doc.description || '')
          setStatus(['draft','published','sold','rented','archived'].includes(doc.status) ? doc.status as PublishStatus : 'draft')
          setAmenities(Array.isArray(doc.amenities) ? doc.amenities.filter((x: unknown): x is string => typeof x === 'string') : [])
          let urls: string[] = []
          try { const parsed = JSON.parse(doc.imageUrlsJson || '[]'); if (Array.isArray(parsed)) urls = parsed.filter((x): x is string => typeof x === 'string') } catch {}
          originalBlobUrlsRef.current = urls
          setImages(urls.map((url, index) => ({ key: `existing-${index}-${url}`, preview: url, originalName: `تصویر ${index + 1}`, uploadState: 'uploaded' as const, blobUrl: url })))
        })
        .catch(() => { if (!disposed) setError('اطلاعات فایل برای ویرایش دریافت نشد.') })
        .finally(() => { if (!disposed) setLoadingExisting(false) })
    }

    fetch('/api/ivila-media-health', { cache: 'no-store', credentials: 'include' })
      .then(async (response) => {
        const result = await response.json().catch(() => null) as null | { ready?: boolean; code?: string; detail?: string }
        if (!disposed) {
          const ready = response.ok && result?.ready
          setBlobStatus(ready ? 'ready' : 'missing')
          setBlobHealthDetail(ready ? '' : String(result?.detail || result?.code || 'اتصال Blob در Runtime شناسایی نشد.'))
        }
      })
      .catch(() => {
        if (!disposed) { setBlobStatus('error'); setBlobHealthDetail('Health endpoint پاسخ نداد.') }
      })

    async function setupMap() {
      if (!mapContainer.current || mapRef.current) return
      const maplibregl = await import('maplibre-gl')
      if (disposed || !mapContainer.current) return

      try {
        maplibregl.setWorkerUrl('/maplibre/maplibre-gl-worker.mjs')
      } catch {}

      try {
        maplibregl.setRTLTextPlugin('/maplibre/mapbox-gl-rtl-text.js', true)
      } catch {}

      const map = new maplibregl.Map({
        container: mapContainer.current,
        style: 'https://tiles.openfreemap.org/styles/liberty',
        center: [51.9607, 36.5665],
        zoom: 10.8,
      })

      map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-left')
      mapRef.current = map

      map.on('click', (event) => {
        stopGpsCapture()
        setGpsStatus('idle')
        setGpsMessage('')
        const lng = Number(event.lngLat.lng.toFixed(6))
        const lat = Number(event.lngLat.lat.toFixed(6))
        setLongitude(lng)
        setLatitude(lat)
        setLocationSource('map')
        setLocationAccuracyM(null)
        setLocationCapturedAt(new Date().toISOString())
        void calculateEnvironmentalDistances(lng, lat)

        if (markerRef.current) markerRef.current.remove()
        markerRef.current = new maplibregl.Marker({ color: '#087c70' })
          .setLngLat([lng, lat])
          .addTo(map)
      })
    }

    void setupMap()

    return () => {
      disposed = true
      stopGpsCapture()
      markerRef.current?.remove?.()
      mapRef.current?.remove?.()
      markerRef.current = null
      mapRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!mapRef.current || longitude === null || latitude === null) return
    if (markerRef.current) markerRef.current.remove()
    void import('maplibre-gl').then((maplibregl) => {
      markerRef.current = new maplibregl.Marker({ color: '#087c70' }).setLngLat([longitude, latitude]).addTo(mapRef.current)
      if (propertyId) mapRef.current.flyTo({ center: [longitude, latitude], zoom: 14, essential: false })
    })
  }, [propertyId, longitude, latitude])

  useEffect(() => {
    imagesRef.current = images
  }, [images])

  useEffect(() => {
    return () => {
      imagesRef.current.forEach((item) => URL.revokeObjectURL(item.preview))
    }
  }, [])

  function locateRoyan() {
    mapRef.current?.flyTo?.({ center: [51.9607, 36.5665], zoom: 12, essential: true })
  }

  function stopGpsCapture() {
    if (gpsWatchRef.current !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(gpsWatchRef.current)
      gpsWatchRef.current = null
    }
    if (gpsTimerRef.current !== null) {
      window.clearTimeout(gpsTimerRef.current)
      gpsTimerRef.current = null
    }
  }

  function applyGpsPosition(position: GeolocationPosition) {
    const lng = Number(position.coords.longitude.toFixed(6))
    const lat = Number(position.coords.latitude.toFixed(6))
    const accuracy = Math.max(1, Math.round(position.coords.accuracy))
    setLongitude(lng)
    setLatitude(lat)
    setLocationSource('gps')
    setLocationAccuracyM(accuracy)
    setLocationCapturedAt(new Date(position.timestamp || Date.now()).toISOString())
    mapRef.current?.flyTo?.({ center: [lng, lat], zoom: 17, essential: true })
    void calculateEnvironmentalDistances(lng, lat)
  }

  function captureCurrentLocation() {
    if (!navigator.geolocation) {
      setGpsStatus('error')
      setError('GPS مرورگر روی این دستگاه در دسترس نیست.')
      return
    }

    stopGpsCapture()
    gpsBestRef.current = null
    setError('')
    setGpsStatus('locating')
    setGpsMessage('در حال گرفتن GPS دقیق… چند ثانیه گوشی را ثابت نگه دار.')

    let finished = false
    const finish = () => {
      if (finished) return
      finished = true
      stopGpsCapture()
      const best = gpsBestRef.current
      if (!best) {
        setGpsStatus('error')
        setGpsMessage('موقعیت قابل اعتماد دریافت نشد.')
        setError('GPS موقعیت قابل اعتماد پیدا نکرد. Location و GPS دقیق گوشی را روشن کن و دوباره بزن.')
        return
      }

      const accuracy = Math.max(1, Math.round(best.coords.accuracy))
      // Desktop/Wi-Fi/IP fixes can be tens of kilometres off. Never silently save them.
      if (!Number.isFinite(accuracy) || accuracy > 250) {
        setGpsStatus('weak')
        setGpsMessage(`موقعیت مرورگر خیلی تقریبی است؛ دقت اعلام‌شده حدود ${accuracy.toLocaleString('fa-IR')} متر است.`)
        setError('این موقعیت برای ثبت فایل قابل اعتماد نیست. روی گوشی GPS دقیق را روشن کن یا نقطه را دستی روی نقشه انتخاب کن.')
        return
      }

      applyGpsPosition(best)
      if (accuracy <= 100) {
        setGpsStatus('good')
        setGpsMessage(`GPS دقیق ثبت شد؛ دقت تقریبی ${accuracy.toLocaleString('fa-IR')} متر.`)
      } else {
        setGpsStatus('weak')
        setGpsMessage(`GPS ثبت شد، ولی دقت متوسط است: حدود ${accuracy.toLocaleString('fa-IR')} متر. اگر ممکن است دوباره تلاش کن.`)
      }
    }

    gpsWatchRef.current = navigator.geolocation.watchPosition((position) => {
      const accuracy = Number(position.coords.accuracy)
      if (!Number.isFinite(position.coords.latitude) || !Number.isFinite(position.coords.longitude) || !Number.isFinite(accuracy)) return
      const currentBest = gpsBestRef.current
      if (!currentBest || accuracy < currentBest.coords.accuracy) gpsBestRef.current = position
      const bestAccuracy = Math.round(gpsBestRef.current?.coords.accuracy ?? accuracy)
      setGpsMessage(`در حال دقیق‌تر شدن GPS… بهترین دقت فعلی ${bestAccuracy.toLocaleString('fa-IR')} متر.`)
      if (accuracy <= 80) finish()
    }, (geoError) => {
      if (geoError.code === geoError.PERMISSION_DENIED) {
        stopGpsCapture()
        finished = true
        setGpsStatus('error')
        setGpsMessage('اجازه دسترسی به Location داده نشده.')
        setError('اجازه Location را برای سایت فعال کن و دوباره «موقعیت فعلی من» را بزن.')
      }
    }, { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 })

    gpsTimerRef.current = window.setTimeout(finish, 20000)
  }

  function toggleAmenity(value: string) {
    setAmenities((current) => current.includes(value) ? current.filter((item) => item !== value) : [...current, value])
  }

  function addCustomAmenity() {
    const value = customAmenity.trim()
    if (!value) return
    setAmenities((current) => current.includes(value) ? current : [...current, value])
    setCustomAmenity('')
  }

  async function addFiles(fileList: FileList | File[]) {
    if (blobStatus !== 'ready') {
      setError('برای آپلود عکس، Vercel Blob باید به پروژه متصل باشد.')
      return
    }

    const incoming = Array.from(fileList).slice(0, Math.max(0, MAX_IMAGES - images.length))
    if (!incoming.length) {
      if (images.length >= MAX_IMAGES) setError(`حداکثر ${MAX_IMAGES.toLocaleString('fa-IR')} عکس برای هر فایل مجاز است.`)
      return
    }

    setAddingImages(true)
    setError('')

    const prepared: ImageDraft[] = []
    for (const file of incoming) {
      try {
        const optimized = await prepareImage(file)
        prepared.push({
          key: randomKey(),
          file: optimized,
          preview: URL.createObjectURL(optimized),
          originalName: file.name,
          uploadState: 'ready',
        })
      } catch (reason) {
        const message = reason instanceof Error ? reason.message : 'تصویر قابل پردازش نیست.'
        setError(`${file.name}: ${message}`)
      }
    }

    if (prepared.length) setImages((current) => [...current, ...prepared].slice(0, MAX_IMAGES))
    setAddingImages(false)
  }

  function removeImage(index: number) {
    setImages((current) => {
      const target = current[index]
      if (target) URL.revokeObjectURL(target.preview)
      return current.filter((_, itemIndex) => itemIndex !== index)
    })
  }

  function moveImage(from: number, to: number) {
    setImages((current) => {
      if (from < 0 || to < 0 || from >= current.length || to >= current.length || from === to) return current
      const next = [...current]
      const [item] = next.splice(from, 1)
      next.splice(to, 0, item)
      return next
    })
  }

  function setCover(index: number) {
    moveImage(index, 0)
  }

  function handleDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault()
    setDropActive(false)
    if (event.dataTransfer.files?.length) void addFiles(event.dataTransfer.files)
  }

  async function uploadImage(item: ImageDraft, index: number) {
    if (item.blobUrl) return item.blobUrl
    if (!item.file) throw new Error('فایل تصویر در دسترس نیست.')

    setImages((current) => current.map((candidate) => candidate.key === item.key
      ? { ...candidate, uploadState: 'uploading', error: undefined }
      : candidate))

    const formData = new FormData()
    formData.append('file', item.file)
    formData.append('propertyCode', code.trim() || 'property')

    const response = await fetch('/api/ivila-blob-upload', {
      method: 'POST',
      credentials: 'include',
      body: formData,
    })

    const result = await response.json().catch(() => null) as null | { url?: string; message?: string; code?: string; detail?: string }
    if (response.status === 401) {
      window.location.assign('/ivila-login')
      throw new Error('AUTH_REQUIRED')
    }
    if (!response.ok || !result?.url) {
      const message = response.status === 413
        ? 'حجم تصویر بیش از حد مجاز مسیر Upload است.'
        : result?.code === 'BLOB_STORE_IS_PRIVATE'
          ? 'Blob Store هنوز Private است؛ Store عمومی را به پروژه متصل کن.'
          : result?.code === 'OIDC_ENVIRONMENT_NOT_ALLOWED'
            ? 'OIDC برای Environment این Deploy اجازه دسترسی به Blob را ندارد.'
            : result?.code === 'BLOB_ACCESS_DENIED'
              ? 'دسترسی OIDC به Blob Store رد شد.'
              : result?.code === 'BLOB_STORE_NOT_FOUND'
                ? 'Blob Store پیدا نشد؛ اتصال Store جدید به Project/Production را بررسی کن.'
                : result?.code === 'BLOB_CREDENTIALS_MISSING'
                  ? 'Credential لازم برای Blob در Runtime پیدا نشد.'
                  : result?.message === 'BLOB_STORE_NOT_CONNECTED' || result?.code === 'BLOB_STORE_ID_MISSING'
                    ? 'BLOB_STORE_ID در این Deployment وجود ندارد؛ Store جدید را به Production همین پروژه متصل و Redeploy کن.'
                    : result?.detail
                      ? `آپلود Blob انجام نشد: ${result.detail}`
                      : 'آپلود تصویر روی Vercel Blob انجام نشد.'
      setImages((current) => current.map((candidate) => candidate.key === item.key
        ? { ...candidate, uploadState: 'error', error: message }
        : candidate))
      throw new Error(message)
    }

    setImages((current) => current.map((candidate) => candidate.key === item.key
      ? { ...candidate, uploadState: 'uploaded', blobUrl: result.url }
      : candidate))
    return result.url
  }

  async function cleanupUploadedBlobs(urls: string[]) {
    await Promise.allSettled(urls.map((url) => fetch('/api/ivila-blob-upload', {
      method: 'DELETE',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    })))
    setImages((current) => current.map((item) => item.blobUrl && urls.includes(item.blobUrl)
      ? { ...item, blobUrl: undefined, uploadState: 'ready' }
      : item))
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy) return

    if (longitude === null || latitude === null) {
      setError('لوکیشن ملک اجباری است؛ «موقعیت فعلی من» را بزن یا نقطه را روی نقشه انتخاب کن.')
      return
    }

    if (!numeric(area) || Number(numeric(area)) <= 0) {
      setError('متراژ ملک برای ثبت فایل اجباری است.')
      return
    }

    if (!ownerName.trim() || !ownerPhone.trim()) {
      setError('نام و شماره مالک برای ثبت فایل اجباری است.')
      return
    }

    const publishing = userRole === 'admin' && status === 'published'
    if ((userRole === 'agent' || publishing) && images.length === 0) {
      setError(userRole === 'agent' ? 'مشاور باید حداقل یک عکس از ملک ثبت کند.' : 'برای انتشار فایل حداقل یک عکس انتخاب کن.')
      return
    }

    if (publishing && (!code.trim() || !title.trim() || !deal || !type || !lifestyle || !documentStatus || !locationText.trim() || !description.trim())) {
      setError('برای انتشار، اطلاعات تکمیلی فایل شامل کد، عنوان، نوع معامله، نوع ملک، سبک منطقه، سند، محدوده و توضیحات باید کامل شود.')
      return
    }

    if (images.length > 0 && blobStatus !== 'ready') {
      setError('Vercel Blob/OIDC آماده نیست و تصاویر قابل ذخیره دائمی نیستند.')
      return
    }

    setBusy(true)
    setError('')
    setSuccess(false)
    const createdBlobUrls: string[] = []

    try {
      const imageUrls: string[] = []
      for (let index = 0; index < images.length; index += 1) {
        const item = images[index]
        const existed = Boolean(item.blobUrl)
        const url = await uploadImage(item, index)
        imageUrls.push(url)
        if (!existed) createdBlobUrls.push(url)
      }

      const body = {
        code: code.trim() || undefined,
        title: title.trim() || undefined,
        deal: deal || undefined,
        type: type || undefined,
        lifestyle: lifestyle || undefined,
        areaM2: numeric(area),
        rooms: numeric(rooms),
        documentStatus: documentStatus || undefined,
        ownerName: ownerName.trim(),
        ownerPhone: ownerPhone.trim(),
        ownerNotes: ownerNotes.trim(),
        amenities,
        description: description.trim() || undefined,
        locationText: locationText.trim() || undefined,
        coordinates: [longitude, latitude],
        locationSource,
        locationAccuracyM,
        locationCapturedAt: locationCapturedAt || new Date().toISOString(),
        salePriceToman: deal === 'sale' ? numeric(salePrice) : undefined,
        depositToman: deal === 'rent' ? numeric(deposit) : undefined,
        monthlyRentToman: deal === 'rent' ? numeric(monthlyRent) : undefined,
        imageUrlsJson: JSON.stringify(imageUrls),
        status: userRole === 'agent' ? 'draft' : status,
        featured: false,
      }

      const response = await fetch(propertyId ? `/api/properties/${propertyId}` : '/api/properties', {
        method: propertyId ? 'PATCH' : 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      let result: any = null
      try { result = await response.json() } catch {}

      if (response.status === 401) {
        if (createdBlobUrls.length) await cleanupUploadedBlobs(createdBlobUrls)
        window.location.assign('/ivila-login')
        return
      }

      if (!response.ok) {
        if (createdBlobUrls.length) await cleanupUploadedBlobs(createdBlobUrls)
        const message = result?.errors?.[0]?.message || result?.message || 'ذخیره فایل انجام نشد.'
        setError(message)
        return
      }

      if (propertyId) {
        const removed = originalBlobUrlsRef.current.filter((url) => !imageUrls.includes(url))
        if (removed.length) await Promise.allSettled(removed.map((url) => fetch('/api/ivila-blob-upload', { method: 'DELETE', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url }) })))
      }
      setSuccess(true)
      setTimeout(() => window.location.assign('/admin'), 700)
    } catch (reason) {
      if (createdBlobUrls.length) await cleanupUploadedBlobs(createdBlobUrls)
      if (reason instanceof Error && reason.message === 'AUTH_REQUIRED') return
      setError(reason instanceof Error ? reason.message : 'ارتباط با Backend برقرار نشد. دوباره تلاش کن.')
    } finally {
      setBusy(false)
    }
  }

  if (loadingExisting) return <main className={styles.formPage} dir="rtl"><div className={styles.formLoading}>در حال دریافت فایل برای ویرایش…</div></main>

  return (
    <main className={styles.formPage} dir="rtl">
      <header className={styles.formTopbar}>
        <a href="/admin" className={styles.backButton}><ArrowRight size={18} /> بازگشت</a>
        <div className={styles.formBrand}>ivila</div>
        <span className={styles.saveHint}>ثبت سریع فایل</span>
      </header>

      <form className={styles.propertyForm} onSubmit={submit}>
        <section className={styles.formIntro}>
          <div>
            <span className={styles.eyebrow}>{propertyId ? 'ویرایش فایل' : 'فایل جدید'}</span>
            <h1>{propertyId ? 'ویرایش ملک در ivila' : 'ثبت ملک در ivila'}</h1>
            <p>{userRole === 'agent' ? 'برای مشاور فقط لوکیشن، عکس، متراژ و اطلاعات مالک اجباری است؛ بقیه را ادمین بعداً تکمیل می‌کند.' : 'اطلاعات اصلی، تصاویر و محل دقیق ملک را در یک مرحله ثبت کن.'}</p>
          </div>
          <FilePlus2 size={42} />
        </section>

        {error && <div className={styles.errorBox}>{error}</div>}
        {success && <div className={styles.successBox}><Check size={18} /> فایل با موفقیت ذخیره شد.</div>}

        <div className={styles.formGrid}>
          <section className={styles.formCard}>
            <div className={styles.sectionTitle}><span>۱</span><div><h2>اطلاعات اصلی</h2><p>مشخصاتی که مشتری اول می‌بیند.</p></div></div>
            <div className={styles.fieldsGrid}>
              <label className={styles.field}><span>کد فایل {userRole === 'agent' && <small>اختیاری</small>}</span><input required={userRole === 'admin' && status === 'published'} value={code} onChange={(e) => setCode(e.target.value)} dir="ltr" /></label>
              <label className={`${styles.field} ${styles.span2}`}><span>عنوان فایل {userRole === 'agent' && <small>اختیاری</small>}</span><input required={userRole === 'admin' && status === 'published'} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="مثلاً ویلای مدرن ۳۰۰ متری نزدیک دریا" /></label>
              <label className={styles.field}><span>نوع معامله</span><select value={deal} onChange={(e) => setDeal(e.target.value as Deal)}><option value="">بعداً تکمیل می‌شود</option><option value="sale">فروش</option><option value="rent">اجاره</option></select></label>
              <label className={styles.field}><span>نوع ملک</span><select value={type} onChange={(e) => setType(e.target.value as PropertyType)}><option value="">بعداً تکمیل می‌شود</option><option value="villa">ویلا</option><option value="land">زمین</option><option value="apartment">آپارتمان</option></select></label>
              <label className={styles.field}><span>سبک منطقه</span><select value={lifestyle} onChange={(e) => setLifestyle(e.target.value as Lifestyle)}><option value="">بعداً تکمیل می‌شود</option><option value="coast">ساحلی</option><option value="forest">جنگلی</option><option value="village">روستایی</option><option value="urban">شهری</option></select></label>
              <label className={styles.field}><span>متراژ <b>اجباری</b></span><input required inputMode="numeric" value={area} onChange={(e) => setArea(e.target.value)} placeholder="۳۲۰" /></label>
              <label className={styles.field}><span>تعداد خواب <small>اختیاری</small></span><input inputMode="numeric" value={rooms} onChange={(e) => setRooms(e.target.value)} /></label>
              <label className={styles.field}><span>وضعیت سند</span><select value={documentStatus} onChange={(e) => setDocumentStatus(e.target.value as DocumentStatus)}><option value="">بعداً تکمیل می‌شود</option><option value="single-page">سند تک‌برگ</option><option value="council">سند شورایی</option><option value="contract">قولنامه‌ای</option><option value="in-progress">در حال اخذ سند</option></select></label>
              <label className={styles.field}><span>نام مالک <b>اجباری</b></span><input required value={ownerName} onChange={(e) => setOwnerName(e.target.value)} placeholder="نام مالک" /></label>
              <label className={styles.field}><span>شماره مالک <b>اجباری</b></span><input required value={ownerPhone} onChange={(e) => setOwnerPhone(e.target.value)} inputMode="tel" dir="ltr" placeholder="09..." /></label>
              <label className={`${styles.field} ${styles.span2}`}><span>یادداشت داخلی مالک</span><textarea value={ownerNotes} onChange={(e) => setOwnerNotes(e.target.value)} placeholder="شرایط بازدید، زمان تماس، توضیحاتی که فقط تیم ivila می‌بیند" rows={3} /></label>
            </div>
          </section>

          <section className={styles.formCard}>
            <div className={styles.sectionTitle}><span>۲</span><div><h2>قیمت و انتشار</h2><p>قیمت و وضعیت نمایش فایل.</p></div></div>
            <div className={styles.fieldsGrid}>
              {deal === 'sale' ? (
                <label className={`${styles.field} ${styles.span2}`}><span>قیمت فروش (تومان)</span><input inputMode="numeric" value={salePrice} onChange={(e) => setSalePrice(e.target.value)} placeholder="مثلاً 18500000000" dir="ltr" /></label>
              ) : deal === 'rent' ? (
                <>
                  <label className={styles.field}><span>ودیعه (تومان)</span><input inputMode="numeric" value={deposit} onChange={(e) => setDeposit(e.target.value)} dir="ltr" /></label>
                  <label className={styles.field}><span>اجاره ماهانه (تومان)</span><input inputMode="numeric" value={monthlyRent} onChange={(e) => setMonthlyRent(e.target.value)} dir="ltr" /></label>
                </>
              ) : (
                <div className={`${styles.agentDraftNotice} ${styles.span2}`}>قیمت اختیاری است و بعداً توسط ادمین تکمیل می‌شود.</div>
              )}
              {userRole === 'admin' ? (
                <label className={`${styles.field} ${styles.span2}`}><span>وضعیت فایل</span><select value={status} onChange={(e) => setStatus(e.target.value as PublishStatus)}><option value="draft">پیش‌نویس</option><option value="published">منتشر شده</option><option value="sold">فروخته شده</option><option value="rented">اجاره داده شده</option><option value="archived">آرشیو</option></select></label>
              ) : (
                <div className={`${styles.agentDraftNotice} ${styles.span2}`}>فایل‌های مشاور فقط به‌صورت پیش‌نویس ذخیره می‌شوند و بعد از بررسی ادمین اصلی منتشر خواهند شد.</div>
              )}
            </div>
          </section>

          <section className={`${styles.formCard} ${styles.mapCard}`}>
            <div className={styles.sectionTitle}><span>۳</span><div><h2>موقعیت ملک</h2><p>روی نقطه دقیق ملک در نقشه کلیک کن.</p></div></div>
            <label className={styles.field}><span>نام محدوده / آدرس قابل نمایش <small>اختیاری برای مشاور</small></span><input required={userRole === 'admin' && status === 'published'} value={locationText} onChange={(e) => setLocationText(e.target.value)} placeholder="رویان، نوار ساحلی" /></label>
            <div className={styles.adminMapWrap}>
              <div ref={mapContainer} className={styles.adminMap} />
              <div className={styles.mapLocateGroup}><button type="button" className={styles.mapLocate} onClick={locateRoyan}><MapPin size={17} /> رویان</button><button type="button" className={`${styles.mapLocate} ${styles.gpsButton}`} onClick={captureCurrentLocation} disabled={gpsStatus === 'locating'}><LocateFixed size={17} /> {gpsStatus === 'locating' ? 'در حال گرفتن GPS…' : 'موقعیت فعلی من'}</button></div>
              <div className={styles.mapCoordinate}><MapPin size={15} /> {longitude === null ? 'هنوز نقطه‌ای انتخاب نشده' : `${latitude}, ${longitude}`}</div>
            </div>
            <div className={`${styles.locationAudit} ${gpsStatus === 'weak' ? styles.locationAuditWeak : ''} ${gpsStatus === 'good' ? styles.locationAuditGood : ''}`}><strong>{gpsStatus === 'locating' ? 'در حال دریافت GPS دقیق…' : locationSource === 'gps' ? 'موقعیت با GPS ثبت شده' : 'موقعیت از روی نقشه انتخاب شده'}</strong>{gpsMessage && <span>{gpsMessage}</span>}{locationAccuracyM !== null && locationSource === 'gps' && <span>دقت ثبت‌شده: {locationAccuracyM.toLocaleString('fa-IR')} متر</span>}<em>روی لپ‌تاپ ممکن است Location از Wi‑Fi/IP تقریبی باشد؛ ثبت نهایی لوکیشن مشاور بهتر است با GPS گوشی انجام شود.</em></div>
            <div className={styles.autoDistanceGrid}>
              <div className={`${styles.autoDistanceCard} ${styles.seaDistanceCard}`}>
                <span className={styles.autoDistanceIcon}><Waves size={19} /></span>
                <div>
                  <small>فاصله تا دریا</small>
                  <strong>{distanceStatus === 'loading' ? 'در حال محاسبه…' : formatDistance(seaDistance)}</strong>
                  <em>محاسبه خودکار از نزدیک‌ترین خط ساحلی</em>
                </div>
              </div>
              <div className={`${styles.autoDistanceCard} ${styles.forestDistanceCard}`}>
                <span className={styles.autoDistanceIcon}><Trees size={19} /></span>
                <div>
                  <small>فاصله تا جنگل</small>
                  <strong>{distanceStatus === 'loading' ? 'در حال محاسبه…' : formatDistance(forestDistance)}</strong>
                  <em>اگر نقطه داخل محدوده جنگل باشد: صفر متر</em>
                </div>
              </div>
            </div>
            {distanceStatus === 'missing' && (
              <div className={styles.spatialNotice}>لایه‌های GIS هنوز داخل Neon بارگذاری نشده‌اند. فایل را می‌توانی ذخیره کنی؛ بعد از Import لایه‌های ساحل/جنگل، فاصله‌ها خودکار محاسبه می‌شوند.</div>
            )}
            {distanceStatus === 'error' && (
              <div className={styles.spatialWarning}>
                <span>محاسبه فاصله موقتاً انجام نشد؛ ذخیره فایل متوقف نمی‌شود و Backend هنگام ذخیره دوباره تلاش می‌کند.</span>
                {longitude !== null && latitude !== null && <button type="button" onClick={() => void calculateEnvironmentalDistances(longitude, latitude)}>تلاش مجدد</button>}
              </div>
            )}
          </section>

          <section className={`${styles.formCard} ${styles.fullCard}`}>
            <div className={styles.sectionTitle}><span>۴</span><div><h2>امکانات ملک</h2><p>امکاناتی که در صفحه جزئیات به مشتری نمایش داده می‌شوند.</p></div></div>
            <div className={styles.amenityPicker}>
              {DEFAULT_AMENITIES.map((item) => <button key={item} type="button" className={amenities.includes(item) ? styles.amenityActive : ''} onClick={() => toggleAmenity(item)}><Check size={14}/>{item}</button>)}
            </div>
            <div className={styles.customAmenity}><input value={customAmenity} onChange={(e) => setCustomAmenity(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustomAmenity() } }} placeholder="امکان دیگر..."/><button type="button" onClick={addCustomAmenity}>افزودن</button></div>
          </section>

          <section className={`${styles.formCard} ${styles.fullCard}`}>
            <div className={styles.sectionTitle}><span>۵</span><div><h2>تصاویر ملک {userRole === 'agent' && <b>· حداقل یک عکس اجباری</b>}</h2><p>تصویر اول کاور سایت است؛ با Drag & Drop ترتیب را تغییر بده.</p></div></div>

            <input
              ref={fileInputRef}
              className={styles.hiddenFileInput}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              onChange={(event) => {
                if (event.target.files?.length) void addFiles(event.target.files)
                event.currentTarget.value = ''
              }}
            />

            <div
              className={`${styles.imageDropzone} ${dropActive ? styles.imageDropzoneActive : ''} ${blobStatus !== 'ready' ? styles.imageDropzoneDisabled : ''}`}
              onClick={() => blobStatus === 'ready' && fileInputRef.current?.click()}
              onDragEnter={(event) => { event.preventDefault(); if (blobStatus === 'ready') setDropActive(true) }}
              onDragOver={(event) => event.preventDefault()}
              onDragLeave={() => setDropActive(false)}
              onDrop={handleDrop}
              role="button"
              tabIndex={0}
              onKeyDown={(event) => {
                if ((event.key === 'Enter' || event.key === ' ') && blobStatus === 'ready') fileInputRef.current?.click()
              }}
            >
              <span className={styles.dropzoneIcon}>{addingImages ? <ImagePlus size={25} /> : <UploadCloud size={25} />}</span>
              <div>
                <strong>{addingImages ? 'در حال آماده‌سازی عکس‌ها…' : 'عکس‌ها را اینجا رها کن'}</strong>
                <p>یا کلیک کن و چند عکس را یکجا انتخاب کن. عکس‌ها قبل از ارسال خودکار WebP و کم‌حجم می‌شوند.</p>
              </div>
              <span className={styles.dropzoneMeta}>{images.length.toLocaleString('fa-IR')} / {MAX_IMAGES.toLocaleString('fa-IR')}</span>
            </div>

            {blobStatus === 'loading' && <div className={styles.mediaInfo}>در حال بررسی اتصال Vercel Blob…</div>}
            {blobStatus === 'missing' && <div className={styles.mediaWarning}>اتصال Blob آماده نیست: {blobHealthDetail || 'Blob Store را به Production همین پروژه متصل و Redeploy کن.'}</div>}
            {blobStatus === 'error' && <div className={styles.mediaWarning}>وضعیت Vercel Blob دریافت نشد. یک‌بار صفحه را Refresh کن.</div>}

            {images.length > 0 && (
              <>
                <div className={styles.gallerySummary}>
                  <span><ImagePlus size={16} /> {images.length.toLocaleString('fa-IR')} تصویر آماده</span>
                  {busy && <span>{uploadedCount.toLocaleString('fa-IR')} تصویر آپلود شده</span>}
                  <small>برای تعیین کاور، روی «کاور» عکس دلخواه بزن.</small>
                </div>
                <div className={styles.adminGallery}>
                  {images.map((item, index) => (
                    <article
                      key={item.key}
                      className={`${styles.adminGalleryItem} ${index === 0 ? styles.adminGalleryCover : ''}`}
                      draggable={!busy}
                      onDragStart={() => { dragIndexRef.current = index }}
                      onDragOver={(event) => event.preventDefault()}
                      onDrop={(event) => {
                        event.preventDefault()
                        const from = dragIndexRef.current
                        dragIndexRef.current = null
                        if (from !== null) moveImage(from, index)
                      }}
                    >
                      <img src={item.preview} alt={`پیش‌نمایش تصویر ${index + 1}`} />
                      <div className={styles.galleryTopline}>
                        <span className={styles.galleryDrag}><GripVertical size={17} /></span>
                        {index === 0 && <span className={styles.coverBadge}><Star size={13} fill="currentColor" /> کاور</span>}
                        <button type="button" className={styles.galleryRemove} onClick={() => removeImage(index)} disabled={busy} aria-label="حذف تصویر"><X size={16} /></button>
                      </div>
                      <div className={styles.galleryFooter}>
                        <div>
                          <strong>{index === 0 ? 'تصویر اصلی' : `تصویر ${index + 1}`}</strong>
                          <span>{formatBytes(item.file?.size)}</span>
                        </div>
                        <div className={styles.galleryActions}>
                          {index > 0 && <button type="button" onClick={() => setCover(index)} disabled={busy}><Star size={13} /> کاور</button>}
                          <button type="button" onClick={() => moveImage(index, index - 1)} disabled={busy || index === 0} aria-label="قبلی"><ChevronRight size={15} /></button>
                          <button type="button" onClick={() => moveImage(index, index + 1)} disabled={busy || index === images.length - 1} aria-label="بعدی"><ChevronLeft size={15} /></button>
                        </div>
                      </div>
                      {item.uploadState === 'uploading' && <div className={styles.galleryUploadState}>در حال ارسال مستقیم به Blob…</div>}
                      {item.uploadState === 'uploaded' && <div className={`${styles.galleryUploadState} ${styles.galleryUploadDone}`}><Check size={13} /> آپلود شد</div>}
                      {item.uploadState === 'error' && <div className={`${styles.galleryUploadState} ${styles.galleryUploadError}`}>{item.error || 'خطای آپلود'}</div>}
                    </article>
                  ))}
                </div>
              </>
            )}
          </section>

          <section className={`${styles.formCard} ${styles.fullCard}`}>
            <div className={styles.sectionTitle}><span>۶</span><div><h2>توضیحات</h2><p>نکته‌هایی که فروش فایل را راحت‌تر می‌کنند.</p></div></div>
            <label className={styles.field}><span>توضیحات فایل <small>اختیاری برای مشاور</small></span><textarea required={userRole === 'admin' && status === 'published'} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="ویژگی‌های مهم ملک، دسترسی، وضعیت بنا و..." rows={6} /></label>
          </section>
        </div>

        <div className={styles.stickySave}>
          <div><strong>{code || 'فایل جدید'}</strong><span>{busy && images.length ? `در حال آپلود و ذخیره · ${uploadedCount.toLocaleString('fa-IR')} از ${images.length.toLocaleString('fa-IR')} عکس` : status === 'published' ? 'بعد از ذخیره در سایت دیده می‌شود' : 'به‌صورت پیش‌نویس ذخیره می‌شود'}</span></div>
          <button type="submit" disabled={busy || addingImages}><Save size={18} /> {busy ? 'در حال ذخیره...' : addingImages ? 'در حال آماده‌سازی عکس...' : 'ذخیره فایل'}</button>
        </div>
      </form>
    </main>
  )
}
