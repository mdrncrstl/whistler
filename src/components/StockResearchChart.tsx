import { Area, AreaChart, CartesianGrid, ReferenceArea, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useMemo } from 'react'
import { ChartRangeReadout } from './ChartRangeSelection'
import { useChartRange } from '../lib/chartRange'
import { date, money } from '../lib/format'

type StockPoint = { date: string; price: number }

function StockChartTooltip({ active, payload, baseline, currency }: {
  active?: boolean
  payload?: Array<{ payload?: StockPoint }>
  baseline: number
  currency: string
}) {
  const point = payload?.[0]?.payload
  if (!active || !point) return null
  const change = baseline ? ((point.price - baseline) / baseline) * 100 : null
  return <div className="stock-chart-tooltip">
    <span>{date(point.date, { day: '2-digit', month: 'short', year: 'numeric' })}</span>
    <strong>{money(point.price, currency, 2)}</strong>
    <small className={change !== null && change < 0 ? 'negative' : 'positive'}>{change === null ? 'Change unavailable' : `${change >= 0 ? '+' : ''}${change.toFixed(2)}% since start`}</small>
  </div>
}

export function StockResearchChart({ points, symbol, currency }: { points: StockPoint[]; symbol: string; currency: string }) {
  const series = useMemo(() => points.map((point) => ({ label: String(point.date), value: Number(point.price) })), [points])
  const chartRange = useChartRange(series)
  const baseline = points[0]?.price || 0
  if (points.length < 2) return <div className="ai-stock-chart-empty">More price history is required to inspect this period.</div>

  return <div className="ai-stock-chart" aria-label={`${symbol} price history`}>
    <div className="ai-stock-chart-heading"><span>Price history · quoted currency</span><ChartRangeReadout summary={chartRange.summary} dragging={chartRange.dragging} onClear={chartRange.clear} formatValue={(value) => money(value, currency, 2)} formatLabel={(label) => date(label, { day: 'numeric', month: 'short', year: 'numeric' })}/></div>
    <div className={`ai-stock-plot ${chartRange.dragging ? 'is-selecting' : ''}`}>
      <ResponsiveContainer width="100%" height={190}>
        <AreaChart data={points} margin={{ top: 18, right: 12, bottom: 8, left: 2 }} {...chartRange.chartProps}>
          <defs><linearGradient id={`stock-fill-${symbol.replace(/[^a-z0-9]/gi, '-')}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="var(--green)" stopOpacity={.16}/><stop offset="1" stopColor="var(--green)" stopOpacity={0}/></linearGradient></defs>
          <CartesianGrid vertical={false} stroke="var(--line)" strokeOpacity={.7}/>
          <XAxis dataKey="date" tickFormatter={(value) => date(String(value), { month: 'short' })} minTickGap={48} axisLine={false} tickLine={false} tickMargin={10}/>
          <YAxis orientation="right" width={58} domain={['auto', 'auto']} tickFormatter={(value) => money(Number(value), currency, 0)} axisLine={false} tickLine={false}/>
          <Tooltip cursor={false} isAnimationActive={false} content={<StockChartTooltip baseline={baseline} currency={currency}/>}/>
          {chartRange.active && <ReferenceArea x1={chartRange.active.from} x2={chartRange.active.to} strokeOpacity={0} fill="var(--green)" fillOpacity={.11}/>} 
          <Area type="monotone" dataKey="price" stroke="var(--green)" strokeWidth={2} fill={`url(#stock-fill-${symbol.replace(/[^a-z0-9]/gi, '-')})`} dot={false} activeDot={{ r: 4, fill: 'var(--green)', stroke: 'var(--surface)', strokeWidth: 2 }} isAnimationActive={false}/>
        </AreaChart>
      </ResponsiveContainer>
    </div>
  </div>
}
