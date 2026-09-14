import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { Info } from 'lucide-react'
import { MotionPopover } from './ui'

/** One tab in the portfolio return strip. */
export function MetricSurface({ label, exact, description, children, selected, onSelect }: {
  label: string
  exact: string
  description: string
  children: ReactNode
  selected: boolean
  onSelect: () => void
}) {
  const [infoOpen, setInfoOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const infoId = useId()

  useEffect(() => {
    if (!infoOpen) return
    const closeOutside = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setInfoOpen(false)
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setInfoOpen(false)
    }
    document.addEventListener('pointerdown', closeOutside)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('pointerdown', closeOutside)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [infoOpen])

  return (
    <div ref={root} className={`metric-tab-shell${infoOpen ? ' info-open' : ''}`} role="presentation">
      <button
        type="button"
        role="tab"
        aria-selected={selected}
        aria-label={`${label}, ${exact}`}
        className={`metric-tab${selected ? ' active' : ''}`}
        onClick={onSelect}
      >
        <span className="metric-tab-label">{label}</span>
        {children}
      </button>
      <button
        type="button"
        className="metric-info-button"
        aria-label={`About ${label}`}
        aria-expanded={infoOpen}
        aria-controls={infoId}
        onClick={() => setInfoOpen((open) => !open)}
      >
        <Info aria-hidden="true" size={13} />
      </button>
      <MotionPopover open={infoOpen} className="metric-info-popover" role="tooltip" ariaLabel={`${label} definition`} id={infoId} origin="top left">
        <strong>{label}</strong>
        <p>{description}</p>
      </MotionPopover>
    </div>
  )
}
