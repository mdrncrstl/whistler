import { useEffect, useMemo, useState } from 'react'
import { FinanceChart } from './FinanceChart'
import { FinanceProToggle, FinanceProToolbar, type FinanceComparisonOption } from './FinanceProToolbar'
import { normaliseFinancePoints } from './financeChartUtils'
import type { FinanceChartStyle, FinanceIndicatorId } from './financeChartUtils'
import { FinancePeriodSelector } from './FinancePeriodSelector'
import { filterFinancePoints, type FinancePeriod } from '../lib/financePeriods'
import { fetchMarketHistory, type MarketHistoryPoint } from '../lib/marketDataApi'
import { MotionExpand } from './ui'

type StockPoint = MarketHistoryPoint

export function StockResearchChart({ points, symbol, currency, market = '', comparisonOptions = [], proGraphMode: defaultProGraphMode = false }: { points: StockPoint[]; symbol: string; currency: string; market?: string; comparisonOptions?: FinanceComparisonOption[]; proGraphMode?: boolean }) {
  const [period, setPeriod] = useState<FinancePeriod>('1Y')
  const [style, setStyle] = useState<'Area' | 'Line' | 'Candles'>('Area')
  const [proGraphMode, setProGraphMode] = useState(defaultProGraphMode)
  const [proStyle, setProStyle] = useState<FinanceChartStyle>('area')
  const [comparison, setComparison] = useState('none')
  const [indicators, setIndicators] = useState<FinanceIndicatorId[]>([])
  const [comparisonPoints, setComparisonPoints] = useState<MarketHistoryPoint[]>([])
  const data = useMemo(() => {
    const ordered = normaliseFinancePoints(points.map(point => ({ date: point.date, value: point.price, volume: point.volume, open: point.open, high: point.high, low: point.low, close: point.close })))
    return filterFinancePoints(ordered, period)
  }, [points, period])
  const availableComparisons = useMemo(() => comparisonOptions.filter(item => item.id.toUpperCase() !== symbol.toUpperCase()), [comparisonOptions, symbol])
  const selectedComparison = availableComparisons.find(item => item.id === comparison)
  useEffect(() => {
    if (!proGraphMode || comparison === 'none') return
    const controller = new AbortController()
    void fetchMarketHistory(comparison, selectedComparison?.market || market, controller.signal)
      .then(result => setComparisonPoints(result.points))
      .catch(error => { if ((error as { name?: string })?.name !== 'AbortError') setComparisonPoints([]) })
    return () => controller.abort()
  }, [comparison, market, proGraphMode, selectedComparison?.market])
  const comparisonByDate = useMemo(() => new Map(normaliseFinancePoints(comparisonPoints.map(point => ({ date: point.date, value: point.price }))).map(point => [point.date.slice(0, 10), point.value])), [comparisonPoints])
  const plottedData = useMemo(() => data.map(point => ({ ...point, comparison: proGraphMode && comparison !== 'none' ? comparisonByDate.get(point.date.slice(0, 10)) : undefined })), [comparison, comparisonByDate, data, proGraphMode])
  const hasCandleData = data.length > 1 && data.every(point => [point.open, point.high, point.low, point.close].every(value => Number.isFinite(value)))
  const activeStyle = style === 'Candles' && !hasCandleData ? 'Line' : style
  const styles: Array<'Area' | 'Line' | 'Candles'> = hasCandleData ? ['Area', 'Line', 'Candles'] : ['Area', 'Line']
  return <div className="ai-stock-chart" aria-label={`${symbol} price history`}>
    <div className="ai-stock-chart-heading"><span>Price history · {currency}</span><FinanceProToggle enabled={proGraphMode} onChange={setProGraphMode}/></div>
    <MotionExpand open={proGraphMode} className="finance-pro-reveal">
      <FinanceProToolbar chartStyle={proStyle} onChartStyleChange={setProStyle} comparison={comparison} onComparisonChange={value => { setComparison(value); setComparisonPoints([]) }} comparisonOptions={availableComparisons} indicators={indicators} onIndicatorsChange={setIndicators} candleAvailable={hasCandleData} barAvailable allowSymbolSearch/>
    </MotionExpand>
    <MotionExpand open={!proGraphMode} className="finance-compact-reveal">
      <div className="finance-chart-controls" role="group" aria-label="Stock chart type">{styles.map(value => <button key={value} type="button" aria-pressed={value === activeStyle} onClick={() => setStyle(value)}>{value}</button>)}</div>
    </MotionExpand>
    <FinanceChart points={plottedData} comparisonLabel={selectedComparison?.label || comparison} resolution="daily" chartStyle={proGraphMode ? proStyle : activeStyle === 'Candles' ? 'candle' : activeStyle === 'Area' ? 'area' : 'line'} formatValue={v => Intl.NumberFormat('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v)} formatAxis={v => Intl.NumberFormat('en', { maximumFractionDigits: 2 }).format(v)} indicators={proGraphMode ? indicators : []}/>
    <FinancePeriodSelector value={period} onChange={setPeriod} ariaLabel="Price history period"/>
  </div>
}
