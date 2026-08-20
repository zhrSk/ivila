import 'server-only'
import { createHmac } from 'node:crypto'
import config from '@payload-config'
import { getPayload } from 'payload'
import {
  properties as demoProperties,
  type DocumentStatus,
  type Property,
} from './data'

type MediaLike = {
  url?: string | null
  sizes?: {
    card?: { url?: string | null } | null
    detail?: { url?: string | null } | null
    thumbnail?: { url?: string | null } | null
  } | null
}

type PropertyDocument = {
  id: string | number
  code?: string | null
  slug?: string | null
  title?: string | null
  deal?: 'sale' | 'rent' | null
  type?: 'villa' | 'land' | 'apartment' | null
  lifestyle?: 'coast' | 'forest' | 'village' | 'urban' | null
  areaM2?: number | null
  rooms?: number | null
  documentStatus?: 'single-page' | 'council' | 'contract' | 'in-progress' | null
  description?: string | null
  priceDisplay?: string | null
  salePriceToman?: number | null
  depositToman?: number | null
  monthlyRentToman?: number | null
  locationText?: string | null
  coordinates?: [number, number] | null
  publicLng?: number | null
  publicLat?: number | null
  seaDistanceM?: number | null
  forestDistanceM?: number | null
  images?: Array<string | number | MediaLike> | null
  imageUrls?: string[] | null
  imageUrlsJson?: string | null
  fallbackImage?: string | null
  badges?: string[] | null
  amenities?: string[] | null
  featured?: boolean | null
  status?: string | null
}

const typeMap: Record<NonNullable<PropertyDocument['type']>, Property['type']> = {
  villa: 'ویلا',
  land: 'زمین',
  apartment: 'آپارتمان',
}

const documentMap: Record<NonNullable<PropertyDocument['documentStatus']>, DocumentStatus> = {
  'single-page': 'سند تک‌برگ',
  council: 'سند شورایی',
  contract: 'قولنامه‌ای',
  'in-progress': 'در حال اخذ سند',
}

function mediaURL(value: string | number | MediaLike, size?: 'card' | 'detail') {
  if (!value || typeof value !== 'object') return null
  if (!size) return value.url || value.sizes?.detail?.url || value.sizes?.card?.url || null
  return value.sizes?.[size]?.url || value.url || null
}

function formatToman(value: number) {
  if (value >= 1_000_000_000) {
    const billions = value / 1_000_000_000
    return `${billions.toLocaleString('fa-IR', { maximumFractionDigits: 1 })} میلیارد`
  }
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toLocaleString('fa-IR', { maximumFractionDigits: 1 })} میلیون`
  }
  return `${value.toLocaleString('fa-IR')} تومان`
}

function buildPrice(doc: PropertyDocument) {
  if (doc.priceDisplay?.trim()) return doc.priceDisplay.trim()
  if (doc.deal === 'rent') {
    const rent = Number(doc.monthlyRentToman || 0)
    const deposit = Number(doc.depositToman || 0)
    if (deposit && rent) return `ودیعه ${formatToman(deposit)} · ماهانه ${formatToman(rent)}`
    if (rent) return `ماهانه ${formatToman(rent)}`
    if (deposit) return `ودیعه ${formatToman(deposit)}`
  }
  const sale = Number(doc.salePriceToman || 0)
  return sale ? formatToman(sale) : 'تماس بگیرید'
}

/**
 * Public maps never receive the exact property point. The public point is a
 * stable, secret-derived displacement roughly 0.9–1.4 km from the real point.
 * It cannot be reversed from the public property code without the server secret.
 */
function privacySafeCoordinates(doc: PropertyDocument): [number, number] {
  const exact = Array.isArray(doc.coordinates) && doc.coordinates.length === 2
    ? [Number(doc.coordinates[0]), Number(doc.coordinates[1])] as [number, number]
    : null

  if (!exact || !Number.isFinite(exact[0]) || !Number.isFinite(exact[1])) {
    return [Number(doc.publicLng ?? 51.9607), Number(doc.publicLat ?? 36.5665)]
  }

  const secret = process.env.PAYLOAD_SECRET || 'ivila-public-location-privacy'
  const digest = createHmac('sha256', secret)
    .update(`property:${String(doc.id)}:${doc.code || ''}`)
    .digest()

  const angle = (digest.readUInt16BE(0) / 65535) * Math.PI * 2
  const radiusM = 900 + (digest.readUInt16BE(2) / 65535) * 500
  const latitude = exact[1]
  const latDelta = (radiusM * Math.cos(angle)) / 111_320
  const lngScale = Math.max(0.2, Math.cos(latitude * Math.PI / 180))
  const lngDelta = (radiusM * Math.sin(angle)) / (111_320 * lngScale)

  return [exact[0] + lngDelta, exact[1] + latDelta]
}

function toFrontendProperty(doc: PropertyDocument): Property {
  let jsonGallery: string[] = []
  if (typeof doc.imageUrlsJson === 'string' && doc.imageUrlsJson.trim()) {
    try {
      const parsed = JSON.parse(doc.imageUrlsJson)
      if (Array.isArray(parsed)) {
        jsonGallery = parsed.filter((url): url is string => typeof url === 'string' && /^https?:\/\//i.test(url))
      }
    } catch {
      jsonGallery = []
    }
  }

  const legacyDirectGallery = Array.isArray(doc.imageUrls)
    ? doc.imageUrls.filter((url): url is string => typeof url === 'string' && /^https?:\/\//i.test(url))
    : []
  const directGallery = jsonGallery.length ? jsonGallery : legacyDirectGallery
  const imageDocs = Array.isArray(doc.images) ? doc.images : []

  // Detail/lightbox always uses the original legacy media URL when available.
  // The old code preferred a 1600px derivative, which became visibly soft on large displays.
  const legacyGallery = imageDocs
    .map(item => mediaURL(item))
    .filter((url): url is string => Boolean(url))
  const gallery = directGallery.length ? directGallery : legacyGallery

  const cardCover = directGallery[0] || (imageDocs.length ? mediaURL(imageDocs[0], 'card') : null)
  const fallback = doc.fallbackImage || '/images/villa-01.jpg'
  const coordinates = privacySafeCoordinates(doc)
  const amount = doc.deal === 'rent'
    ? Number(doc.monthlyRentToman || 0)
    : Number(doc.salePriceToman || 0)

  return {
    id: String(doc.slug || doc.code || doc.id),
    code: doc.code || `IV-${doc.id}`,
    title: doc.title || 'فایل ملک ivila',
    location: doc.locationText || 'رویان و اطراف',
    lifestyle: doc.lifestyle || 'urban',
    type: doc.type ? typeMap[doc.type] : 'ویلا',
    deal: doc.deal === 'rent' ? 'اجاره' : 'فروش',
    price: buildPrice(doc),
    priceBillions: amount / 1_000_000_000,
    area: Number(doc.areaM2 || 0),
    rooms: Number(doc.rooms || 0),
    documentStatus: doc.documentStatus ? documentMap[doc.documentStatus] : 'در حال اخذ سند',
    seaDistanceM: Number(doc.seaDistanceM || 0),
    forestDistanceM: Number(doc.forestDistanceM || 0),
    lng: coordinates[0],
    lat: coordinates[1],
    image: cardCover || gallery[0] || fallback,
    images: gallery.length ? gallery : [fallback],
    badges: doc.badges?.length ? doc.badges : ['فایل ivila'],
    featured: Boolean(doc.featured),
    description: doc.description || 'توضیحات این فایل به‌زودی تکمیل می‌شود.',
    amenities: doc.amenities || [],
  }
}

async function payloadClient() {
  return getPayload({ config })
}

export async function getPublicProperties(): Promise<Property[]> {
  if (!process.env.DATABASE_URL) return demoProperties

  try {
    const payload = await payloadClient()
    const result = await payload.find({
      collection: 'properties',
      depth: 2,
      limit: 200,
      // Server-side repository may read the exact point, but it is converted to
      // a privacy-safe public point before anything reaches the browser.
      overrideAccess: true,
      where: { status: { equals: 'published' } },
      sort: '-updatedAt',
    })

    if (!result.docs.length) return demoProperties

    return (result.docs as unknown as PropertyDocument[])
      .map(toFrontendProperty)
      .sort((a, b) => Number(Boolean(b.featured)) - Number(Boolean(a.featured)))
  } catch (error) {
    console.error('[ivila] Could not load properties from Neon/Payload. Using demo fallback.', error)
    return demoProperties
  }
}

export async function getPublicProperty(id: string): Promise<Property | null> {
  if (process.env.DATABASE_URL) {
    try {
      const payload = await payloadClient()
      const normalized = id.trim().toLowerCase()
      const result = await payload.find({
        collection: 'properties',
        depth: 2,
        limit: 1,
        overrideAccess: true,
        where: {
          and: [
            { status: { equals: 'published' } },
            {
              or: [
                { slug: { equals: normalized } },
                { code: { equals: id.toUpperCase() } },
              ],
            },
          ],
        },
      })
      if (result.docs[0]) return toFrontendProperty(result.docs[0] as unknown as PropertyDocument)
    } catch (error) {
      console.error('[ivila] Could not load property from Neon/Payload. Checking demo fallback.', error)
    }
  }

  return demoProperties.find(item =>
    item.id === id || item.code.toLowerCase() === id.toLowerCase()
  ) || null
}

export async function getSimilarProperties(property: Property, limit = 3): Promise<Property[]> {
  const all = await getPublicProperties()
  const distanceScore = (item: Property) => {
    const dLat = item.lat - property.lat
    const dLng = item.lng - property.lng
    return (dLat * dLat) + (dLng * dLng)
  }

  return all
    .filter(item => item.id !== property.id)
    .sort((a, b) => {
      const aSame = a.lifestyle === property.lifestyle ? 0 : 1
      const bSame = b.lifestyle === property.lifestyle ? 0 : 1
      if (aSame !== bSame) return aSame - bSame
      return distanceScore(a) - distanceScore(b)
    })
    .slice(0, limit)
}
