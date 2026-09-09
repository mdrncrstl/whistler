import { X } from 'lucide-react'
import type { ChartRangeSummary } from '../lib/chartRange'

export function ChartRangeReadout({ summary, dragging, onClear, formatValue, formatLabel }: {
  summary: ChartRangeSummary | null
  dragging: boolean
  onClear: () => void
  formatValue: (value: number) => string
  formatLabel: (label: string) => string
}) {
  if (!summary) {
    return <p className="chart-range-hint">Drag across the chart to measure a period.</p>
  }
  const direction = summary.change > 0 ? 'positive' : summary.change < 0 ? 'negative' : ''
  return (
    <div className={`chart-range-readout ${dragging ? 'is-dragging' : ''}`} role="status" aria-live="polite">
      <span className="chart-range-span">{formatLabel(summary.fromLabel)} – {formatLabel(summary.toLabel)}</span>
      <strong className={direction}>
        {summary.changePercent === null ? 'No base value' : `${summary.changePercent > 0 ? '+' : ''}${summary.changePercent.toFixed(2)}%`}
      </strong>
      <span className={`chart-range-change ${direction}`}>
        {summary.change > 0 ? '+' : ''}{formatValue(summary.change)}
      </span>
      {!dragging && (
        <button type="button" aria-label="Clear selected period" onClick={onClear}><X size={13} /></button>
      )}
    </div>
  )
}
