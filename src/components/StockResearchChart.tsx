import { useMemo, useState } from 'react'
import { FinanceChart } from './FinanceChart'
import { normaliseFinancePoints } from './financeChartUtils'

type StockPoint = { date: string; price: number; volume?: number }

export function StockResearchChart({ points, symbol, currency }: { points: StockPoint[]; symbol: string; currency: string }) {
  const [period, setPeriod] = useState('1Y')
  const [style, setStyle] = useState('Area')
  const data = useMemo(() => {
    const ordered = normaliseFinancePoints(points.map(point => ({ date: point.date, value: point.price, volume: point.volume })))
    const end = Date.parse(ordered.at(-1)?.date || '')
    const days = period === '1M' ? 31 : period === '5D' ? 5 : period === '6M' ? 183 : Infinity
    const start = period === 'YTD' ? Date.UTC(new Date(end).getUTCFullYear(), 0, 1) : end - days * 86400000
    return ordered.filter(point => Date.parse(point.date) >= start)
  }, [points, period])
  return <div className="ai-stock-chart" aria-label={`${symbol} price history`}>
    <div className="ai-stock-chart-heading"><span>Price history · {currency}</span></div>
    <div className="finance-chart-controls" role="group" aria-label="Stock chart type">{['Area', 'Line'].map(value => <button key={value} type="button" aria-pressed={value === style} onClick={() => setStyle(value)}>{value}</button>)}</div>
    <FinanceChart points={data} resolution="daily" area={style === 'Area'} formatValue={v => Intl.NumberFormat('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v)} formatAxis={v => Intl.NumberFormat('en', { maximumFractionDigits: 2 }).format(v)}/>
    <div className="finance-periods" aria-label="Price history period">{['5D', '1M', '6M', 'YTD', '1Y'].map(p => <button key={p} type="button" aria-pressed={p === period} onClick={() => setPeriod(p)}>{p}</button>)}</div>
  </div>
}
