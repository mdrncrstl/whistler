import { useMemo, useState } from 'react'
import { filterPerformancePoints, type AdvancedPerformancePoint, type PerformancePeriod } from './AdvancedPerformanceChart'
import { money } from '../lib/format'
import { FinanceChart } from './FinanceChart'

export function HoldingChart({ points, symbol, currency = 'AUD', price = false, loading = false, mode = 'Amount', onModeChange, period, onPeriodChange }: {
  points: AdvancedPerformancePoint[]; symbol: string; currency?: string; price?: boolean; loading?: boolean;
  mode?: 'Amount' | 'Percent'; onModeChange?: (value: 'Amount' | 'Percent') => void;
  period: PerformancePeriod; onPeriodChange: (value: PerformancePeriod) => void;
}) {
  const [style, setStyle] = useState<'Line' | 'Bar' | 'Candles'>('Line')
  const data = useMemo(() => {
    const filtered = filterPerformancePoints(points, period)
    const base = filtered[0]?.holdingAmount || 0
    return filtered.map(point => ({ date: point.date, measurementValue: price ? point.price : point.holdingAmount, value: price ? point.price : mode === 'Percent' ? (base ? (point.holdingAmount / base - 1) * 100 : 0) : point.holdingAmount, open: point.open, high: point.high, low: point.low, close: point.close, volume: point.volume }))
  }, [points, period, price, mode])
  const hasCandleData = price && data.length > 1 && data.every(point => [point.open, point.high, point.low, point.close].every(value => Number.isFinite(value)))
  const activeStyle = style === 'Candles' && !hasCandleData ? 'Line' : style
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
      {price ? <div role="group" aria-label="Price chart style"><button type="button" aria-label="Price line chart" aria-pressed={activeStyle === 'Line'} className={activeStyle === 'Line' ? 'active' : ''} onClick={() => setStyle('Line')}>Line</button>{hasCandleData && <button type="button" aria-label="Price candlestick chart" aria-pressed={activeStyle === 'Candles'} className={activeStyle === 'Candles' ? 'active' : ''} onClick={() => setStyle('Candles')}>Candles</button>}</div> : <><div>{(['Amount', 'Percent'] as const).map(value => <button type="button" key={value} aria-pressed={mode === value} className={mode === value ? 'active' : ''} onClick={() => onModeChange?.(value)}>{value}</button>)}</div><div>{(['Line', 'Bar'] as const).map(value => <button type="button" key={value} aria-pressed={activeStyle === value} className={activeStyle === value ? 'active' : ''} onClick={() => setStyle(value)}>{value}</button>)}</div></>}
    </div>
    {loading && data.length < 2 ? <p role="status">Loading price history…</p> : <FinanceChart points={data.map(p => ({ ...p, value: Number(p.value) }))} label={price ? 'Price' : 'Portfolio'} resolution={price ? 'daily' : 'recorded'} formatValue={format} formatAxis={axisTick} bars={activeStyle === 'Bar' && !price} candles={activeStyle === 'Candles' && hasCandleData}/>}
      <div className="finance-periods">{(['5D', '1M', '6M', 'YTD', '1Y', '3Y', '5Y', 'MAX'] as const).map(value => <button key={value} aria-pressed={period.preset === value} className={period.preset === value ? 'active' : ''} onClick={() => onPeriodChange({ preset: value })}>{value === 'MAX' ? 'All' : value}</button>)}</div>
  </section>
}
