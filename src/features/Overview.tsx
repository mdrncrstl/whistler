import { ArrowDownRight, ArrowUpRight, BriefcaseBusiness, CircleDollarSign, Landmark, RefreshCw, TrendingUp, WalletCards } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { usePortfolio } from '../context/PortfolioContext'
import { allocationBy, summarisePortfolio } from '../lib/portfolio'
import { date, money, percent } from '../lib/format'
import { Badge, Button, Card, EmptyState, MetricCard, PageHeader, PrivateMoney, Select } from '../components/ui'

const periods: Record<string, number> = { '1M': 31, '3M': 93, '6M': 186, YTD: 366, '1Y': 366, '3Y': 1096, ALL: Infinity }
const palette = ['#6ee7a8', '#8b7cff', '#d6b56b', '#58a6ff', '#ff9d6c', '#bdc7c1']

export function Overview() {
  const { bundle, action, refreshQuotes } = usePortfolio()
  const [period, setPeriod] = useState('1Y')
  const [allocationKey, setAllocationKey] = useState<'asset_class' | 'provider' | 'sector'>('asset_class')
  const summary = useMemo(() => summarisePortfolio(bundle), [bundle])
  const allocation = useMemo(() => allocationBy(bundle.holdings, allocationKey), [allocationKey, bundle.holdings])
  const chartData = useMemo(() => {
    const latest = bundle.snapshots.at(-1)?.date ? new Date(bundle.snapshots.at(-1)!.date).getTime() : 0
    const days = periods[period]
    return bundle.snapshots.filter((item) => days === Infinity || new Date(item.date).getTime() >= latest - days * 86_400_000)
  }, [bundle.snapshots, period])
  const movers = [...bundle.holdings].sort((a, b) => Math.abs(b.day_change_aud) - Math.abs(a.day_change_aud)).slice(0, 5)

  return (
    <>
      <PageHeader
        title="Portfolio"
        description="Your complete position across every connected account, reported in AUD."
        actions={<Button icon={RefreshCw} busy={action === 'refresh-quotes'} onClick={() => refreshQuotes()}>Refresh market data</Button>}
      />
      <div className="metric-grid four">
        <MetricCard label="Total portfolio" value={<PrivateMoney value={summary.total} />} change={percent(summary.returnPct)} tone={summary.returnPct >= 0 ? 'positive' : 'negative'} detail="all-time unrealised" />
        <MetricCard label="Today's move" value={<PrivateMoney value={summary.dayChange} />} change={summary.total ? percent(summary.dayChange / Math.max(1, summary.total - summary.dayChange) * 100) : '–'} tone={summary.dayChange >= 0 ? 'positive' : 'negative'} detail="across current holdings" />
        <MetricCard label="Unrealised gain" value={<PrivateMoney value={summary.unrealised} />} change={percent(summary.returnPct)} tone={summary.unrealised >= 0 ? 'positive' : 'negative'} detail={`on ${money(summary.cost)} cost`} />
        <MetricCard label="Cash available" value={<PrivateMoney value={summary.cash} />} change={`${summary.holdingCount} holdings`} detail="across linked accounts" />
      </div>

      <div className="dashboard-grid">
        <Card className="performance-card">
          <div className="card-title-row">
            <div><span className="section-label">PERFORMANCE</span><h2>Portfolio value</h2></div>
            <div className="period-tabs" role="group" aria-label="Performance period">
              {Object.keys(periods).map((item) => <button key={item} className={period === item ? 'active' : ''} onClick={() => setPeriod(item)}>{item}</button>)}
            </div>
          </div>
          {chartData.length > 1 ? (
            <div className="main-chart">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 18, right: 10, left: 2, bottom: 0 }}>
                  <defs>
                    <linearGradient id="portfolio-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#6ee7a8" stopOpacity={0.24} /><stop offset="1" stopColor="#6ee7a8" stopOpacity={0} /></linearGradient>
                  </defs>
                  <CartesianGrid stroke="#203429" strokeDasharray="3 5" vertical={false} />
                  <XAxis dataKey="date" tickFormatter={(value) => date(value, { month: 'short' })} axisLine={false} tickLine={false} tick={{ fill: '#789087', fontSize: 11 }} />
                  <YAxis tickFormatter={(value) => `$${Math.round(Number(value) / 1000)}k`} axisLine={false} tickLine={false} width={48} tick={{ fill: '#789087', fontSize: 11 }} />
                  <Tooltip contentStyle={{ background: '#0d1913', border: '1px solid #294335', borderRadius: 10 }} labelFormatter={(value) => date(String(value))} formatter={(value, name) => [money(Number(value)), name]} />
                  <Area name="Portfolio" type="monotone" dataKey="value_aud" stroke="#6ee7a8" strokeWidth={2.5} fill="url(#portfolio-fill)" dot={false} activeDot={{ r: 4, fill: '#6ee7a8', stroke: '#07110d', strokeWidth: 2 }} isAnimationActive={false} />
                  {chartData.some((item) => item.benchmark_value_aud != null) && <Area name="Benchmark" type="monotone" dataKey="benchmark_value_aud" stroke="#8b7cff" strokeWidth={1.5} strokeDasharray="5 5" fill="transparent" dot={false} isAnimationActive={false} />}
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : <EmptyState icon={TrendingUp} title="Performance history begins after your first sync" description="Daily snapshots will build an accurate portfolio chart over time." />}
          <div className="chart-legend"><span><i className="legend-line portfolio" />Portfolio</span>{chartData.some((item) => item.benchmark_value_aud != null) && <span><i className="legend-line benchmark" />Benchmark</span>}<span className="chart-asof">Last portfolio point {date(chartData.at(-1)?.date)}</span></div>
        </Card>

        <Card className="allocation-card">
          <div className="card-title-row">
            <div><span className="section-label">ALLOCATION</span><h2>Where you are invested</h2></div>
            <Select value={allocationKey} onChange={(event) => setAllocationKey(event.target.value as typeof allocationKey)}>
              <option value="asset_class">Asset class</option><option value="provider">Broker</option><option value="sector">Sector</option>
            </Select>
          </div>
          {allocation.length ? <>
            <div className="allocation-bar">{allocation.map((item, index) => <span key={item.name} style={{ width: `${item.percentage}%`, background: palette[index % palette.length] }} title={`${item.name}: ${item.percentage.toFixed(1)}%`} />)}</div>
            <div className="allocation-list">{allocation.slice(0, 6).map((item, index) => <div key={item.name}><span><i style={{ background: palette[index % palette.length] }} />{item.name}</span><strong>{item.percentage.toFixed(1)}%</strong><small className="private-value">{money(item.value)}</small></div>)}</div>
          </> : <EmptyState icon={BriefcaseBusiness} title="No allocation yet" description="Import a portfolio report or connect IBKR to see your exposure." />}
        </Card>

        <Card className="holdings-preview">
          <div className="card-title-row"><div><span className="section-label">HOLDINGS</span><h2>Largest positions</h2></div><Badge tone="gold">{bundle.holdings.length} assets</Badge></div>
          {bundle.holdings.length ? <div className="table-scroll"><table><thead><tr><th>Asset</th><th>Account</th><th className="numeric">Value</th><th className="numeric">Return</th></tr></thead><tbody>{[...bundle.holdings].sort((a, b) => b.value_aud - a.value_aud).slice(0, 6).map((item) => <tr key={`${item.provider}-${item.symbol}`}><td><span className="asset-cell"><i>{item.symbol.slice(0, 2)}</i><span><strong>{item.symbol}</strong><small>{item.name}</small></span></span></td><td><Badge tone={item.provider === 'ibkr' ? 'purple' : 'success'}>{item.account_name}</Badge></td><td className="numeric private-value">{money(item.value_aud)}</td><td className={`numeric ${item.return_pct >= 0 ? 'positive' : 'negative'}`}>{percent(item.return_pct)}</td></tr>)}</tbody></table></div> : <EmptyState icon={BriefcaseBusiness} title="No holdings yet" description="Use Connections to import your first portfolio." />}
        </Card>

        <Card className="movers-card">
          <div className="card-title-row"><div><span className="section-label">TODAY</span><h2>Top movers</h2></div></div>
          {movers.length ? <div className="movers-list">{movers.map((item) => <div key={`${item.provider}-${item.symbol}`}><span className={`move-icon ${item.day_change_aud >= 0 ? 'up' : 'down'}`}>{item.day_change_aud >= 0 ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}</span><span><strong>{item.symbol}</strong><small>{item.market || item.currency}</small></span><span className="mover-value"><strong className={`private-value ${item.day_change_aud >= 0 ? 'positive' : 'negative'}`}>{money(item.day_change_aud)}</strong><small>{percent(item.value_aud ? item.day_change_aud / (item.value_aud - item.day_change_aud) * 100 : 0)}</small></span></div>)}</div> : <EmptyState icon={TrendingUp} title="No market moves" description="Refresh prices after importing holdings." />}
        </Card>

        <div className="insight-rail">
          <Card><WalletCards /><span><small>Invested</small><strong className="private-value">{money(summary.invested)}</strong></span></Card>
          <Card><CircleDollarSign /><span><small>Income recorded</small><strong className="private-value">{money(summary.income)}</strong></span></Card>
          <Card><Landmark /><span><small>Data sources</small><strong>{new Set(bundle.holdings.map((item) => item.provider)).size || 0} connected</strong></span></Card>
        </div>
      </div>
    </>
  )
}
