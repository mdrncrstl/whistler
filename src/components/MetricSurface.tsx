import type { ReactNode } from 'react'
import { Info } from 'lucide-react'

/**
 * One tab in the portfolio return strip.
 *
 * Deliberately a bare button: the strip is a flat row of cells, and any wrapper that clips its
 * own overflow also clips the hover value that sits above the cell.
 */
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
      <span className="metric-hover-value" aria-hidden="true"><span className="private-value">{exact}</span></span>
    </button>
  )
}
