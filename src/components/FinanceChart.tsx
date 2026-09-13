import { useId, useLayoutEffect, useMemo, useRef, useState, type PointerEvent } from 'react'
import { date } from '../lib/format'
import { nearestFinancePoint, normaliseFinancePoints, type FinancePoint } from './financeChartUtils'
import './finance-chart.css'

type FinanceChartProps = {
  points: FinancePoint[]
  label?: string
  formatValue: (value: number) => string
  formatAxis?: (value: number) => string
  bars?: boolean
  comparisonLabel?: string
  area?: boolean
  resolution?: 'daily' | 'recorded'
}

const fullDate = { day: 'numeric' as const, month: 'short' as const, year: 'numeric' as const, timeZone: 'UTC' as const }

/** Shared Google Finance-style plot: hover a daily point, or drag two points to compare them. */
export function FinanceChart({ points, label = 'Price', formatValue, formatAxis = formatValue, bars = false, comparisonLabel = 'Benchmark', area = true, resolution = 'recorded' }: FinanceChartProps) {
  const host = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const id = useId().replaceAll(':', '')
  const [width, setWidth] = useState(800)
  const [hover, setHover] = useState<number | null>(null)
  const [selection, setSelection] = useState<[number, number] | null>(null)
  const [pointer, setPointer] = useState<{ x: number; y: number } | null>(null)
  const anchor = useRef<number | null>(null)
  const data = useMemo(() => normaliseFinancePoints(points), [points])
  const [previousData, setPreviousData] = useState(data)
  if (previousData !== data) {
    setPreviousData(data)
    setHover(null)
    setSelection(null)
    setPointer(null)
  }

  useLayoutEffect(() => { anchor.current = null }, [data])

  useLayoutEffect(() => {
    if (!host.current) return
    const observer = new ResizeObserver(([entry]) => setWidth(Math.max(320, entry.contentRect.width)))
    observer.observe(host.current)
    return () => observer.disconnect()
  }, [data.length])

  if (data.length < 2) return <p className="finance-empty">Not enough recorded history for this period.</p>

  const height = width < 500 ? 280 : 310
  const axisLabelLength = Math.max(...data.flatMap(p => [formatAxis(p.value).length, p.comparison === undefined ? 0 : formatAxis(p.comparison).length]))
  const left = Math.max(width < 500 ? 58 : 70, Math.min(width * .35, axisLabelLength * (width < 500 ? 5.5 : 7) + 18))
  const right = width - 24
  const top = 58
  const bottom = height - 42
  const values = data.flatMap(p => [p.value, ...(p.comparison !== undefined && Number.isFinite(p.comparison) ? [p.comparison] : [])])
  const low = Math.min(...values, ...(bars ? [0] : []))
  const high = Math.max(...values, ...(bars ? [0] : []))
  const span = high - low || Math.abs(high) * .1 || 1
  const rawStep = span / 4
  const magnitude = 10 ** Math.floor(Math.log10(rawStep))
  const step = magnitude * ([1, 2, 5, 10].find(n => n * magnitude >= rawStep) || 10)
  const min = Math.floor((low - span * .08) / step) * step
  const max = Math.ceil((high + span * .08) / step) * step
  const firstTime = Date.parse(data[0]?.date || '')
  const lastTime = Date.parse(data.at(-1)?.date || '')
  const timeSpan = lastTime - firstTime || 1
  const chartSpan = right - left
  const times = data.map(point => Date.parse(point.date))
  const x = (index: number) => left + (times[index] - firstTime) / timeSpan * chartSpan
  const xForTime = (time: number) => left + (time - firstTime) / timeSpan * chartSpan
  const y = (value: number) => bottom - (value - min) / (max - min || 1) * (bottom - top)

  const pointFromPointer = (clientX: number, clientY: number) => {
    const rect = svgRef.current?.getBoundingClientRect()
    if (!rect || !rect.width || !rect.height) return { index: 0, x: left, y: top }
    const scaleX = width / rect.width
    const scaleY = height / rect.height
    const localX = Math.max(left, Math.min(right, (clientX - rect.left) * scaleX))
    const localY = Math.max(0, Math.min(height, (clientY - rect.top) * scaleY))
    const targetTime = firstTime + (localX - left) / chartSpan * timeSpan
    return { index: nearestFinancePoint(times, targetTime) ?? 0, x: localX, y: localY }
  }

  const move = (event: PointerEvent<SVGSVGElement>) => {
    const next = pointFromPointer(event.clientX, event.clientY)
    setPointer({ x: next.x, y: next.y })
    setHover(next.index)
    if (anchor.current !== null) setSelection([anchor.current, next.index])
  }

  const selected = selection && selection[0] !== selection[1] ? [...selection].sort((a, b) => a - b) as [number, number] : null
  const selectedStart = selected ? data[selected[0]] : null
  const selectedEnd = selected ? data[selected[1]] : null
  const current = hover !== null ? data[hover] : null
  const a = selectedStart || current
  const b = selectedEnd || current
  const previous = hover !== null ? data[Math.max(0, hover - 1)] : null
  const base = selected ? selectedStart?.measurementValue ?? selectedStart?.value : previous?.measurementValue ?? previous?.value
  const end = selected ? selectedEnd?.measurementValue ?? selectedEnd?.value : current?.measurementValue ?? current?.value
  const displayDelta = selected && selectedStart && selectedEnd ? selectedEnd.value - selectedStart.value : current?.value ?? 0
  const percent = base !== undefined && end !== undefined && Math.abs(base) > Number.EPSILON ? (end - base) / Math.abs(base) * 100 : null
  const percentText = percent === null ? '—' : `${percent.toFixed(2)}%`
  const positive = (selected ? displayDelta : percent || 0) >= 0
  const color = data.at(-1) && data[0] && data.at(-1)!.value < data[0].value ? 'var(--finance-down)' : 'var(--finance-up)'
  const line = data.map((point, index) => `${index ? 'L' : 'M'}${x(index)},${y(point.value)}`).join(' ')
  const ticks = Array.from({ length: Math.round((max - min) / step) + 1 }, (_, index) => min + step * index)
  const tickCount = width < 500 ? 3 : 6
  const xTicks: number[] = []
  if (lastTime - firstTime > 120 * 86400000) {
    const latest = new Date(lastTime)
    const months = Math.max(1, Math.ceil((lastTime - firstTime) / (30.44 * 86400000) / tickCount))
    for (let offset = 0; offset < 120; offset += months) {
      const time = Date.UTC(latest.getUTCFullYear(), latest.getUTCMonth() - offset, 1)
      if (time < firstTime) break
      xTicks.unshift(time)
    }
  } else {
    for (let index = 0; index < tickCount; index++) xTicks.push(times[Math.round(index * (data.length - 1) / (tickCount - 1))])
  }
  const maxVolume = Math.max(1, ...data.map(p => p.volume || 0))
  const volume = (value: number) => Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(value)
  const tooltipIndex = hover ?? selected?.[1] ?? null
  const tooltipPoint = tooltipIndex === null ? null : data[tooltipIndex]
  const tooltipStyle = pointer ? { left: `${Math.max(left + 10, Math.min(right - 10, pointer.x))}px`, top: `${Math.max(top + 42, Math.min(bottom - 10, pointer.y - 12))}px` } : undefined
  const dataDescription = resolution === 'daily' ? 'Daily market points' : 'Recorded portfolio points'

  return <div className="finance-plot" ref={host} data-range={Boolean(selected)} data-points={data.length} data-resolution={resolution}>
    <svg ref={svgRef} width="100%" height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${label} history. ${dataDescription} can be inspected with the pointer. Drag between dates to compare. Use arrow keys to inspect, Shift and arrows to compare, Escape to clear.`}
      tabIndex={0} onPointerMove={move}
      onPointerDown={event => {
        if (event.button !== 0) return
        const next = pointFromPointer(event.clientX, event.clientY)
        anchor.current = next.index
        setSelection(null)
        setHover(next.index)
        setPointer({ x: next.x, y: next.y })
        event.currentTarget.blur()
        event.currentTarget.setPointerCapture(event.pointerId)
      }}
      onPointerUp={event => {
        if (anchor.current !== null) {
          const next = pointFromPointer(event.clientX, event.clientY)
          setSelection(next.index === anchor.current ? null : [anchor.current, next.index])
          setHover(next.index)
          setPointer({ x: next.x, y: next.y })
        }
        anchor.current = null
        if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
      }}
      onPointerCancel={() => { anchor.current = null; setSelection(null); setHover(null); setPointer(null) }}
      onPointerLeave={() => { if (anchor.current === null) { setHover(selected?.[1] ?? null); setPointer(null) } }}
      onKeyDown={event => {
        if (event.key === 'Escape') { setSelection(null); setHover(null); setPointer(null); anchor.current = null }
        if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
          event.preventDefault()
          const currentIndex = hover ?? 0
          const next = Math.max(0, Math.min(data.length - 1, currentIndex + (event.key === 'ArrowRight' ? 1 : -1)))
          setHover(next)
          setPointer({ x: x(next), y: y(data[next].value) })
          setSelection(event.shiftKey ? [selection?.[0] ?? currentIndex, next] : null)
        }
      }}>
      <defs><linearGradient id={`finance-${id}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={color} stopOpacity=".34"/><stop offset="1" stopColor={color} stopOpacity="0"/></linearGradient></defs>
      {selected && !bars && <rect className="finance-selection-band" x={x(selected[0])} y={top - 12} width={Math.max(1, x(selected[1]) - x(selected[0]))} height={bottom - top + 12}/>}
      {[...new Set(xTicks)].map(time => { const px = xForTime(time); return <g key={time}><line x1={px} x2={px} y1={top} y2={bottom} className="finance-grid"/><text x={px} y={height - 16} textAnchor={px < left + 24 ? 'start' : px > right - 24 ? 'end' : 'middle'}>{date(new Date(time).toISOString(), lastTime - firstTime < 60 * 86400000 ? { day: 'numeric', month: 'short', timeZone: 'UTC' } : { month: 'short', year: width < 500 ? '2-digit' : 'numeric', timeZone: 'UTC' })}</text></g> })}
      {ticks.map(tick => <text key={tick} x={left - 14} y={y(tick) + 4} textAnchor="end">{formatAxis(tick)}</text>)}
      {bars ? data.map((point, index) => <rect key={point.date} x={x(index) - Math.min(14, chartSpan / data.length * .35)} y={Math.min(y(0), y(point.value))} width={Math.min(28, chartSpan / data.length * .7)} height={Math.max(1, Math.abs(y(point.value) - y(0)))} fill={point.value >= 0 ? 'var(--finance-up)' : 'var(--finance-down)'} opacity=".7"/>) : <>
        {area && <path d={`${line} L${right},${bottom} L${left},${bottom} Z`} fill={`url(#finance-${id})`}/>}
        <path d={line} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round"/>
      </>}
      {data.map((point, index) => point.volume !== undefined && <rect key={`v-${point.date}`} x={x(index)} y={bottom - point.volume / maxVolume * 44} width={Math.max(1, chartSpan / data.length * .8)} height={point.volume / maxVolume * 44} fill={point.value >= (data[index - 1]?.value ?? point.value) ? 'var(--finance-up)' : 'var(--finance-down)'} opacity=".4"/>)}
      {data.some(point => point.comparison !== undefined) && <path d={data.map((point, index) => point.comparison === undefined ? '' : `${index && data[index - 1].comparison !== undefined ? 'L' : 'M'}${x(index)},${y(point.comparison)}`).join(' ')} fill="none" stroke="#7986cb" strokeWidth="1.7"/>}
      {(selected || (hover !== null ? [hover] : [])).map(index => <g key={index} className="finance-marker"><line x1={x(index)} x2={x(index)} y1={top - 10} y2={bottom} stroke="#aeb4c0" strokeWidth="2" strokeDasharray="2 6" strokeLinecap="round"/><circle cx={x(index)} cy={y(data[index].value)} r="5" fill="#3268ee"/></g>)}
      {!selected && hover === null && !bars && <circle cx={right} cy={y(data.at(-1)!.value)} r="5" fill={color}/>}
    </svg>
    {tooltipPoint && pointer && !bars && <div className="finance-pointer-tooltip" style={tooltipStyle} role="tooltip"><span>{date(tooltipPoint.date, fullDate)}</span><strong>{formatValue(tooltipPoint.value)}</strong>{tooltipPoint.volume !== undefined && <small>Volume {volume(tooltipPoint.volume)}</small>}</div>}
    {a && b && <div className="finance-readout" role="status">
      <span>{label}: <span className={positive ? 'gain' : 'loss'}>{selected ? formatValue(displayDelta) : formatValue(a.value)} {percent !== null && `(${percentText})`}</span></span>
      {selected && <span>{date(a.date, fullDate)} – {date(b.date, fullDate)}</span>}
      {!selected && <span>{date(a.date, fullDate)}</span>}
      {a.volume !== undefined && b.volume !== undefined && <span>Volume: {volume(a.volume)}{selected ? ` – ${volume(b.volume)}` : ''}</span>}
      {a.comparison !== undefined && b.comparison !== undefined && <span>{comparisonLabel}: {formatValue(selected ? b.comparison - a.comparison : a.comparison)}</span>}
    </div>}
    {data.some(point => point.comparison !== undefined) && <div className="finance-legend"><span>{label}</span><span>{comparisonLabel}</span></div>}
  </div>
}
