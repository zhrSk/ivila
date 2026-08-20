'use client'

import { ChevronLeft, ChevronRight, Images, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

type NaturalSize = { width: number; height: number }

function highQualitySource(src: string) {
  if (!src) return src
  try {
    if (!/^https?:\/\//i.test(src)) return src
    const url = new URL(src)
    if (url.hostname === 'images.unsplash.com') {
      url.searchParams.set('auto', 'format')
      url.searchParams.set('fit', 'max')
      url.searchParams.set('w', '2800')
      url.searchParams.set('q', '92')
      return url.toString()
    }
  } catch {
    // Relative/static URLs are already served as-is.
  }
  return src
}

export default function PropertyGallery({ images, title }: { images: string[]; title: string }) {
  const rawGallery = images.length ? images : ['/images/villa-01.jpg']
  const gallery = useMemo(() => rawGallery.map(highQualitySource), [rawGallery.join('|')])
  const [open, setOpen] = useState(false)
  const [index, setIndex] = useState(0)
  const [heroIndex, setHeroIndex] = useState(0)
  const [naturalSizes, setNaturalSizes] = useState<Record<number, NaturalSize>>({})

  const show = (next: number) => {
    setIndex((next + gallery.length) % gallery.length)
    setOpen(true)
  }

  useEffect(() => {
    setHeroIndex(0)
    setNaturalSizes({})
  }, [gallery.join('|')])

  // Old/demo images may have been saved at a much smaller resolution than the
  // rest of the gallery. Keep the configured cover for cards, but on the large
  // detail hero automatically prefer a clearly sharper gallery image.
  useEffect(() => {
    const first = naturalSizes[0]
    if (!first || gallery.length < 2) return

    const firstPixels = first.width * first.height
    const firstIsSmall = first.width < 1600 || firstPixels < 1_800_000
    if (!firstIsSmall) return

    let bestIndex = 0
    let bestPixels = firstPixels
    Object.entries(naturalSizes).forEach(([key, size]) => {
      const pixels = size.width * size.height
      if (pixels > bestPixels) {
        bestPixels = pixels
        bestIndex = Number(key)
      }
    })

    if (bestIndex !== 0 && bestPixels >= firstPixels * 1.6) setHeroIndex(bestIndex)
  }, [naturalSizes, gallery.length])

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
      if (event.key === 'ArrowLeft') setIndex((v) => (v + 1) % gallery.length)
      if (event.key === 'ArrowRight') setIndex((v) => (v - 1 + gallery.length) % gallery.length)
    }
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, gallery.length])

  const sideIndexes = gallery.map((_, i) => i).filter(i => i !== heroIndex).slice(0, 2)
  const registerNaturalSize = (imageIndex: number, image: HTMLImageElement) => {
    const width = image.naturalWidth
    const height = image.naturalHeight
    if (!width || !height) return
    setNaturalSizes(previous => {
      const old = previous[imageIndex]
      if (old?.width === width && old?.height === height) return previous
      return { ...previous, [imageIndex]: { width, height } }
    })
  }

  return <>
    <div className="detail-gallery">
      <button type="button" className="detail-gallery-main" onClick={() => show(heroIndex)}>
        <img
          src={gallery[heroIndex]}
          alt={title}
          loading="eager"
          fetchPriority="high"
          decoding="async"
          draggable={false}
          onLoad={event => registerNaturalSize(heroIndex, event.currentTarget)}
        />
      </button>
      <div className="detail-gallery-side">
        {sideIndexes.map((imageIndex, i) => (
          <button type="button" className="gallery-tile" key={`${gallery[imageIndex]}-${imageIndex}`} onClick={() => show(imageIndex)}>
            <img
              src={gallery[imageIndex]}
              alt={`${title} - ${i + 2}`}
              loading="lazy"
              decoding="async"
              onLoad={event => registerNaturalSize(imageIndex, event.currentTarget)}
            />
          </button>
        ))}
      </div>
      <button type="button" className="gallery-counter" onClick={() => show(heroIndex)}>
        <Images size={15}/>{gallery.length.toLocaleString('fa-IR')} تصویر · مشاهده همه
      </button>
    </div>

    {/* Preload remaining gallery dimensions without displaying extra elements. */}
    <div aria-hidden="true" style={{ position: 'fixed', width: 1, height: 1, overflow: 'hidden', opacity: 0, pointerEvents: 'none' }}>
      {gallery.map((src, imageIndex) => imageIndex === heroIndex || sideIndexes.includes(imageIndex) ? null : (
        <img key={`${src}-probe-${imageIndex}`} src={src} alt="" onLoad={event => registerNaturalSize(imageIndex, event.currentTarget)} />
      ))}
    </div>

    {open && <div className="gallery-lightbox" role="dialog" aria-modal="true" aria-label="گالری تصاویر">
      <button className="gallery-close" type="button" onClick={() => setOpen(false)}><X size={23}/></button>
      <button className="gallery-nav gallery-prev" type="button" onClick={() => setIndex((index - 1 + gallery.length) % gallery.length)}><ChevronRight size={27}/></button>
      <div className="gallery-lightbox-stage">
        <img src={gallery[index]} alt={`${title} - تصویر ${index + 1}`} decoding="async" />
        <span>{(index + 1).toLocaleString('fa-IR')} / {gallery.length.toLocaleString('fa-IR')}</span>
      </div>
      <button className="gallery-nav gallery-next" type="button" onClick={() => setIndex((index + 1) % gallery.length)}><ChevronLeft size={27}/></button>
      <div className="gallery-thumbs">
        {gallery.map((src, i) => <button type="button" key={`${src}-${i}`} className={i === index ? 'active' : ''} onClick={() => setIndex(i)}><img src={src} alt="" loading="lazy" /></button>)}
      </div>
    </div>}
  </>
}
