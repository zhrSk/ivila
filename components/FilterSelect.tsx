'use client'

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode
} from 'react'
import { createPortal } from 'react-dom'
import { Check, ChevronDown } from 'lucide-react'

export type FilterSelectOption = {
  value: string
  label: string
}

type FilterSelectProps = {
  label: string
  value: string
  options: FilterSelectOption[]
  onChange: (value: string) => void
  className?: string
  icon?: ReactNode
  active?: boolean
}

type MenuPosition = {
  top: number
  left: number
  width: number
  maxHeight: number
  above: boolean
}

export default function FilterSelect({
  label,
  value,
  options,
  onChange,
  className = '',
  icon,
  active = false
}: FilterSelectProps) {
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [menuPosition, setMenuPosition] = useState<MenuPosition>({
    top: 0,
    left: 0,
    width: 0,
    maxHeight: 250,
    above: false
  })
  const rootRef = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const menuId = useId()

  const selected = useMemo(
    () => options.find(option => option.value === value) ?? options[0],
    [options, value]
  )

  useEffect(() => setMounted(true), [])

  const updateMenuPosition = useCallback(() => {
    const trigger = rootRef.current
    if (!trigger || typeof window === 'undefined') return

    const rect = trigger.getBoundingClientRect()
    const viewportPadding = 8
    const gap = 6
    const viewportHeight = window.innerHeight
    const viewportWidth = window.innerWidth
    const spaceBelow = viewportHeight - rect.bottom - gap - viewportPadding
    const spaceAbove = rect.top - gap - viewportPadding
    const above = spaceBelow < 180 && spaceAbove > spaceBelow
    const availableHeight = above ? spaceAbove : spaceBelow
    const maxHeight = Math.max(120, Math.min(260, availableHeight))
    const width = Math.min(rect.width, viewportWidth - viewportPadding * 2)
    const left = Math.min(
      Math.max(viewportPadding, rect.left),
      Math.max(viewportPadding, viewportWidth - width - viewportPadding)
    )

    setMenuPosition({
      top: above ? rect.top - gap : rect.bottom + gap,
      left,
      width,
      maxHeight,
      above
    })
  }, [])

  useEffect(() => {
    if (!open) return

    updateMenuPosition()
    window.addEventListener('resize', updateMenuPosition)
    window.addEventListener('scroll', updateMenuPosition, true)

    return () => {
      window.removeEventListener('resize', updateMenuPosition)
      window.removeEventListener('scroll', updateMenuPosition, true)
    }
  }, [open, updateMenuPosition])

  useEffect(() => {
    const closeOnOutside = (event: PointerEvent) => {
      const target = event.target as Node
      const clickedTrigger = rootRef.current?.contains(target)
      const clickedMenu = menuRef.current?.contains(target)
      if (!clickedTrigger && !clickedMenu) setOpen(false)
    }

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('pointerdown', closeOnOutside)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('pointerdown', closeOnOutside)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [])

  const menuStyle: CSSProperties = {
    top: menuPosition.top,
    left: menuPosition.left,
    right: 'auto',
    width: menuPosition.width,
    minWidth: menuPosition.width,
    maxHeight: menuPosition.maxHeight,
    transform: menuPosition.above ? 'translateY(-100%)' : undefined
  }

  const menu = open && mounted ? createPortal(
    <div
      ref={menuRef}
      id={menuId}
      className="filter-select-menu filter-select-portal-menu"
      role="listbox"
      aria-label={label}
      dir="rtl"
      style={menuStyle}
    >
      {options.map(option => {
        const isSelected = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            role="option"
            aria-selected={isSelected}
            className={`filter-select-option ${isSelected ? 'selected' : ''}`}
            onClick={() => {
              onChange(option.value)
              setOpen(false)
            }}
          >
            <span>{option.label}</span>
            {isSelected && <Check size={15}/>} 
          </button>
        )
      })}
    </div>,
    document.body
  ) : null

  return (
    <>
      <div ref={rootRef} className={`filter-select ${className} ${active ? 'active' : ''} ${open ? 'open' : ''}`}>
        <button
          type="button"
          className="filter-select-trigger"
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={menuId}
          onClick={() => {
            if (!open) updateMenuPosition()
            setOpen(current => !current)
          }}
        >
          {icon && <span className="filter-select-leading-icon">{icon}</span>}
          <span className="filter-select-copy">
            <small>{label}</small>
            <strong>{selected?.label}</strong>
          </span>
          <ChevronDown className="filter-select-chevron" size={16}/>
        </button>
      </div>
      {menu}
    </>
  )
}
