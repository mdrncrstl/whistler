import { useId, useLayoutEffect, useMemo, useRef, useState, type PointerEvent } from 'react'
import { date } from '../lib/format'
import './finance-chart.css'

export type FinancePoint = { date: string; value: number; measurementValue?: number; volume?: number; comparison?: number }

/** Shared price/portfolio interaction: inspect a point, or press and drag to compare. */
export function FinanceChart({ points, label = 'Price', formatValue, formatAxis = formatValue, bars = false, comparisonLabel = 'Benchmark', area = true }: {
  points: FinancePoint[]; label?: string; formatValue: (value: number) => string;
  formatAxis?: (value: number) => string; bars?: boolean; comparisonLabel?: string; area?: boolean;
}) {
  const host = useRef<HTMLDivElement>(null)
  const id = useId().replaceAll(':', '')
  const [width, setWidth] = useState(800)
  const [hover, setHover] = useState<number | null>(null)
  const [selection, setSelection] = useState<[number, number] | null>(null)
  const anchor = useRef<number | null>(null)
  const data = useMemo(() => points.filter(p => Number.isFinite(p.value) && Number.isFinite(Date.parse(p.date))), [points])
  const [previous, setPrevious] = useState(data)
  if (previous !== data) { setPrevious(data); setHover(null); setSelection(null) }
  useLayoutEffect(() => { anchor.current = null }, [data])
  useLayoutEffect(() => {
    if (!host.current) return
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width))
    observer.observe(host.current)
    return () => observer.disconnect()
  }, [data.length])
  if (data.length < 2) return <p className="finance-empty">Not enough recorded history for this period.</p>
  const height = width < 500 ? 280 : 310
  const axisLabelLength = Math.max(...data.flatMap(p => [formatAxis(p.value).length, p.comparison === undefined ? 0 : formatAxis(p.comparison).length]))
  const left = Math.max(width < 500 ? 58 : 70, Math.min(width * .35, axisLabelLength * (width < 500 ? 5.5 : 7) + 18))
  const right = width - 24, top = 48, bottom = height - 38
  const values = data.flatMap(p => [p.value, ...(p.comparison !== undefined && Number.isFinite(p.comparison) ? [p.comparison] : [])])
  const low = Math.min(...values, ...(bars ? [0] : [])), high = Math.max(...values, ...(bars ? [0] : []))
  const span = high - low || Math.abs(high) * .1 || 1
  const step = 10 ** Math.floor(Math.log10(span / 4)) * ([1, 2, 5, 10].find(n => n * 10 ** Math.floor(Math.log10(span / 4)) >= span / 4) || 10)
  const min = Math.floor((low - span * .08) / step) * step
  const max = Math.ceil((high + span * .08) / step) * step
  const firstTime = Date.parse(data[0]?.date || ''), lastTime = Date.parse(data.at(-1)?.date || '')
  const x = (i: number) => left + (Date.parse(data[i].date) - firstTime) / (lastTime - firstTime || 1) * (right - left)
  const y = (v: number) => bottom - (v - min) / (max - min || 1) * (bottom - top)
  const nearest = (clientX: number) => {
    const px = clientX - (host.current?.getBoundingClientRect().left || 0)
    let best = 0
    for (let i = 1; i < data.length; i++) if (Math.abs(x(i) - px) < Math.abs(x(best) - px)) best = i
    return best
  }
  const move = (event: PointerEvent<SVGSVGElement>) => {
    const index = nearest(event.clientX)
    if (anchor.current !== null) setSelection([anchor.current, index])
    else if (!selection) setHover(index)
  }
  const selected = selection && selection[0] !== selection[1] ? [...selection].sort((a, b) => a - b) : null
  const a = selected ? data[selected[0]] : hover !== null ? data[hover] : null
  const b = selected ? data[selected[1]] : a
  const base = selected ? a?.measurementValue ?? a?.value : hover !== null ? data[Math.max(0, hover - 1)]?.measurementValue ?? data[Math.max(0, hover - 1)]?.value : undefined
  const end = b?.measurementValue ?? b?.value
  const delta = selected && a && b ? b.value - a.value : 0
  const percent = base && end !== undefined ? (end - base) / Math.abs(base) * 100 : null
  const percentText = percent === null ? '—' : `${percent.toFixed(2)}%`
  const positive = (selected ? delta : percent || 0) >= 0
  const color = data.at(-1) && data[0] && data.at(-1)!.value < data[0].value ? 'var(--finance-down)' : 'var(--finance-up)'
  const line = data.map((p, i) => `${i ? 'L' : 'M'}${x(i)},${y(p.value)}`).join(' ')
  const ticks = Array.from({ length: Math.round((max - min) / step) + 1 }, (_, i) => min + step * i)
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
    for (let i = 0; i < tickCount; i++) xTicks.push(Date.parse(data[Math.round(i * (data.length - 1) / (tickCount - 1))].date))
  }
  const maxVolume = Math.max(1, ...data.map(p => p.volume || 0))
  const volume = (v: number) => Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(v)
  return <div className="finance-plot" ref={host} data-range={Boolean(selected)}>
    <svg width="100%" height={height} role="img" aria-label={`${label} history. Drag between dates to compare. Use arrow keys to inspect, Shift and arrows to compare, Escape to clear.`}
      tabIndex={0} onPointerMove={move}
      onPointerDown={event => {
        if (event.button !== 0) return
        event.currentTarget.blur()
        const index = nearest(event.clientX)
        anchor.current = index; setSelection(null); setHover(index)
        event.currentTarget.setPointerCapture(event.pointerId)
      }}
      onPointerUp={event => {
        if (anchor.current !== null) { const index = nearest(event.clientX); setSelection(index === anchor.current ? null : [anchor.current, index]); setHover(index) }
        anchor.current = null
        if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
      }}
      onPointerCancel={() => { anchor.current = null; setSelection(null); setHover(null) }}
      onPointerLeave={() => { if (anchor.current === null) setHover(null) }}
      onKeyDown={event => {
        if (event.key === 'Escape') { setSelection(null); setHover(null); anchor.current = null }
        if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
          event.preventDefault()
          const current = hover ?? 0, next = Math.max(0, Math.min(data.length - 1, current + (event.key === 'ArrowRight' ? 1 : -1)))
          setHover(next); setSelection(event.shiftKey ? [selection?.[0] ?? current, next] : null)
        }
      }}>
      <defs><linearGradient id={`finance-${id}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={color} stopOpacity=".34"/><stop offset="1" stopColor={color} stopOpacity="0"/></linearGradient></defs>
      {[...new Set(xTicks)].map(time => { const px = left + (time - firstTime) / (lastTime - firstTime) * (right - left); return <g key={time}><line x1={px} x2={px} y1={top - 12} y2={bottom} className="finance-grid"/><text x={px} y={height - 14} textAnchor={px < left + 24 ? 'start' : px > right - 24 ? 'end' : 'middle'}>{date(new Date(time).toISOString(), lastTime - firstTime < 60 * 86400000 ? { day:'numeric', month:'short', timeZone:'UTC' } : { month: 'short', year: width < 500 ? '2-digit' : 'numeric', timeZone:'UTC' })}</text></g> })}
      {ticks.map(t => <text key={t} x={left - 14} y={y(t) + 4} textAnchor="end">{formatAxis(t)}</text>)}
      {bars ? data.map((p, i) => <rect key={p.date} x={x(i) - Math.min(14, (right - left) / data.length * .35)} y={Math.min(y(0), y(p.value))} width={Math.min(28, (right - left) / data.length * .7)} height={Math.max(1, Math.abs(y(p.value) - y(0)))} fill={p.value >= 0 ? 'var(--finance-up)' : 'var(--finance-down)'} opacity=".7"/>) : <>
        {area && <path d={`${line} L${right},${bottom} L${left},${bottom} Z`} fill={`url(#finance-${id})`}/>}
        <path d={line} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"/>
      </>}
      {data.map((p, i) => p.volume !== undefined && <rect key={`v-${p.date}`} x={x(i)} y={bottom - p.volume / maxVolume * 44} width={Math.max(1, (right - left) / data.length * .8)} height={p.volume / maxVolume * 44} fill={p.value >= (data[i - 1]?.value ?? p.value) ? 'var(--finance-up)' : 'var(--finance-down)'} opacity=".4"/>)}
      {data.some(p => p.comparison !== undefined) && <path d={data.map((p,i) => p.comparison === undefined ? '' : `${i && data[i-1].comparison !== undefined ? 'L' : 'M'}${x(i)},${y(p.comparison)}`).join(' ')} fill="none" stroke="#7986cb" strokeWidth="1.7"/>}
      {(selected || (hover !== null ? [hover] : [])).map(i => <g key={i} className="finance-marker"><line x1={x(i)} x2={x(i)} y1={top - 10} y2={bottom} stroke="#aeb4c0" strokeWidth="2" strokeDasharray="2 6" strokeLinecap="round"/><circle cx={x(i)} cy={y(data[i].value)} r="5" fill="#3268ee"/></g>)}
      {!selected && hover === null && !bars && <circle cx={right} cy={y(data.at(-1)!.value)} r="5" fill={color}/>}
    </svg>
    {a && b && <div className="finance-readout" role="status">
      <span>{label}: <span className={positive ? 'gain' : 'loss'}>{selected ? formatValue(delta) : formatValue(a.value)} {percent !== null && `(${percentText})`}</span></span>
      {selected && <span>{date(a.date, { day: 'numeric', month: 'short', year: 'numeric', timeZone:'UTC' })} - {date(b.date, { day: 'numeric', month: 'short', year: 'numeric', timeZone:'UTC' })}</span>}
      {!selected && <span>{date(a.date, { day: 'numeric', month: 'short', year: 'numeric', timeZone:'UTC' })}</span>}
      {a.volume !== undefined && b.volume !== undefined && <span>Volume: {volume(a.volume)}{selected ? ` - ${volume(b.volume)}` : ''}</span>}
      {a.comparison !== undefined && b.comparison !== undefined && <span>{comparisonLabel}: {formatValue(selected ? b.comparison - a.comparison : a.comparison)}</span>}
    </div>}
    {data.some(p => p.comparison !== undefined) && <div className="finance-legend"><span>{label}</span><span>{comparisonLabel}</span></div>}
  </div>
}
