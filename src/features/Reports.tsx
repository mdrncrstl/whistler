import { CalendarDays, Download, Filter, Scale, Search, TrendingUp } from 'lucide-react'
import { useMemo, useState, type ReactNode } from 'react'
import { useParams } from 'react-router-dom'
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Badge, Button, Card, EmptyState, PageHeader, Select } from '../components/ui'
import { usePortfolio } from '../context/PortfolioContext'
import { allocationBy, incomeTransactions, summarisePortfolio } from '../lib/portfolio'
import { date, downloadCsv, money, percent } from '../lib/format'
import type { PortfolioBundle, Position, Transaction } from '../types'

const colours = ['#2563eb', '#0f766e', '#7c3aed', '#d97706', '#e11d48', '#64748b']
const reportCopy: Record<string, [string, string]> = {
  benchmark: ['Benchmark analysis', 'Compare portfolio returns with a market index on the same invested-capital basis.'],
  performance: ['Performance breakdown', 'See the holdings and markets driving capital, income and currency return.'],
  diversification: ['Portfolio diversification', 'Review allocation and concentration across markets, sectors and asset classes.'],
  growth: ['Growth & goals', 'Track portfolio growth and model progress towards a target value.'],
  income: ['Income breakdown', 'Analyse every recorded dividend, distribution and interest payment.'],
  'income-calendar': ['Income calendar', 'Review paid income and an indicative schedule based on recorded distributions.'],
}

export function Reports() {
  const { report = 'performance' } = useParams()
  const { bundle } = usePortfolio()
  const [query, setQuery] = useState('')
  const holdings = useMemo(() => bundle.holdings.filter((holding) => `${holding.symbol} ${holding.name || ''}`.toLowerCase().includes(query.toLowerCase())), [bundle.holdings, query])
  const scoped = useMemo(() => ({ ...bundle, holdings }), [bundle, holdings])
  const [title, description] = reportCopy[report] || reportCopy.performance

  return <>
    <PageHeader title={title} description={description} />
    <ReportToolbar query={query} onQuery={setQuery} report={report} bundle={scoped} />
    {report === 'benchmark' && <Benchmark bundle={scoped} />}
    {report === 'performance' && <Performance bundle={scoped} />}
    {report === 'diversification' && <Diversification bundle={scoped} />}
    {report === 'growth' && <Growth bundle={scoped} />}
    {report === 'income' && <IncomeBreakdown bundle={scoped} />}
    {report === 'income-calendar' && <IncomeCalendar bundle={scoped} />}
  </>
}

function ReportToolbar({ query, onQuery, report, bundle }: { query: string; onQuery: (value: string) => void; report: string; bundle: PortfolioBundle }) {
  const rows = bundle.holdings.map((h) => [h.symbol, h.market, h.account_name, h.value_aud, h.cost_aud, h.unrealised_gain_aud, h.return_pct])
  return <div className="report-toolbar">
    <label className="report-search"><Search size={14} /><input aria-label="Filter holdings" placeholder="Filter holdings…" value={query} onChange={(event) => onQuery(event.target.value)} /></label>
    <Select aria-label="Report period" defaultValue="all"><option value="all">All time</option><option value="fy">Current financial year</option><option value="12m">Last 12 months</option></Select>
    <Button icon={Filter}>Filter</Button>
    <Select aria-label="Position status" defaultValue="all"><option value="all">All positions</option><option value="open">Open positions</option><option value="closed">Closed positions</option></Select>
    <Select aria-label="Group by" defaultValue="market"><option value="market">Exchange</option><option value="sector">Sector</option><option value="asset">Asset class</option></Select>
    <Button icon={Download} onClick={() => downloadCsv(`masterdeck-${report}.csv`, ['Symbol', 'Market', 'Account', 'Value AUD', 'Cost AUD', 'Gain AUD', 'Return %'], rows)}>Export</Button>
  </div>
}

function MetricStrip({ children }: { children: ReactNode }) { return <div className="report-metric-strip">{children}</div> }
function Metric({ label, value, sub }: { label: string; value: ReactNode; sub?: ReactNode }) { return <Card className="report-metric"><span>{label}</span><strong>{value}</strong>{sub && <small>{sub}</small>}</Card> }

function Performance({ bundle }: { bundle: PortfolioBundle }) {
  const summary = summarisePortfolio(bundle)
  const markets = groupHoldings(bundle.holdings)
  const sorted = [...bundle.holdings].sort((a, b) => b.unrealised_gain_aud - a.unrealised_gain_aud)
  return <>
    <MetricStrip><Metric label="Total return" value={money(summary.unrealised + summary.income)} sub={percent(summary.returnPct) + ' p.a.'} /><Metric label="Gainers" value={bundle.holdings.filter((h) => h.unrealised_gain_aud >= 0).length} /><Metric label="Losers" value={bundle.holdings.filter((h) => h.unrealised_gain_aud < 0).length} /><Metric label="Best" value={sorted[0]?.symbol || '—'} sub={sorted[0] ? money(sorted[0].unrealised_gain_aud) : 'No holdings'} /><Metric label="Worst" value={sorted.at(-1)?.symbol || '—'} sub={sorted.at(-1) ? money(sorted.at(-1)!.unrealised_gain_aud) : 'No holdings'} /></MetricStrip>
    <Card className="report-chart-card"><div className="card-title-row"><div><span className="section-label">RETURN DRIVERS</span><h2>Return by market</h2></div><div className="segmented"><button className="active">Total return</button><button>Capital gain</button><button>Income return</button><button>Currency gain</button></div></div>{markets.length ? <div className="report-chart"><ResponsiveContainer><BarChart data={markets} layout="vertical"><CartesianGrid stroke="var(--line)" horizontal={false}/><XAxis type="number" tickFormatter={(v) => money(Number(v), 'AUD', 0)} /><YAxis dataKey="name" type="category" width={70}/><Tooltip formatter={(v) => money(Number(v))}/><Bar dataKey="gain" fill="#2563eb" radius={[0,4,4,0]}/></BarChart></ResponsiveContainer></div> : <EmptyState icon={TrendingUp} title="No performance data" description="Connect or import holdings to build a return breakdown."/>}</Card>
    <HoldingsPerformanceTable holdings={bundle.holdings} />
  </>
}

function HoldingsPerformanceTable({ holdings }: { holdings: Position[] }) {
  const groups = groupPositions(holdings)
  return <Card className="data-card report-detail-card"><div className="card-title-row"><div><span className="section-label">HOLDINGS BREAKDOWN</span><h2>Capital, income and currency contribution</h2></div><Badge>{holdings.length} holdings</Badge></div>{holdings.length ? <div className="table-scroll"><table><thead><tr><th>Holding</th><th>Market</th><th className="numeric">Capital gain</th><th className="numeric">Income return</th><th className="numeric">Currency gain</th><th className="numeric">Total return</th></tr></thead><tbody>{groups.flatMap(([market, rows]) => [<tr className="table-group-row" key={`${market}-head`}><td colSpan={6}>{market}</td></tr>, ...rows.map((h) => <tr key={`${h.account_name}-${h.symbol}`}><td><strong>{h.symbol}</strong><small>{h.name}</small></td><td>{h.account_name}</td><td className={`numeric ${h.unrealised_gain_aud >= 0 ? 'positive' : 'negative'}`}>{money(h.unrealised_gain_aud)}</td><td className="numeric">—</td><td className="numeric">—</td><td className={`numeric ${h.unrealised_gain_aud >= 0 ? 'positive' : 'negative'}`}><strong>{money(h.unrealised_gain_aud)}</strong><small>{percent(h.return_pct)}</small></td></tr>)])}</tbody></table></div> : <EmptyState icon={TrendingUp} title="No holdings to break down" description="Your grouped return ledger appears here after the first import."/>}</Card>
}

function Benchmark({ bundle }: { bundle: PortfolioBundle }) {
  const snapshots = bundle.snapshots
  const first = snapshots[0]
  const last = snapshots.at(-1)
  const portfolioReturn = first && last ? ((last.value_aud / first.value_aud) - 1) * 100 : 0
  const benchmarkReturn = first?.benchmark_value_aud && last?.benchmark_value_aud ? ((last.benchmark_value_aud / first.benchmark_value_aud) - 1) * 100 : 0
  const winners = [...bundle.holdings].sort((a, b) => b.return_pct - a.return_pct)
  return <>
    <MetricStrip><Metric label="Entity" value="Portfolio" sub="Time weighted"/><Metric label="Total return" value={percent(portfolioReturn)} sub="Portfolio"/><Metric label="Capital gain" value={percent(summarisePortfolio(bundle).returnPct)} /><Metric label="Income return" value={money(summarisePortfolio(bundle).income)} /><Metric label="Currency gain" value="—" sub="Not isolated"/></MetricStrip>
    <Card className="report-chart-card"><div className="card-title-row"><div><span className="section-label">PORTFOLIO VS BENCHMARK</span><h2>Growth of the same starting value</h2></div><Badge tone={portfolioReturn >= benchmarkReturn ? 'success' : 'warning'}>{percent(portfolioReturn - benchmarkReturn)} relative</Badge></div>{snapshots.length > 1 ? <div className="report-chart"><ResponsiveContainer><LineChart data={snapshots}><CartesianGrid stroke="var(--line)" vertical={false}/><XAxis dataKey="date" tickFormatter={(value) => date(value, { month: 'short' })}/><YAxis tickFormatter={(value) => `$${Math.round(Number(value) / 1000)}k`} /><Tooltip formatter={(value) => money(Number(value))}/><Line dataKey="value_aud" name="Portfolio" stroke="#2563eb" strokeWidth={2.5} dot={false}/><Line dataKey="benchmark_value_aud" name="Benchmark" stroke="#94a3b8" strokeWidth={2} strokeDasharray="5 5" dot={false}/></LineChart></ResponsiveContainer></div> : <EmptyState icon={Scale} title="Benchmark history is building" description="Daily snapshots are required for a like-for-like comparison."/>}</Card>
    <div className="report-two-col"><RankedCard title="Outperformers" rows={winners.slice(0, 5)} /><RankedCard title="Underperformers" rows={winners.slice(-5).reverse()} /></div>
  </>
}

function RankedCard({ title, rows }: { title: string; rows: Position[] }) { return <Card className="ranked-card"><div className="card-title-row"><h2>{title}</h2><span>Total return</span></div>{rows.length ? rows.map((row) => <div className="ranked-row" key={`${title}-${row.symbol}`}><span><strong>{row.symbol}</strong><small>{row.market || row.account_name}</small></span><strong className={row.return_pct >= 0 ? 'positive' : 'negative'}>{percent(row.return_pct)}</strong></div>) : <EmptyState icon={TrendingUp} title="No holdings" description="Rankings appear after positions are imported."/>}</Card> }

function Diversification({ bundle }: { bundle: PortfolioBundle }) {
  const [view, setView] = useState<'provider'|'sector'|'asset_class'>('provider')
  const allocation = allocationBy(bundle.holdings, view)
  const total = summarisePortfolio(bundle).invested
  const topThree = allocation.slice(0, 3).reduce((sum, item) => sum + item.percentage, 0)
  return <>
    <div className="report-toolbar report-subtoolbar"><span>View allocation by</span><div className="segmented"><button className={view === 'provider' ? 'active' : ''} onClick={() => setView('provider')}>Account</button><button className={view === 'sector' ? 'active' : ''} onClick={() => setView('sector')}>Sector</button><button className={view === 'asset_class' ? 'active' : ''} onClick={() => setView('asset_class')}>Asset class</button></div></div>
    <MetricStrip><Metric label="Categories" value={allocation.length} /><Metric label="Largest allocation" value={allocation[0]?.name || '—'} sub={allocation[0] ? percent(allocation[0].percentage) : 'No data'} /><Metric label="Top 3 concentration" value={percent(topThree)} /><Metric label="Total value" value={money(total)} /></MetricStrip>
    <div className="report-two-col"><Card className="report-chart-card"><div className="card-title-row"><h2>Portfolio allocation</h2></div>{allocation.length ? <div className="donut-layout"><div className="donut-chart"><ResponsiveContainer><PieChart><Pie data={allocation} dataKey="value" nameKey="name" innerRadius="62%" outerRadius="86%">{allocation.map((_, index) => <Cell key={index} fill={colours[index % colours.length]}/>)}</Pie><Tooltip formatter={(value) => money(Number(value))}/></PieChart></ResponsiveContainer><span><strong>{money(total)}</strong><small>Invested</small></span></div><div className="allocation-list">{allocation.map((item, index) => <div key={item.name}><span><i style={{ background: colours[index % colours.length] }}/>{item.name}</span><strong>{percent(item.percentage)}</strong><small>{money(item.value)}</small></div>)}</div></div> : <EmptyState icon={TrendingUp} title="No allocation data" description="Import holdings to calculate portfolio concentration."/>}</Card><HoldingsWeightTable holdings={[...bundle.holdings]} total={total}/></div>
  </>
}

function HoldingsWeightTable({ holdings, total }: { holdings: Position[]; total: number }) { return <Card className="data-card report-detail-card"><div className="card-title-row"><h2>Holdings breakdown</h2></div>{holdings.length ? <div className="table-scroll"><table><thead><tr><th>Holding</th><th className="numeric">Weighting</th><th className="numeric">Value</th></tr></thead><tbody>{holdings.sort((a,b) => b.value_aud-a.value_aud).map((h) => <tr key={`${h.account_name}-${h.symbol}`}><td><strong>{h.symbol}</strong><small>{h.name}</small></td><td className="numeric">{percent(total ? h.value_aud/total*100 : 0)}</td><td className="numeric">{money(h.value_aud)}</td></tr>)}</tbody></table></div> : <EmptyState icon={TrendingUp} title="No holdings" description="Allocation details will appear here."/>}</Card> }

function Growth({ bundle }: { bundle: PortfolioBundle }) {
  const summary = summarisePortfolio(bundle)
  const [target, setTarget] = useState(250000)
  const progress = target ? Math.min(100, summary.total / target * 100) : 0
  const monthly = 1500
  const years = summary.returnPct > 0 ? Math.max(0, Math.log((target * (summary.returnPct / 1200) + monthly) / (summary.total * (summary.returnPct / 1200) + monthly)) / Math.log(1 + summary.returnPct / 1200) / 12) : Math.max(0, (target - summary.total) / monthly / 12)
  return <>
    <MetricStrip><Metric label="Portfolio value" value={money(summary.total)} /><Metric label="Capital gain" value={money(summary.unrealised)} sub={percent(summary.returnPct)} /><Metric label="Income return" value={money(summary.income)} /><Metric label="Target progress" value={percent(progress)} /><Metric label="Indicative time" value={Number.isFinite(years) ? `${years.toFixed(1)} years` : '—'} /></MetricStrip>
    <Card className="report-chart-card"><div className="card-title-row"><div><span className="section-label">GROWTH HISTORY</span><h2>Portfolio value and invested capital</h2></div><div className="segmented"><button className="active">Amount</button><button>Percent</button><button className="active">Line</button><button>Bar</button></div></div>{bundle.snapshots.length > 1 ? <div className="report-chart"><ResponsiveContainer><LineChart data={bundle.snapshots}><CartesianGrid stroke="var(--line)" vertical={false}/><XAxis dataKey="date" tickFormatter={(value) => date(value, { month: 'short' })}/><YAxis tickFormatter={(value) => `$${Math.round(Number(value)/1000)}k`}/><Tooltip formatter={(value) => money(Number(value))}/><Line dataKey="value_aud" name="Portfolio value" stroke="#2563eb" strokeWidth={2.5} dot={false}/><Line dataKey="invested_aud" name="Invested capital" stroke="#94a3b8" strokeWidth={2} dot={false}/></LineChart></ResponsiveContainer></div> : <EmptyState icon={TrendingUp} title="Growth history is building" description="Portfolio snapshots will appear here as prices sync."/>}</Card>
    <Card className="goal-card"><div><span className="section-label">GOAL</span><h2>Portfolio target</h2><p>Change the target to model progress using the current return and a $1,500 monthly contribution.</p></div><label>Target value<input type="number" min="1" value={target} onChange={(event) => setTarget(Number(event.target.value))}/></label><div className="goal-progress"><span style={{ width: `${progress}%` }}/></div><strong>{money(summary.total)} of {money(target)}</strong></Card>
    <HoldingsPerformanceTable holdings={bundle.holdings}/>
  </>
}

function IncomeBreakdown({ bundle }: { bundle: PortfolioBundle }) {
  const income = enrichIncome(bundle.transactions)
  const grouped = new Map<string, number>()
  income.forEach((item) => grouped.set(item.symbol || 'Cash', (grouped.get(item.symbol || 'Cash') || 0) + item.aud))
  const sources = [...grouped.entries()].sort((a,b) => b[1]-a[1])
  const total = income.reduce((sum,item) => sum+item.aud,0)
  return <>
    <MetricStrip><Metric label="Total income" value={money(total)} /><Metric label="Sources" value={sources.length} /><Metric label="Top contributor" value={sources[0]?.[0] || '—'} sub={sources[0] ? money(sources[0][1]) : 'No income'} /><Metric label="Average per source" value={money(sources.length ? total/sources.length : 0)} /></MetricStrip>
    <Card className="report-chart-card"><div className="card-title-row"><h2>Income by holding</h2></div>{sources.length ? <div className="report-chart short"><ResponsiveContainer><BarChart data={sources.map(([name,value]) => ({name,value}))}><CartesianGrid stroke="var(--line)" vertical={false}/><XAxis dataKey="name"/><YAxis tickFormatter={(value)=>money(Number(value),'AUD',0)}/><Tooltip formatter={(value)=>money(Number(value))}/><Bar dataKey="value" fill="#2563eb" radius={[4,4,0,0]}/></BarChart></ResponsiveContainer></div> : <EmptyState icon={CalendarDays} title="No income recorded" description="Dividend, distribution and interest payments appear here."/>}</Card>
    <Card className="data-card report-detail-card"><div className="card-title-row"><h2>Holdings breakdown</h2><Badge>{income.length} payments</Badge></div>{income.length ? <div className="table-scroll"><table><thead><tr><th>Symbol</th><th>Date paid</th><th>Type</th><th>Description</th><th className="numeric">Total</th></tr></thead><tbody>{income.map((item,index) => <tr key={`${item.date}-${item.symbol}-${index}`}><td><strong>{item.symbol || 'Cash'}</strong><small>{item.account_name}</small></td><td>{date(item.date)}</td><td><Badge tone="success">{item.type}</Badge></td><td>{item.description || 'Income payment'}</td><td className="numeric positive">{money(item.aud)}</td></tr>)}</tbody></table></div> : <EmptyState icon={CalendarDays} title="No income events" description="Imported payment records appear in this ledger."/>}</Card>
  </>
}

function IncomeCalendar({ bundle }: { bundle: PortfolioBundle }) {
  const historic = enrichIncome(bundle.transactions)
  const now = new Date()
  const projected = historic.slice(0, 18).map((item, index) => { const next = new Date(item.date); while (next <= now) next.setFullYear(next.getFullYear() + 1); return { ...item, date: next.toISOString().slice(0,10), id: `${item.symbol}-${index}` } }).sort((a,b) => a.date.localeCompare(b.date))
  const months = Array.from({length:12},(_,index) => { const start = new Date(now.getFullYear(),now.getMonth()+index,1); const key = `${start.getFullYear()}-${String(start.getMonth()+1).padStart(2,'0')}`; return {month:start.toLocaleDateString('en-AU',{month:'short'}),value:projected.filter((item)=>item.date.startsWith(key)).reduce((sum,item)=>sum+item.aud,0)} })
  const estimated = projected.reduce((sum,item)=>sum+item.aud,0)
  const paid = historic.filter((item)=>new Date(item.date).getFullYear()===now.getFullYear()).reduce((sum,item)=>sum+item.aud,0)
  return <>
    <MetricStrip><Metric label="Total income" value={money(paid+estimated)} /><Metric label="Paid" value={money(paid)} /><Metric label="Estimated" value={money(estimated)} /><Metric label="Payments" value={projected.length} /></MetricStrip>
    <Card className="report-chart-card"><div className="card-title-row"><div><span className="section-label">NEXT 12 MONTHS</span><h2>Monthly income</h2></div><Badge tone="warning">Indicative</Badge></div><div className="report-chart short"><ResponsiveContainer><BarChart data={months}><CartesianGrid stroke="var(--line)" vertical={false}/><XAxis dataKey="month"/><YAxis tickFormatter={(value)=>money(Number(value),'AUD',0)}/><Tooltip formatter={(value)=>money(Number(value))}/><Bar dataKey="value" fill="#2563eb" radius={[4,4,0,0]}/></BarChart></ResponsiveContainer></div></Card>
    <Card className="data-card report-detail-card"><div className="card-title-row"><div><span className="section-label">SCHEDULE</span><h2>Upcoming payments</h2></div><span>Estimated from prior recorded payments</span></div>{projected.length ? <div className="table-scroll"><table><thead><tr><th>Holding</th><th>Estimated ex-date</th><th>Payment date</th><th>Status</th><th className="numeric">Net amount</th></tr></thead><tbody>{projected.map((item) => <tr key={item.id}><td><strong>{item.symbol || 'Cash'}</strong><small>{item.description}</small></td><td>{date(item.date)}</td><td>{date(item.date)}</td><td><Badge tone="warning">Estimated</Badge></td><td className="numeric positive">{money(item.aud)}</td></tr>)}</tbody></table></div> : <EmptyState icon={CalendarDays} title="No upcoming payments to estimate" description="A schedule appears once income history has been imported."/>}</Card>
  </>
}

function enrichIncome(transactions: Transaction[]) { return incomeTransactions(transactions).map((item) => ({ ...item, aud: Math.abs(item.amount * item.fx_rate) })).sort((a,b) => b.date.localeCompare(a.date)) }
function groupPositions(holdings: Position[]) { const map = new Map<string,Position[]>(); holdings.forEach((h)=>{const key=h.market||'Other';map.set(key,[...(map.get(key)||[]),h])}); return [...map.entries()] }
function groupHoldings(holdings: Position[]) { const map = new Map<string,{value:number;gain:number}>(); holdings.forEach((h)=>{const name=h.market||'Other';const current=map.get(name)||{value:0,gain:0};map.set(name,{value:current.value+h.value_aud,gain:current.gain+h.unrealised_gain_aud})}); return [...map].map(([name,values])=>({name,...values})) }
