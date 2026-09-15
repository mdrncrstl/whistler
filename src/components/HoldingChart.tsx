import { useMemo, useState } from 'react'
import { filterPerformancePoints, type AdvancedPerformancePoint, type PerformancePeriod } from './AdvancedPerformanceChart'
import { money } from '../lib/format'
import { FinanceChart } from './FinanceChart'
import { FinanceProToggle, FinanceProToolbar } from './FinanceProToolbar'
import type { FinanceChartStyle, FinanceIndicatorId } from './financeChartUtils'
import { FinancePeriodSelector } from './FinancePeriodSelector'
import { FINANCE_PERIODS, type FinancePeriod } from '../lib/financePeriods'
import { marketHistoryResolution } from '../lib/marketDataApi'
import { MotionExpand, SlidingTabs } from './ui'

export function HoldingChart({ points, symbol, currency = 'AUD', price = false, loading = false, mode = 'Amount', onModeChange, period, onPeriodChange, proGraphMode: defaultProGraphMode = false }: {
  points: AdvancedPerformancePoint[]; symbol: string; currency?: string; price?: boolean; loading?: boolean;
  mode?: 'Amount' | 'Percent'; onModeChange?: (value: 'Amount' | 'Percent') => void;
  period: PerformancePeriod; onPeriodChange: (value: PerformancePeriod) => void;
  proGraphMode?: boolean
}) {
  const [style, setStyle] = useState<'Line' | 'Bar' | 'Candles'>('Line')
  const [proGraphMode, setProGraphMode] = useState(defaultProGraphMode)
  const [proStyle, setProStyle] = useState<FinanceChartStyle>('area')
  const [comparison, setComparison] = useState('none')
  const [indicators, setIndicators] = useState<FinanceIndicatorId[]>([])
  const data = useMemo(() => {
    const filtered = filterPerformancePoints(points, period)
    const base = filtered[0]?.holdingAmount || 0
    return filtered.map(point => ({ date: point.date, measurementValue: price ? point.price : point.holdingAmount, value: price ? point.price : mode === 'Percent' ? (base ? (point.holdingAmount / base - 1) * 100 : 0) : point.holdingAmount, comparison: !price && comparison === 'benchmark' ? point.benchmarkAmount : undefined, open: point.open, high: point.high, low: point.low, close: point.close, volume: point.volume }))
  }, [comparison, points, period, price, mode])
  const hasIntradayData = useMemo(() => data.some((point, index) => index > 0 && Date.parse(point.date) - Date.parse(data[index - 1].date) < 20 * 60 * 60 * 1000), [data])
  const hasCandleData = price && data.length > 1 && data.every(point => [point.open, point.high, point.low, point.close].every(value => Number.isFinite(value)))
  const activeStyle = style === 'Candles' && !hasCandleData ? 'Line' : style
  const selectedPeriod: FinancePeriod = FINANCE_PERIODS.includes(period.preset as FinancePeriod) ? period.preset as FinancePeriod : 'MAX'
  const needsAdaptiveHistory = ['1D', '5D', '1W', '1M'].includes(selectedPeriod)
  const resolutionLabel = marketHistoryResolution(selectedPeriod).label
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
    <div className="finance-chart-heading">{price ? <h2>Price</h2> : <p>Performance history</p>}{needsAdaptiveHistory && <small className="finance-resolution-note" role="status">{hasIntradayData ? resolutionLabel : loading ? `Loading ${resolutionLabel.toLowerCase()}…` : 'Intraday data unavailable · showing daily history'}</small>}<FinanceProToggle enabled={proGraphMode} onChange={setProGraphMode}/></div>
    <MotionExpand open={proGraphMode} className="finance-pro-reveal">
      <FinanceProToolbar chartStyle={proStyle} onChartStyleChange={setProStyle} comparison={comparison} onComparisonChange={setComparison} comparisonOptions={price ? [] : [{ id: 'benchmark', label: 'Portfolio benchmark', detail: 'Recorded portfolio history' }]} indicators={indicators} onIndicatorsChange={setIndicators} candleAvailable={hasCandleData} barAvailable/>
    </MotionExpand>
    <MotionExpand open={!proGraphMode} className="finance-compact-reveal">
      <div className="chart-mode-row">
        {price ? <SlidingTabs className="chart-mode-tabs" options={[{ value: 'Line', label: 'Line', ariaLabel: 'Price line chart' }, ...(hasCandleData ? [{ value: 'Candles', label: 'Candles', ariaLabel: 'Price candlestick chart' }] : [])]} value={activeStyle === 'Candles' ? 'Candles' : 'Line'} onChange={(value) => setStyle(value as 'Line' | 'Candles')} ariaLabel="Price chart style" /> : <><SlidingTabs className="chart-mode-tabs" options={[{ value: 'Amount', label: 'Amount' }, { value: 'Percent', label: 'Percent' }]} value={mode} onChange={(value) => onModeChange?.(value as 'Amount' | 'Percent')} ariaLabel="Value mode" /><SlidingTabs className="chart-mode-tabs" options={[{ value: 'Line', label: 'Line' }, { value: 'Bar', label: 'Bar' }]} value={activeStyle === 'Bar' ? 'Bar' : 'Line'} onChange={(value) => setStyle(value as 'Line' | 'Bar')} ariaLabel="Chart style" /></>}
      </div>
    </MotionExpand>
    {loading && data.length < 2 ? <p role="status">Loading price history…</p> : <FinanceChart points={data.map(p => ({ ...p, value: Number(p.value) }))} label={price ? 'Price' : 'Portfolio'} comparisonLabel="Portfolio benchmark" resolution={hasIntradayData ? 'intraday' : price ? 'daily' : 'recorded'} formatValue={format} formatAxis={axisTick} chartStyle={proGraphMode ? proStyle : activeStyle === 'Candles' ? 'candle' : activeStyle === 'Bar' ? 'bar' : 'line'} indicators={proGraphMode ? indicators : []}/>}
      <FinancePeriodSelector value={selectedPeriod} onChange={(value) => onPeriodChange({ preset: value })} ariaLabel={`${symbol} chart period`}/>
  </section>
}
