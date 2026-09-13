import type { ReactNode } from 'react'
import { Info } from 'lucide-react'

/** One tab in the portfolio return strip. */
export function MetricSurface({ label, exact, children, selected, onSelect }: {
  label: string
  exact: string
  children: ReactNode
  selected: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={selected}
      aria-label={`${label}, ${exact}`}
      className={`metric-tab${selected ? ' active' : ''}`}
      onClick={onSelect}
    >
      <span className="metric-tab-label">
        {label}
        <Info aria-hidden="true" size={11} />
      </span>
      {children}
    </button>
  )
}
