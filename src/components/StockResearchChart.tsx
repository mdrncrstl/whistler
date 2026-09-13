import { useMemo, useState } from 'react'
import { FinanceChart } from './FinanceChart'
import { normaliseFinancePoints } from './financeChartUtils'
import { FinancePeriodSelector } from './FinancePeriodSelector'
import { filterFinancePoints, type FinancePeriod } from '../lib/financePeriods'
import type { MarketHistoryPoint } from '../lib/marketDataApi'

type StockPoint = MarketHistoryPoint

export function StockResearchChart({ points, symbol, currency }: { points: StockPoint[]; symbol: string; currency: string }) {
  const [period, setPeriod] = useState<FinancePeriod>('1Y')
  const [style, setStyle] = useState<'Area' | 'Line' | 'Candles'>('Area')
  const data = useMemo(() => {
    const ordered = normaliseFinancePoints(points.map(point => ({ date: point.date, value: point.price, volume: point.volume, open: point.open, high: point.high, low: point.low, close: point.close })))
    return filterFinancePoints(ordered, period)
  }, [points, period])
  const hasCandleData = data.length > 1 && data.every(point => [point.open, point.high, point.low, point.close].every(value => Number.isFinite(value)))
  const activeStyle = style === 'Candles' && !hasCandleData ? 'Line' : style
  const styles: Array<'Area' | 'Line' | 'Candles'> = hasCandleData ? ['Area', 'Line', 'Candles'] : ['Area', 'Line']
  return <div className="ai-stock-chart" aria-label={`${symbol} price history`}>
    <div className="ai-stock-chart-heading"><span>Price history · {currency}</span></div>
    <div className="finance-chart-controls" role="group" aria-label="Stock chart type">{styles.map(value => <button key={value} type="button" aria-pressed={value === activeStyle} onClick={() => setStyle(value)}>{value}</button>)}</div>
    <FinanceChart points={data} resolution="daily" area={activeStyle === 'Area'} candles={activeStyle === 'Candles' && hasCandleData} formatValue={v => Intl.NumberFormat('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v)} formatAxis={v => Intl.NumberFormat('en', { maximumFractionDigits: 2 }).format(v)}/>
    <FinancePeriodSelector value={period} onChange={setPeriod} ariaLabel="Price history period"/>
  </div>
}
