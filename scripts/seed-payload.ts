import dotenv from 'dotenv'
import { getPayload } from 'payload'
import { properties as demoProperties } from '../lib/data'

const typeMap = {
  ویلا: 'villa',
  زمین: 'land',
  آپارتمان: 'apartment',
} as const

const documentMap = {
  'سند تک‌برگ': 'single-page',
  'سند شورایی': 'council',
  'قولنامه‌ای': 'contract',
  'در حال اخذ سند': 'in-progress',
} as const

async function main() {
  dotenv.config({ path: '.env.local' })
  dotenv.config()

  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is missing.')

  const { default: config } = await import('../payload.config')
  const payload = await getPayload({ config })
  let created = 0
  let updated = 0

  for (const property of demoProperties) {
    const existing = await payload.find({
      collection: 'properties',
      limit: 1,
      overrideAccess: true,
      where: { code: { equals: property.code } },
    })

    const data = {
      code: property.code,
      title: property.title,
      deal: property.deal === 'اجاره' ? 'rent' : 'sale',
      type: typeMap[property.type],
      lifestyle: property.lifestyle,
      areaM2: property.area,
      rooms: property.rooms,
      documentStatus: documentMap[property.documentStatus],
      description: property.description,
      priceDisplay: property.price,
      salePriceToman: property.deal === 'فروش' ? Math.round(property.priceBillions * 1_000_000_000) : undefined,
      monthlyRentToman: property.deal === 'اجاره' ? Math.round(property.priceBillions * 1_000_000_000) : undefined,
      locationText: property.location,
      coordinates: [property.lng, property.lat] as [number, number],
      seaDistanceM: property.seaDistanceM,
      forestDistanceM: property.forestDistanceM,
      fallbackImage: property.image,
      badges: property.badges,
      amenities: property.amenities,
      featured: Boolean(property.featured),
      status: 'published',
    } as const

    if (existing.docs[0]) {
      await payload.update({
        collection: 'properties',
        id: existing.docs[0].id,
        data,
        overrideAccess: true,
      })
      updated += 1
    } else {
      await payload.create({
        collection: 'properties',
        data,
        overrideAccess: true,
      })
      created += 1
    }
  }

  console.log(`[ivila] Seed complete. Created: ${created}, Updated: ${updated}`)
  process.exit(0)
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
