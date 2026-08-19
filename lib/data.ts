export type Lifestyle = 'all' | 'coast' | 'forest' | 'village' | 'urban'
export type DocumentStatus = 'سند تک‌برگ' | 'سند شورایی' | 'قولنامه‌ای' | 'در حال اخذ سند'

export type Property = {
  id: string
  code: string
  title: string
  location: string
  lifestyle: Exclude<Lifestyle, 'all'>
  type: 'ویلا' | 'زمین' | 'آپارتمان'
  deal: 'فروش' | 'اجاره'
  price: string
  priceBillions: number
  area: number
  rooms: number
  documentStatus: DocumentStatus
  seaDistanceM: number
  forestDistanceM: number
  lat: number
  lng: number
  image: string
  images?: string[]
  badges: string[]
  featured?: boolean
  description: string
  amenities: string[]
}

export const properties: Property[] = [
  {
    id: 'r-101', code: 'IV-101',
    title: 'ویلای مدرن نزدیک ساحل',
    location: 'رویان، نوار ساحلی', lifestyle: 'coast', type: 'ویلا', deal: 'فروش',
    price: '۱۸.۸ میلیارد', priceBillions: 18.8, area: 420, rooms: 4,
    documentStatus: 'سند تک‌برگ', seaDistanceM: 240, forestDistanceM: 4100,
    lat: 36.5762, lng: 51.9568, image: '/images/villa-01.jpg',
    badges: ['۳ دقیقه تا دریا', 'سند تک‌برگ'], featured: true,
    description: 'ویلای مینیمال با حیاط خصوصی، نورگیری کامل و دسترسی سریع به ساحل. مناسب سکونت دائم یا سرمایه‌گذاری.',
    amenities: ['پارکینگ', 'حیاط خصوصی', 'تراس', 'گرمایش پکیج', 'دسترسی آسفالت', 'نورگیری سه‌طرفه']
  },
  {
    id: 'r-102', code: 'IV-102',
    title: 'زمین خوش‌قواره در حاشیه جنگل',
    location: 'جنوب رویان، مسیر جنگلی', lifestyle: 'forest', type: 'زمین', deal: 'فروش',
    price: '۷.۴ میلیارد', priceBillions: 7.4, area: 760, rooms: 0,
    documentStatus: 'سند شورایی', seaDistanceM: 3900, forestDistanceM: 180,
    lat: 36.5486, lng: 51.9724, image: '/images/villa-02.jpg',
    badges: ['لب جنگل', 'دسترسی آسفالت'], featured: true,
    description: 'قطعه زمین مناسب ساخت ویلای شخصی در محیط آرام و سبز، با مسیر دسترسی مناسب از محور اصلی.',
    amenities: ['دسترسی آسفالت', 'برق در دسترس', 'آب در دسترس', 'بافت کم‌تراکم', 'دید سبز']
  },
  {
    id: 'r-103', code: 'IV-103',
    title: 'ویلای دنج با چشم‌انداز سبز',
    location: 'روستای جنوبی رویان', lifestyle: 'village', type: 'ویلا', deal: 'فروش',
    price: '۱۲.۹ میلیارد', priceBillions: 12.9, area: 510, rooms: 3,
    documentStatus: 'سند تک‌برگ', seaDistanceM: 2500, forestDistanceM: 620,
    lat: 36.5561, lng: 51.9389, image: '/images/villa-03.jpg',
    badges: ['محیط آرام', 'حیاط بزرگ'],
    description: 'ویلای خانوادگی در بافت کم‌تراکم با فضای باز وسیع و دسترسی مناسب به مرکز رویان.',
    amenities: ['پارکینگ', 'حیاط بزرگ', 'انباری', 'تراس', 'دسترسی آسفالت', 'محیط کم‌تردد']
  },
  {
    id: 'r-104', code: 'IV-104',
    title: 'آپارتمان نوساز مرکز رویان',
    location: 'رویان، محدوده مرکزی', lifestyle: 'urban', type: 'آپارتمان', deal: 'فروش',
    price: '۹.۶ میلیارد', priceBillions: 9.6, area: 138, rooms: 3,
    documentStatus: 'سند تک‌برگ', seaDistanceM: 1100, forestDistanceM: 3200,
    lat: 36.5677, lng: 51.9621, image: '/images/villa-04.jpg',
    badges: ['نوساز', 'دسترسی شهری'],
    description: 'واحد نوساز با پلان کاربردی، پارکینگ و آسانسور در محدوده مرکزی و نزدیک خدمات روزمره.',
    amenities: ['پارکینگ', 'آسانسور', 'انباری', 'بالکن', 'پکیج', 'دسترسی شهری']
  },
  {
    id: 'r-105', code: 'IV-105',
    title: 'ویلای ساحلی با تراس بزرگ',
    location: 'غرب رویان، نزدیک ساحل', lifestyle: 'coast', type: 'ویلا', deal: 'فروش',
    price: '۲۴.۵ میلیارد', priceBillions: 24.5, area: 610, rooms: 5,
    documentStatus: 'سند تک‌برگ', seaDistanceM: 90, forestDistanceM: 4700,
    lat: 36.5738, lng: 51.9278, image: '/images/villa-05.jpg',
    badges: ['۹۰ متر تا ساحل', 'تراس سراسری'],
    description: 'ویلای لوکس با تراس بزرگ و فضاهای جمعی باز، مناسب خانواده‌های پرجمعیت و اقامت‌های طولانی.',
    amenities: ['پارکینگ', 'تراس سراسری', 'حیاط خصوصی', 'اتاق مستر', 'نورگیری عالی', 'دسترسی سریع ساحل']
  },
  {
    id: 'r-106', code: 'IV-106',
    title: 'زمین جنگلی برای ویلای شخصی',
    location: 'حاشیه جنوبی رویان', lifestyle: 'forest', type: 'زمین', deal: 'فروش',
    price: '۵.۹ میلیارد', priceBillions: 5.9, area: 580, rooms: 0,
    documentStatus: 'قولنامه‌ای', seaDistanceM: 4400, forestDistanceM: 120,
    lat: 36.5419, lng: 51.9482, image: '/images/villa-06.jpg',
    badges: ['۱۲۰ متر تا جنگل', 'کوچه کم‌تردد'],
    description: 'قطعه‌ای خوش‌ابعاد در فضای سبز و کم‌تردد؛ مناسب ساخت یک ویلای شخصی با حریم مناسب.',
    amenities: ['کوچه کم‌تردد', 'بافت سبز', 'برق در دسترس', 'دسترسی خودرو', 'حریم مناسب']
  },
  {
    id: 'r-107', code: 'IV-107',
    title: 'ویلای مبله نزدیک ساحل برای اجاره',
    location: 'رویان، محدوده ساحلی', lifestyle: 'coast', type: 'ویلا', deal: 'اجاره',
    price: 'ماهانه ۹۵ میلیون', priceBillions: 0.095, area: 280, rooms: 3,
    documentStatus: 'سند تک‌برگ', seaDistanceM: 310, forestDistanceM: 3900,
    lat: 36.5750, lng: 51.9664, image: '/images/villa-03.jpg',
    badges: ['۵ دقیقه تا دریا', 'مبله کامل'],
    description: 'ویلای مبله برای اجاره میان‌مدت با حیاط مستقل و دسترسی سریع به ساحل و خدمات روزمره رویان.',
    amenities: ['مبله کامل', 'پارکینگ', 'حیاط مستقل', 'اینترنت', 'سیستم گرمایش', 'دسترسی ساحلی']
  },
  {
    id: 'r-108', code: 'IV-108',
    title: 'ویلای روستایی آرام برای اجاره',
    location: 'روستاهای جنوبی رویان', lifestyle: 'village', type: 'ویلا', deal: 'اجاره',
    price: 'ماهانه ۶۸ میلیون', priceBillions: 0.068, area: 360, rooms: 2,
    documentStatus: 'سند تک‌برگ', seaDistanceM: 2800, forestDistanceM: 540,
    lat: 36.5536, lng: 51.9510, image: '/images/villa-02.jpg',
    badges: ['محیط آرام', 'نزدیک جنگل'],
    description: 'ویلای دنج در بافت روستایی کم‌تردد برای اجاره، مناسب اقامت خانوادگی با دسترسی خوب به رویان.',
    amenities: ['حیاط', 'پارکینگ', 'مبله', 'آب و برق مستقل', 'دسترسی آسفالت', 'محیط آرام']
  }
]

export const lifestyleLabels: Record<Lifestyle, string> = {
  all: 'همه فایل‌ها', coast: 'ساحلی', forest: 'جنگلی', village: 'روستایی', urban: 'شهری'
}

export const demoZones = {
  type: 'FeatureCollection' as const,
  features: [
    {
      type: 'Feature' as const,
      properties: { name: 'نوار ساحلی نمایشی', kind: 'coast' },
      geometry: {
        type: 'Polygon' as const,
        coordinates: [[[51.915,36.571],[51.992,36.571],[51.992,36.584],[51.915,36.584],[51.915,36.571]]]
      }
    },
    {
      type: 'Feature' as const,
      properties: { name: 'حاشیه جنگلی نمایشی', kind: 'forest' },
      geometry: {
        type: 'Polygon' as const,
        coordinates: [[[51.927,36.532],[51.986,36.532],[51.986,36.553],[51.927,36.553],[51.927,36.532]]]
      }
    }
  ]
}
