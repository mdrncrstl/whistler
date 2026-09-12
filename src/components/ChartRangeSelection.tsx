import { usePlotArea, useXAxisScale, useYAxisScale } from 'recharts'
import type { ChartRangeSummary } from '../lib/chartRange'

/** One chart-local measurement, sharing the plotted axes instead of pointer pixels. */
export function ChartRangeReadout({ summary, formatValue, formatLabel }: {
  summary: ChartRangeSummary | null
  dragging?: boolean
  onClear?: () => void
  formatValue: (value: number) => string
  formatLabel: (label: string) => string
}) {
  const plot = usePlotArea()
  const xScale = useXAxisScale()
  const yScale = useYAxisScale()
  if (!summary || !plot || !xScale || !yScale) return null
  const x1 = xScale(summary.fromLabel, { position: 'middle' })
  const x2 = xScale(summary.toLabel, { position: 'middle' })
  const y1 = yScale(summary.fromValue)
  const y2 = yScale(summary.toValue)
  if (x1 == null || x2 == null || y1 == null || y2 == null) return null
  const color = summary.change < 0 ? 'var(--chart-down)' : 'var(--chart-up)'
  const percent = summary.changePercent === null ? '—' : `${summary.changePercent >= 0 ? '+' : ''}${summary.changePercent.toFixed(2)}%`
  return <g className="chart-range-measurement" pointerEvents="none">
    <rect x={x1} y={plot.y} width={Math.max(0, x2 - x1)} height={plot.height} fill={color} fillOpacity={.055}/>
    {[x1, x2].map((x, index) => <line key={index} x1={x} x2={x} y1={plot.y} y2={plot.y + plot.height} stroke="var(--muted-2)" strokeDasharray="3 4" strokeWidth={1}/>)}
    <circle cx={x1} cy={y1} r={4.5} fill={color} stroke="var(--surface)" strokeWidth={2}/>
    <circle cx={x2} cy={y2} r={4.5} fill={color} stroke="var(--surface)" strokeWidth={2}/>
    <foreignObject x={plot.x + 8} y={plot.y + 4} width={Math.max(0, plot.width - 16)} height={64}>
      <div className="chart-range-measure-label" role="status">
        <strong style={{ color }}>{percent}</strong>
        <span style={{ color }}>({summary.change > 0 ? '+' : ''}{formatValue(summary.change)})</span>
        <span>{formatLabel(summary.fromLabel)} – {formatLabel(summary.toLabel)}</span>
      </div>
    </foreignObject>
  </g>
}
