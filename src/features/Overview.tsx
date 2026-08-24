import { CalendarDays, ChevronDown, Columns3, Download, EyeOff, Filter, RefreshCw, Search, TrendingUp } from 'lucide-react'
import { Fragment, useMemo, useState } from 'react'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { usePortfolio } from '../context/PortfolioContext'
import { summarisePortfolio } from '../lib/portfolio'
import { date, downloadCsv, money } from '../lib/format'
import { EmptyState, PrivateMoney } from '../components/ui'
import type { Position } from '../types'

const periods: Record<string, number> = { '1M': 31, '3M': 93, '6M': 186, YTD: 366, '1Y': 366, '3Y': 1096, ALL: Infinity }
const displayPercent = (value: number) => `${Number(value || 0).toFixed(2)}%`

function HoldingRow({ item }: { item: Position }) {
  return (
    <tr>
      <td className="portfolio-symbol"><span className="holding-avatar">{item.symbol.slice(0, 1)}</span><strong>{item.symbol}</strong></td>
      <td className="numeric"><span className="holding-price">{money(item.current_price, item.currency, item.currency === 'AUD' ? 3 : 2)}</span></td>
      <td className="numeric">{item.quantity.toLocaleString('en-AU', { maximumFractionDigits: 4 })}</td>
      <td className="numeric private-value">{money(item.value_aud, 'AUD', 2)}</td>
      <td className={`numeric private-value ${item.unrealised_gain_aud >= 0 ? 'positive' : 'negative'}`}>{money(item.unrealised_gain_aud, 'AUD', 2)}</td>
      <td className={`numeric ${item.return_pct >= 0 ? 'positive' : 'negative'}`}>{displayPercent(item.return_pct)}</td>
      <td className={`numeric private-value ${item.unrealised_gain_aud >= 0 ? 'positive' : 'negative'}`}>{money(item.unrealised_gain_aud, 'AUD', 2)}</td>
      <td className={`numeric ${item.return_pct >= 0 ? 'positive' : 'negative'}`}>{displayPercent(item.return_pct)}</td>
      <td className="row-menu">•••</td>
    </tr>
  )
}

export function Overview() {
  const { bundle, action, refreshQuotes } = usePortfolio()
  const [period, setPeriod] = useState('ALL')
  const [query, setQuery] = useState('')
  const summary = useMemo(() => summarisePortfolio(bundle), [bundle])
  const chartData = useMemo(() => {
    const latest = bundle.snapshots.at(-1)?.date ? new Date(bundle.snapshots.at(-1)!.date).getTime() : 0
    const days = periods[period]
    return bundle.snapshots.filter((item) => days === Infinity || new Date(item.date).getTime() >= latest - days * 86_400_000)
  }, [bundle.snapshots, period])
  const filtered = useMemo(() => bundle.holdings.filter((item) => `${item.symbol} ${item.name} ${item.market} ${item.account_name}`.toLowerCase().includes(query.toLowerCase())), [bundle.holdings, query])
  const groups = useMemo(() => {
    const output = new Map<string, Position[]>()
    filtered.forEach((item) => {
      const key = item.market || item.currency || 'Other'
      output.set(key, [...(output.get(key) || []), item])
    })
    return [...output.entries()]
  }, [filtered])
  const totalReturn = summary.unrealised + summary.income
  const totalReturnPct = summary.cost ? (totalReturn / summary.cost) * 100 : 0

  const exportHoldings = () => downloadCsv('masterdeck-holdings.csv', ['Symbol', 'Market', 'Price', 'Quantity', 'Value AUD', 'Capital gain AUD', 'Capital gain %'], filtered.map((item) => [item.symbol, item.market, item.current_price, item.quantity, item.value_aud, item.unrealised_gain_aud, item.return_pct]))

  return (
    <div className="portfolio-page">
      <div className="portfolio-toolbar">
        <label className="portfolio-filter"><Search size={15} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Filter holdings…" aria-label="Filter holdings" /></label>
        <button><CalendarDays size={15} />All time<ChevronDown size={13} /></button>
        <button><Filter size={15} />Filter</button>
        <button>All Positions<ChevronDown size={13} /></button>
        <button className="refresh-market" onClick={() => refreshQuotes()} disabled={action === 'refresh-quotes'}><RefreshCw className={action === 'refresh-quotes' ? 'spin' : ''} size={15} />Refresh</button>
      </div>

      <div className="portfolio-metrics">
        <div><span>Portfolio Value</span><strong><PrivateMoney value={summary.total} digits={2} /></strong><small className={totalReturnPct >= 0 ? 'positive' : 'negative'}>{displayPercent(totalReturnPct)} <em>p.a.</em></small></div>
        <div><span>Capital Gain</span><strong><PrivateMoney value={summary.unrealised} digits={2} /></strong><small className={summary.returnPct >= 0 ? 'positive' : 'negative'}>{displayPercent(summary.returnPct)} <em>p.a.</em></small></div>
        <div><span>Income Return</span><strong><PrivateMoney value={summary.income} digits={2} /></strong><small className="positive">{summary.cost ? displayPercent(summary.income / summary.cost * 100) : '0.00%'} <em>p.a.</em></small></div>
        <div><span>Currency Gain</span><strong>$0.00</strong><small>0.00% <em>p.a.</em></small></div>
        <div className="active"><span>Total Return</span><strong><PrivateMoney value={totalReturn} digits={2} /></strong><small className={totalReturnPct >= 0 ? 'positive' : 'negative'}>{displayPercent(totalReturnPct)} <em>p.a.</em></small></div>
      </div>

      <section className="portfolio-chart-section">
        <div className="chart-mode-row">
          <div><button className="active">Amount</button><button>Percent</button></div>
          <div><button className="active">Line</button><button>Bar</button></div>
          <div className="period-shortcuts" role="group" aria-label="Performance period">{Object.keys(periods).map((item) => <button key={item} className={period === item ? 'selected' : ''} onClick={() => setPeriod(item)}>{item}</button>)}</div>
        </div>
        {chartData.length > 1 ? <div className="portfolio-main-chart"><ResponsiveContainer width="100%" height="100%"><AreaChart data={chartData} margin={{ top: 18, right: 12, left: 0, bottom: 0 }}><defs><linearGradient id="portfolio-blue-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#3a6ff5" stopOpacity={0.16}/><stop offset="1" stopColor="#3a6ff5" stopOpacity={0}/></linearGradient></defs><CartesianGrid stroke="var(--line)" vertical={false}/><XAxis dataKey="date" tickFormatter={(value) => date(value, { month: 'short' })} axisLine={false} tickLine={false} tick={{ fill: 'var(--muted-2)', fontSize: 11 }}/><YAxis orientation="right" tickFormatter={(value) => `$${Math.round(Number(value) / 1000)}k`} axisLine={false} tickLine={false} width={56} tick={{ fill: 'var(--muted-2)', fontSize: 11 }}/><Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 6 }} formatter={(value) => money(Number(value), 'AUD', 2)}/><Area type="linear" dataKey="value_aud" stroke="#3a6ff5" strokeWidth={2} fill="url(#portfolio-blue-fill)" dot={false} isAnimationActive={false}/></AreaChart></ResponsiveContainer></div> : <div className="portfolio-chart-empty"><EmptyState icon={TrendingUp} title="Performance history begins after your first sync" description="Daily portfolio snapshots will build the return chart without inventing historical values." /></div>}
      </section>

      <section className="portfolio-holdings">
        <div className="holdings-head"><h2>Holdings</h2><div><button>Exchange<ChevronDown size={13}/></button><button><EyeOff size={14}/>Hide Closed</button><button><Columns3 size={14}/>Columns</button><button onClick={exportHoldings}><Download size={14}/>Export<ChevronDown size={13}/></button></div></div>
        {groups.length ? <div className="portfolio-table-scroll"><table><thead><tr><th>Symbol</th><th className="numeric">Price</th><th className="numeric">Quantity</th><th className="numeric">Value</th><th className="numeric">Capital Gain</th><th className="numeric">Capital Gain % (p.a.)</th><th className="numeric">Total Return</th><th className="numeric">Total Return % (p.a.)</th><th/></tr></thead><tbody>{groups.map(([market, items]) => {
          const value = items.reduce((sum, item) => sum + item.value_aud, 0)
          const gain = items.reduce((sum, item) => sum + item.unrealised_gain_aud, 0)
          const cost = items.reduce((sum, item) => sum + item.cost_aud, 0)
          return <Fragment key={market}><tr className="market-row"><td colSpan={9}><ChevronDown size={13}/>{market}</td></tr>{items.map((item) => <HoldingRow key={`${item.account_name}-${item.symbol}`} item={item}/>)}<tr className="subtotal-row"><td>Total</td><td/><td/><td className="numeric private-value">{money(value, 'AUD', 2)}</td><td className={`numeric private-value ${gain >= 0 ? 'positive' : 'negative'}`}>{money(gain, 'AUD', 2)}</td><td className={`numeric ${gain >= 0 ? 'positive' : 'negative'}`}>{displayPercent(cost ? gain / cost * 100 : 0)}</td><td className={`numeric private-value ${gain >= 0 ? 'positive' : 'negative'}`}>{money(gain, 'AUD', 2)}</td><td className={`numeric ${gain >= 0 ? 'positive' : 'negative'}`}>{displayPercent(cost ? gain / cost * 100 : 0)}</td><td/></tr></Fragment>
        })}<tr className="grand-total"><td>Grand Total</td><td/><td/><td className="numeric private-value">{money(summary.invested, 'AUD', 2)}</td><td className={`numeric private-value ${summary.unrealised >= 0 ? 'positive' : 'negative'}`}>{money(summary.unrealised, 'AUD', 2)}</td><td className={`numeric ${summary.returnPct >= 0 ? 'positive' : 'negative'}`}>{displayPercent(summary.returnPct)}</td><td className={`numeric private-value ${totalReturn >= 0 ? 'positive' : 'negative'}`}>{money(totalReturn, 'AUD', 2)}</td><td className={`numeric ${totalReturnPct >= 0 ? 'positive' : 'negative'}`}>{displayPercent(totalReturnPct)}</td><td/></tr></tbody></table></div> : <EmptyState title="No holdings yet" description="Import a portfolio report or connect a broker to populate this portfolio." />}
        <p className="portfolio-footnote">* All values displayed in AUD unless otherwise specified.</p>
      </section>
    </div>
  )
}
