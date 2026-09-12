import { useId, useMemo, useState } from 'react'
import { Area, Bar, CartesianGrid, ComposedChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { filterPerformancePoints, type AdvancedPerformancePoint, type PerformancePeriod } from './AdvancedPerformanceChart'
import { date, money } from '../lib/format'
import { ChartRangeReadout } from './ChartRangeSelection'
import { useChartRange } from '../lib/chartRange'

export function HoldingChart({ points, symbol, currency = 'AUD', price = false, loading = false, mode = 'Amount', onModeChange, period, onPeriodChange }: {
  points: AdvancedPerformancePoint[]; symbol: string; currency?: string; price?: boolean; loading?: boolean;
  mode?: 'Amount' | 'Percent'; onModeChange?: (value: 'Amount' | 'Percent') => void;
  period: PerformancePeriod; onPeriodChange: (value: PerformancePeriod) => void;
}) {
  const id = useId().replaceAll(':', '')
  const [style, setStyle] = useState<'Line' | 'Bar'>('Line')
  const data = useMemo(() => {
    const filtered = filterPerformancePoints(points, period)
    const base = filtered[0]?.holdingAmount || 0
    return filtered.map(point => ({ date: point.date, value: price ? point.price : mode === 'Percent' ? (base ? (point.holdingAmount / base - 1) * 100 : 0) : point.holdingAmount }))
  }, [points, period, price, mode])
  const chartRange = useChartRange(useMemo(() => data.map(point => ({ label: String(point.date), value: Number(point.value) })), [data]))
  const format = (value: number) => !price && mode === 'Percent' ? `${value.toFixed(2)}%` : money(value, currency, 2)
  /**
   * Pick the tick format from the visible span, not from each value. Compact notation
   * with no decimals collapses a 27,880-27,892 range into five ticks that all read
   * "28K"; the axis has to carry enough precision to separate its own gridlines.
   */
  const axisTick = useMemo(() => {
    const values: number[] = data.map(point => Number(point.value)).filter(value => Number.isFinite(value))
    const span = values.length ? Math.max(...values) - Math.min(...values) : 0
    if (!price && mode === 'Percent') return (value: number) => `${Number(value).toFixed(span < 5 ? 1 : 0)}%`
    const digits = price ? 2 : span < 10 ? 2 : span < 100 ? 1 : 0
    const compact = !price && span >= 5000
    return (value: number) => Intl.NumberFormat('en-AU', {
      maximumFractionDigits: compact ? 1 : digits,
      minimumFractionDigits: compact ? 0 : digits,
      notation: compact ? 'compact' : 'standard',
    }).format(Number(value))
  }, [data, mode, price])
  return <section className={`holding-simple-chart ${price ? 'is-price' : ''}`} aria-label={`${symbol} ${price ? 'price' : 'performance'} chart`}>
    {price && <h2>Price</h2>}
    <div className="chart-mode-row">
      {!price && <><div>{(['Amount', 'Percent'] as const).map(value => <button key={value} aria-pressed={mode === value} className={mode === value ? 'active' : ''} onClick={() => onModeChange?.(value)}>{value}</button>)}</div><div>{(['Line', 'Bar'] as const).map(value => <button key={value} aria-pressed={style === value} className={style === value ? 'active' : ''} onClick={() => setStyle(value)}>{value}</button>)}</div></>}
      <div className="holding-periods">{(['5D', '1M', '6M', 'YTD', '1Y', '3Y', '5Y', 'MAX'] as const).map(value => <button key={value} aria-pressed={period.preset === value} className={period.preset === value ? 'active' : ''} onClick={() => onPeriodChange({ preset: value })}>{value === 'MAX' ? 'All' : value}</button>)}</div>
      
    </div>
    {data.length > 1 ? <div className="holding-chart-surface"><ResponsiveContainer width="100%" height="100%"><ComposedChart data={data} margin={{ top: 18, right: 8, bottom: 8, left: 4 }} {...chartRange.chartProps}>
      <defs><linearGradient id={id} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="var(--chart-1)" stopOpacity={.15}/><stop offset="1" stopColor="var(--chart-1)" stopOpacity={0}/></linearGradient></defs>
      <CartesianGrid vertical={false} stroke="var(--line)" strokeOpacity={.6}/>
      <XAxis dataKey="date" axisLine={false} tickLine={false} minTickGap={50} tickMargin={12} tickFormatter={value => date(value, { month: 'short', year: period.preset === 'MAX' || period.preset === '5Y' ? '2-digit' : undefined })}/>
      <YAxis orientation="right" axisLine={false} tickLine={false} width={76} domain={['auto', 'auto']} tickFormatter={axisTick}/>
      <Tooltip active={chartRange.active ? false : undefined} separator=": " isAnimationActive={false} cursor={chartRange.active ? false : { stroke: 'var(--muted-2)', strokeDasharray: '3 3' }} labelFormatter={label => date(String(label), { day: '2-digit', month: 'short', year: 'numeric' })} formatter={value => [format(Number(value)), symbol]}/>
      
      {style === 'Bar' && !price ? <Bar dataKey="value" fill="var(--chart-1)" isAnimationActive={false}/> : <Area type="linear" dataKey="value" stroke="var(--chart-1)" strokeWidth={1.6} fill={`url(#${id})`} dot={false} activeDot={chartRange.active ? false : { r: 3 }} isAnimationActive={false}/>}
    <ChartRangeReadout summary={chartRange.summary} dragging={chartRange.dragging} onClear={chartRange.clear} formatValue={(value) => !price && mode === 'Percent' ? `${value.toFixed(2)} pts` : money(value, currency, 2)} formatLabel={(label) => date(label, { day: 'numeric', month: 'short', year: 'numeric' })}/></ComposedChart></ResponsiveContainer></div> : <p className="holding-history-empty" role={loading ? 'status' : undefined}>{loading ? 'Loading price history…' : 'Not enough recorded history for this period.'}</p>}
  </section>
}
