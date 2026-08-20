'use client'

import { ChevronLeft, ChevronRight, Images, X } from 'lucide-react'
import { useEffect, useState } from 'react'

export default function PropertyGallery({ images, title }: { images: string[]; title: string }) {
  const gallery = images.length ? images : ['/images/villa-01.jpg']
  const [open, setOpen] = useState(false)
  const [index, setIndex] = useState(0)
  const show = (next: number) => { setIndex((next + gallery.length) % gallery.length); setOpen(true) }

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
      if (event.key === 'ArrowLeft') setIndex((v) => (v + 1) % gallery.length)
      if (event.key === 'ArrowRight') setIndex((v) => (v - 1 + gallery.length) % gallery.length)
    }
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = '' }
  }, [open, gallery.length])

  return <>
    <div className="detail-gallery">
      <button type="button" className="detail-gallery-main" onClick={() => show(0)}><img src={gallery[0]} alt={title}/></button>
      <div className="detail-gallery-side">
        {gallery.slice(1,3).map((src, i)=><button type="button" className="gallery-tile" key={src+i} onClick={()=>show(i+1)}><img src={src} alt={`${title} - ${i+2}`}/></button>)}
      </div>
      <button type="button" className="gallery-counter" onClick={()=>show(0)}><Images size={15}/>{gallery.length.toLocaleString('fa-IR')} تصویر · مشاهده همه</button>
    </div>
    {open && <div className="gallery-lightbox" role="dialog" aria-modal="true" aria-label="گالری تصاویر">
      <button className="gallery-close" type="button" onClick={()=>setOpen(false)}><X size={23}/></button>
      <button className="gallery-nav gallery-prev" type="button" onClick={()=>setIndex((index-1+gallery.length)%gallery.length)}><ChevronRight size={27}/></button>
      <div className="gallery-lightbox-stage"><img src={gallery[index]} alt={`${title} - تصویر ${index+1}`}/><span>{(index+1).toLocaleString('fa-IR')} / {gallery.length.toLocaleString('fa-IR')}</span></div>
      <button className="gallery-nav gallery-next" type="button" onClick={()=>setIndex((index+1)%gallery.length)}><ChevronLeft size={27}/></button>
      <div className="gallery-thumbs">{gallery.map((src,i)=><button type="button" key={src+i} className={i===index?'active':''} onClick={()=>setIndex(i)}><img src={src} alt=""/></button>)}</div>
    </div>}
  </>
}
