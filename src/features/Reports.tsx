import { CalendarDays, ChevronLeft, ChevronRight, Download, Scale, Search, TrendingUp } from 'lucide-react'

import { useMemo, useState, type ReactNode } from 'react'

import { useParams } from 'react-router-dom'

import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

import { Badge, Button, Card, EmptyState, PageHeader, Select } from '../components/ui'

import { HoldingLogo } from '../components/HoldingLogo'

import { HoldingNavigationItem, HoldingNavigationRow } from '../components/HoldingNavigation'

import { usePortfolio } from '../context/PortfolioContext'

import { allocationBy, holdingCapitalGain, holdingCurrencyGain, incomeTransactions, summarisePortfolio } from '../lib/portfolio'

import { date, downloadCsv, money, percent, share } from '../lib/format'

import type { PortfolioBundle, Position, Transaction } from '../types'



// Validated in light and dark against the chart surface (dataviz six checks).
const colours = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)', 'var(--chart-6)']

const reportCopy: Record<string, [string, string]> = {

  benchmark: ['Benchmark analysis', 'Review recorded portfolio and benchmark values. Value growth includes cash flows and is not a time-weighted return.'],

  performance: ['Performance breakdown', 'See the holdings and markets driving capital, income and currency return.'],

  diversification: ['Portfolio diversification', 'Review allocation and concentration across markets, sectors and asset classes.'],

  growth: ['Growth & goals', 'Track portfolio growth and model progress towards a target value.'],

  income: ['Income breakdown', 'Analyse every recorded dividend, distribution and interest payment.'],

  'income-calendar': ['Income calendar', 'Review daily portfolio movement alongside an indicative schedule of recorded distributions.'],

}



export function Reports() {

  const { report = 'performance' } = useParams()

  const { bundle } = usePortfolio()

  const [query, setQuery] = useState('')
  const [reportDate] = useState(() => Date.now())

  const [period, setPeriod] = useState<'all' | 'fy' | '12m'>('all')

  const [positionStatus, setPositionStatus] = useState<'all' | 'open'>('all')

  const [groupBy, setGroupBy] = useState<'market' | 'sector' | 'asset'>('market')

  const holdings = useMemo(() => bundle.holdings.filter((holding) => `${holding.symbol} ${holding.name || ''}`.toLowerCase().includes(query.toLowerCase())), [bundle.holdings, query])

  const holdingsForStatus = useMemo(() => positionStatus === 'open' ? holdings.filter((holding) => holding.quantity !== 0) : holdings, [holdings, positionStatus])

  const scoped = useMemo(() => {

    const transactions = bundle.transactions.filter(t => !query || `${t.symbol || ''} ${t.description || ''}`.toLowerCase().includes(query.toLowerCase()))

    if (period === 'all') return { ...bundle, transactions, holdings: holdingsForStatus }

    const latest = reportDate

    const latestDate = new Date(latest)

    const financialYearStart = new Date(latestDate.getMonth() >= 6 ? latestDate.getFullYear() : latestDate.getFullYear() - 1, 6, 1).getTime()

    const cutoff = period === 'fy' ? financialYearStart : latest - 365 * 86_400_000

    return { ...bundle, transactions: transactions.filter(t => new Date(t.date).getTime() >= cutoff), holdings: holdingsForStatus, snapshots: bundle.snapshots.filter((snapshot) => new Date(snapshot.date).getTime() >= cutoff) }

  }, [bundle, holdingsForStatus, period, query, reportDate])

  const [title, description] = reportCopy[report] || reportCopy.performance



  return <>

    <PageHeader title={title} description={description} />

    <ReportToolbar query={query} onQuery={setQuery} report={report} bundle={scoped} period={period} onPeriod={setPeriod} positionStatus={positionStatus} onPositionStatus={setPositionStatus} groupBy={groupBy} onGroupBy={setGroupBy} />

    {report === 'benchmark' && <Benchmark bundle={scoped} />}

    {report === 'performance' && <Performance bundle={scoped} groupBy={groupBy} />}

    {report === 'diversification' && <Diversification bundle={scoped} />}

    {report === 'growth' && <Growth bundle={scoped} />}

    {report === 'income' && <IncomeBreakdown bundle={scoped} />}

    {report === 'income-calendar' && <IncomeCalendar bundle={scoped} />}

  </>

}



function ReportToolbar({ query, onQuery, report, bundle, period, onPeriod, positionStatus, onPositionStatus, groupBy, onGroupBy }: { query: string; onQuery: (value: string) => void; report: string; bundle: PortfolioBundle; period: 'all' | 'fy' | '12m'; onPeriod: (value: 'all' | 'fy' | '12m') => void; positionStatus: 'all' | 'open'; onPositionStatus: (value: 'all' | 'open') => void; groupBy: 'market' | 'sector' | 'asset'; onGroupBy: (value: 'market' | 'sector' | 'asset') => void }) {

  const rows = bundle.holdings.map((h) => [h.symbol, h.market, h.account_name, h.value_aud, h.cost_aud, h.unrealised_gain_aud, h.return_pct])

  return <div className="report-toolbar">

    <label className="report-search"><Search size={14} /><input aria-label="Filter holdings" placeholder="Filter holdings…" value={query} onChange={(event) => onQuery(event.target.value)} /></label>

    {['benchmark','growth','income','income-calendar'].includes(report) && <Select aria-label="Report period" value={period} onChange={(event) => onPeriod(event.target.value as 'all' | 'fy' | '12m')}><option value="all">All time</option><option value="fy">Current financial year</option><option value="12m">Last 12 months</option></Select>}

    <Select aria-label="Position status" value={positionStatus} onChange={(event) => onPositionStatus(event.target.value as 'all' | 'open')}><option value="all">All positions</option><option value="open">Open positions</option></Select>

    {report === 'performance' && <Select aria-label="Group by" value={groupBy} onChange={(event) => onGroupBy(event.target.value as 'market' | 'sector' | 'asset')}><option value="market">Exchange</option><option value="sector">Sector</option><option value="asset">Asset class</option></Select>}

    <Button icon={Download} onClick={() => { if (['income','income-calendar'].includes(report)) return downloadCsv(`masterdeck-${report}.csv`, ['Date','Symbol','Type','Recorded income AUD'], incomeTransactions(bundle.transactions).map(t => [t.date,t.symbol,t.type,Math.abs(t.amount*t.fx_rate)])); if (['benchmark','growth'].includes(report)) return downloadCsv(`masterdeck-${report}.csv`, ['Date','Portfolio value AUD','Benchmark value AUD'], bundle.snapshots.map(t => [t.date,t.value_aud,t.benchmark_value_aud])); downloadCsv(`masterdeck-${report}.csv`, ['Symbol', 'Market', 'Account', 'Value AUD', 'Cost AUD', 'Gain AUD', 'Return %'], rows) }}>Export</Button>

  </div>

}



function MetricStrip({ children }: { children: ReactNode }) { return <div className="report-metric-strip">{children}</div> }

function Metric({ label, value, sub }: { label: string; value: ReactNode; sub?: ReactNode }) { return <Card className="report-metric"><span>{label}</span><strong>{value}</strong>{sub && <small>{sub}</small>}</Card> }

function formatAllocationName(name: string) {

  const normalized = name.trim().toLowerCase()

  if (normalized === 'ibkr') return 'IBKR'

  if (normalized === 'superhero') return 'Superhero'

  return name

}



function Performance({ bundle, groupBy }: { bundle: PortfolioBundle; groupBy: 'market' | 'sector' | 'asset' }) {

  const summary = summarisePortfolio(bundle)

  const [view, setView] = useState<'total' | 'capital' | 'income' | 'currency'>('total')

  const markets = useMemo(() => {

    const grouped = new Map<string, number>()

    bundle.holdings.forEach((holding) => {

      const holdingIncome = incomeTransactions(bundle.transactions).filter(t => t.symbol === holding.symbol && t.account_name === holding.account_name && t.provider === holding.provider).reduce((sum,t) => sum + Math.abs(t.amount*t.fx_rate),0)

      const value = view === 'income' ? holdingIncome : holding.unrealised_gain_aud + (view === 'total' ? holdingIncome : 0)

      const group = groupBy === 'sector' ? holding.sector || 'Other' : groupBy === 'asset' ? holding.asset_class || 'Other' : holding.market || 'Other'

      grouped.set(group, (grouped.get(group) || 0) + value)

    })

    return [...grouped].map(([name, gain]) => ({ name, gain }))

  }, [bundle.holdings, bundle.transactions, groupBy, view])

  const viewLabel = view === 'total' ? 'Total return' : view === 'capital' ? 'Capital gain' : view === 'income' ? 'Income return' : 'Currency gain'

  const groupLabel = groupBy === 'sector' ? 'sector' : groupBy === 'asset' ? 'asset class' : 'market'

  const sorted = [...bundle.holdings].sort((a, b) => b.unrealised_gain_aud - a.unrealised_gain_aud)

  return <>

    <MetricStrip><Metric label="Total return" value={money(summary.unrealised + summary.income)} sub={percent(summary.cost ? (summary.unrealised + summary.income) / summary.cost * 100 : 0) + ' total'} /><Metric label="Gainers" value={bundle.holdings.filter((h) => h.unrealised_gain_aud >= 0).length} /><Metric label="Losers" value={bundle.holdings.filter((h) => h.unrealised_gain_aud < 0).length} /><Metric label="Best" value={sorted[0]?.symbol || '—'} sub={sorted[0] ? money(sorted[0].unrealised_gain_aud) : 'No holdings'} /><Metric label="Worst" value={sorted.at(-1)?.symbol || '—'} sub={sorted.at(-1) ? money(sorted.at(-1)!.unrealised_gain_aud) : 'No holdings'} /></MetricStrip>

    <Card className="report-chart-card"><div className="card-title-row"><div><span className="section-label">RETURN DRIVERS</span><h2>Return by {groupLabel} · {viewLabel}</h2></div><div className="segmented" role="group" aria-label="Return measure">{([['total','Total return'],['capital','Capital gain'],['income','Income return']] as const).map(([value, label]) => <button type="button" key={value} className={view === value ? 'active' : ''} aria-pressed={view === value} onClick={() => setView(value)}>{label}</button>)}</div></div>{markets.length && view !== 'currency' ? <div className="report-chart"><ResponsiveContainer><BarChart data={markets} layout="vertical"><CartesianGrid stroke="var(--line)" horizontal={false}/><XAxis type="number" tickFormatter={(v) => money(Number(v), 'AUD', 0)} /><YAxis dataKey="name" type="category" width={70}/><Tooltip separator=": " isAnimationActive={false} animationDuration={0} animationEasing="linear" formatter={(v) => money(Number(v))}/><Bar dataKey="gain" fill="var(--green)" radius={[0,4,4,0]}/></BarChart></ResponsiveContainer></div> : <EmptyState icon={TrendingUp} title={view === 'currency' ? 'Currency return is not isolated' : 'No performance data'} description={view === 'currency' ? 'Currency movement will appear when source FX gains are available.' : 'Connect or import holdings to build a return breakdown.'}/>}</Card>

    <HoldingsPerformanceTable holdings={bundle.holdings} transactions={bundle.transactions} />

  </>

}



function incomeForHolding(h: Position, transactions: Transaction[]) { return incomeTransactions(transactions).filter(t => t.symbol === h.symbol && t.account_name === h.account_name && t.provider === h.provider).reduce((sum,t) => sum + Math.abs(t.amount*t.fx_rate),0) }



function HoldingsPerformanceTable({ holdings, transactions }: { holdings: Position[]; transactions: Transaction[] }) {

  const groups = groupPositions(holdings)

  return <Card className="data-card report-detail-card"><div className="card-title-row"><div><span className="section-label">HOLDINGS BREAKDOWN</span><h2>Capital, income and currency contribution</h2></div><Badge>{holdings.length} holdings</Badge></div>{holdings.length ? <div className="table-scroll"><table><thead><tr><th>Holding</th><th>Account</th><th className="numeric">Capital gain</th><th className="numeric">Income return</th><th className="numeric">Currency gain</th><th className="numeric">Total return</th></tr></thead><tbody>{groups.flatMap(([market, rows]) => [<tr className="table-group-row" key={`${market}-head`}><td colSpan={6}>{market}</td></tr>, ...rows.map((h) => <HoldingNavigationRow symbol={h.symbol} key={`${h.account_name}-${h.symbol}`}><td><span className="asset-cell compact"><HoldingLogo symbol={h.symbol} assetClass={h.asset_class} size={29} /><span><strong>{h.symbol}</strong><small>{h.name}</small></span></span></td><td>{h.account_name}</td><td className={`numeric ${holdingCapitalGain(h) >= 0 ? 'positive' : 'negative'}`}>{money(holdingCapitalGain(h))}</td><td className="numeric">{money(incomeForHolding(h, transactions))}</td><td className={`numeric ${(holdingCurrencyGain(h) || 0) >= 0 ? '' : 'negative'}`}>{holdingCurrencyGain(h) === null ? 'Not available' : money(holdingCurrencyGain(h)!)}</td><td className={`numeric ${h.unrealised_gain_aud >= 0 ? 'positive' : 'negative'}`}><strong>{money(h.unrealised_gain_aud + incomeForHolding(h, transactions))}</strong><small>{percent(h.cost_aud ? (h.unrealised_gain_aud + incomeForHolding(h, transactions)) / h.cost_aud * 100 : 0)}</small></td></HoldingNavigationRow>)])}</tbody></table></div> : <EmptyState icon={TrendingUp} title="No holdings to break down" description="Your grouped return ledger appears here after the first import."/>}</Card>

}



function Benchmark({ bundle }: { bundle: PortfolioBundle }) {

  const snapshots = bundle.snapshots

  const first = snapshots[0]

  const last = snapshots.at(-1)

  const portfolioReturn = first && last ? ((last.value_aud / first.value_aud) - 1) * 100 : 0

  const benchmarkReturn = first?.benchmark_value_aud && last?.benchmark_value_aud ? ((last.benchmark_value_aud / first.benchmark_value_aud) - 1) * 100 : 0

  const winners = [...bundle.holdings].sort((a, b) => b.return_pct - a.return_pct)
  // Never let the same holding appear in both the best and worst list.
  const rankedCount = Math.min(5, Math.floor(winners.length / 2)) || winners.length

  return <>

    <MetricStrip><Metric label="Entity" value="Portfolio" sub="Recorded values"/><Metric label="Value growth" value={first?.value_aud ? percent(portfolioReturn) : '—'} sub="Includes deposits and withdrawals"/><Metric label="Capital gain" value={percent(summarisePortfolio(bundle).returnPct)} /><Metric label="Income return" value={money(summarisePortfolio(bundle).income)} /><Metric label="Currency gain" value={money(summarisePortfolio(bundle).currencyGain)} sub={summarisePortfolio(bundle).currencyGainComplete ? 'Exchange-rate movement on cost base' : 'Partial — some holdings lack a cost base'}/></MetricStrip>

    <Card className="report-chart-card"><div className="card-title-row"><div><span className="section-label">PORTFOLIO VS BENCHMARK</span><h2>Recorded portfolio and benchmark values</h2></div><Badge tone={portfolioReturn >= benchmarkReturn ? 'success' : 'warning'}>{first?.benchmark_value_aud && last?.benchmark_value_aud ? `${percent(portfolioReturn - benchmarkReturn)} value growth difference` : 'Benchmark unavailable'}</Badge></div>{snapshots.length > 1 ? <div className="report-chart"><ResponsiveContainer><LineChart data={snapshots}><CartesianGrid stroke="var(--line)" vertical={false}/><XAxis dataKey="date" tickFormatter={(value) => date(value, { month: 'short' })}/><YAxis tickFormatter={(value) => `$${Math.round(Number(value) / 1000)}k`} /><Tooltip separator=": " isAnimationActive={false} animationDuration={0} animationEasing="linear" formatter={(value) => money(Number(value))}/><Legend verticalAlign="top" align="right" height={28} iconType="plainline" iconSize={16}/><Line dataKey="value_aud" name="Portfolio" stroke="var(--chart-1)" strokeWidth={2.5} dot={false}/><Line dataKey="benchmark_value_aud" name="Benchmark" stroke="var(--chart-benchmark)" strokeWidth={2} strokeDasharray="5 5" dot={false}/></LineChart></ResponsiveContainer></div> : <EmptyState icon={Scale} title="Benchmark history is building" description="Daily snapshots are required for a like-for-like comparison."/>}</Card>

    <div className="report-two-col"><RankedCard title="Highest holding gains" rows={winners.slice(0, rankedCount)} /><RankedCard title="Lowest holding gains" rows={winners.slice(-rankedCount).reverse()} /></div>

  </>

}



function RankedCard({ title, rows }: { title: string; rows: Position[] }) { return <Card className="ranked-card"><div className="card-title-row"><h2>{title}</h2><span>Capital gain</span></div>{rows.length ? rows.map((row) => <HoldingNavigationItem className="ranked-row" symbol={row.symbol} key={`${title}-${row.symbol}`}><span className="ranked-asset"><HoldingLogo symbol={row.symbol} assetClass={row.asset_class} size={29} /><span className="ranked-asset-copy"><strong>{row.symbol}</strong><small>{row.market || row.account_name}</small></span></span><strong className={row.return_pct >= 0 ? 'positive' : 'negative'}>{percent(row.return_pct)}</strong></HoldingNavigationItem>) : <EmptyState icon={TrendingUp} title="No holdings" description="Rankings appear after positions are imported."/>}</Card> }



function Diversification({ bundle }: { bundle: PortfolioBundle }) {

  const [view, setView] = useState<'provider'|'sector'|'asset_class'>('provider')

  const allocation = allocationBy(bundle.holdings, view)

  const displayAllocation = allocation.map((item) => ({ ...item, name: formatAllocationName(item.name) }))

  const total = summarisePortfolio(bundle).invested

  const concentrationCount = Math.min(3, allocation.length)
  const concentration = allocation.slice(0, concentrationCount).reduce((sum, item) => sum + item.percentage, 0)

  return <>

    <div className="report-toolbar report-subtoolbar"><span>View allocation by</span><div className="segmented"><button className={view === 'provider' ? 'active' : ''} onClick={() => setView('provider')}>Broker</button><button className={view === 'sector' ? 'active' : ''} onClick={() => setView('sector')}>Sector</button><button className={view === 'asset_class' ? 'active' : ''} onClick={() => setView('asset_class')}>Asset class</button></div></div>

    <MetricStrip><Metric label="Categories" value={allocation.length} /><Metric label="Largest allocation" value={displayAllocation[0]?.name || '—'} sub={allocation[0] ? share(allocation[0].percentage) : 'No data'} /><Metric label={concentrationCount === 1 ? 'Largest share' : `Top ${concentrationCount} concentration`} value={share(concentration)} /><Metric label="Total value" value={money(total)} /></MetricStrip>

    <div className="report-two-col"><Card className="report-chart-card"><div className="card-title-row"><h2>Portfolio allocation</h2></div>{allocation.length ? <div className="donut-layout"><div className="donut-chart"><ResponsiveContainer><PieChart><Pie data={displayAllocation} dataKey="value" nameKey="name" innerRadius="62%" outerRadius="86%" stroke="var(--surface)" strokeWidth={2} isAnimationActive={false}>{displayAllocation.map((_, index) => <Cell key={index} fill={colours[index % colours.length]}/>)}</Pie><Tooltip separator=": " formatter={(value) => money(Number(value))}/></PieChart></ResponsiveContainer><span><strong>{money(total)}</strong><small>Invested</small></span></div><div className="allocation-list">{displayAllocation.map((item, index) => <div key={item.name}><span><i style={{ background: colours[index % colours.length] }}/>{item.name}</span><strong>{share(item.percentage)}</strong><small>{money(item.value)}</small></div>)}</div></div> : <EmptyState icon={TrendingUp} title="No allocation data" description="Import holdings to calculate portfolio concentration."/>}</Card><HoldingsWeightTable holdings={[...bundle.holdings]} total={total}/></div>

  </>

}



function HoldingsWeightTable({ holdings, total }: { holdings: Position[]; total: number }) { return <Card className="data-card report-detail-card"><div className="card-title-row"><h2>Holdings breakdown</h2></div>{holdings.length ? <div className="table-scroll"><table><thead><tr><th>Holding</th><th className="numeric">Weighting</th><th className="numeric">Value</th></tr></thead><tbody>{[...holdings].sort((a,b) => b.value_aud-a.value_aud).map((h) => <HoldingNavigationRow symbol={h.symbol} key={`${h.account_name}-${h.symbol}`}><td><span className="asset-cell compact"><HoldingLogo symbol={h.symbol} assetClass={h.asset_class} size={29} /><span><strong>{h.symbol}</strong><small>{h.name}</small></span></span></td><td className="numeric">{share(total ? h.value_aud/total*100 : 0)}</td><td className="numeric">{money(h.value_aud)}</td></HoldingNavigationRow>)}</tbody></table></div> : <EmptyState icon={TrendingUp} title="No holdings" description="Allocation details will appear here."/>}</Card> }



function Growth({ bundle }: { bundle: PortfolioBundle }) {

  const summary = summarisePortfolio(bundle)

  const [target, setTarget] = useState(250000)

  const [displayMode, setDisplayMode] = useState<'amount' | 'percent'>('amount')

  const [chartMode, setChartMode] = useState<'line' | 'bar'>('line')

  const progress = target ? Math.min(100, summary.total / target * 100) : 0

  const chartData = useMemo(() => {

    const first = bundle.snapshots[0]?.value_aud || 0

    const invested = bundle.snapshots[0]?.invested_aud || 0

    return bundle.snapshots.map((snapshot) => ({

      ...snapshot,

      value: displayMode === 'amount' ? snapshot.value_aud : first ? ((snapshot.value_aud - first) / first) * 100 : 0,

      invested: displayMode === 'amount' ? snapshot.invested_aud : invested ? ((snapshot.invested_aud - invested) / invested) * 100 : 0,

    }))

  }, [bundle.snapshots, displayMode])

  const formatGrowthValue = (value: number) => displayMode === 'amount' ? money(value) : `${value.toFixed(1)}%`

  return <>

    <MetricStrip><Metric label="Portfolio value" value={money(summary.total)} /><Metric label="Capital gain" value={money(summary.unrealised)} sub={percent(summary.returnPct)} /><Metric label="Income return" value={money(summary.income)} /><Metric label="Target progress" value={share(progress)} /></MetricStrip>

    <Card className="report-chart-card"><div className="card-title-row"><div><span className="section-label">GROWTH HISTORY</span><h2>Portfolio value vs contributed capital</h2></div><div className="segmented" role="group" aria-label="Growth chart display"><button type="button" className={displayMode === 'amount' ? 'active' : ''} aria-pressed={displayMode === 'amount'} onClick={() => setDisplayMode('amount')}>Amount</button><button type="button" className={displayMode === 'percent' ? 'active' : ''} aria-pressed={displayMode === 'percent'} onClick={() => setDisplayMode('percent')}>Percent</button><button type="button" className={chartMode === 'line' ? 'active' : ''} aria-pressed={chartMode === 'line'} onClick={() => setChartMode('line')}>Line</button><button type="button" className={chartMode === 'bar' ? 'active' : ''} aria-pressed={chartMode === 'bar'} onClick={() => setChartMode('bar')}>Bar</button></div></div>{bundle.snapshots.length > 1 ? <div className="report-chart"><ResponsiveContainer>{chartMode === 'line' ? <LineChart data={chartData} margin={{ top: 10, right: 12, bottom: 4, left: 18 }}><CartesianGrid stroke="var(--line)" vertical={false}/><XAxis dataKey="date" tickFormatter={(value) => date(value, { month: 'short' })}/><YAxis width={68} tickMargin={8} tickFormatter={(value) => formatGrowthValue(Number(value))}/><Tooltip separator=": " formatter={(value) => formatGrowthValue(Number(value))}/><Legend verticalAlign="top" align="right" height={28} iconType="plainline" iconSize={16}/><Line dataKey="value" name="Portfolio value" stroke="var(--chart-1)" strokeWidth={2.8} dot={false}/><Line dataKey="invested" name="Contributed capital" stroke="var(--chart-benchmark)" strokeWidth={1.5} strokeDasharray="5 6" dot={false}/></LineChart> : <BarChart data={chartData} margin={{ top: 10, right: 12, bottom: 4, left: 18 }}><CartesianGrid stroke="var(--line)" vertical={false}/><XAxis dataKey="date" tickFormatter={(value) => date(value, { month: 'short' })}/><YAxis width={68} tickMargin={8} tickFormatter={(value) => formatGrowthValue(Number(value))}/><Tooltip separator=": " formatter={(value) => formatGrowthValue(Number(value))}/><Legend verticalAlign="top" align="right" height={28} iconSize={11}/><Bar dataKey="value" name="Portfolio value" fill="var(--chart-1)" radius={[4,4,0,0]}/><Bar dataKey="invested" name="Contributed capital" fill="var(--chart-benchmark)" radius={[4,4,0,0]}/></BarChart>}</ResponsiveContainer></div> : <EmptyState icon={TrendingUp} title="Growth history is building" description="Portfolio snapshots will appear here as prices sync."/>}</Card>

    <Card className="goal-card"><div><span className="section-label">GOAL</span><h2>Portfolio target</h2><p>Set a target to see how your current portfolio value compares. This view does not forecast future returns.</p></div><label>Target value<input type="number" min="1" value={target} onChange={(event) => setTarget(Number(event.target.value))}/></label><div className="goal-progress"><span style={{ width: `${progress}%` }}/></div><strong>{money(summary.total)} of {money(target)}</strong></Card>

    <HoldingsPerformanceTable holdings={bundle.holdings} transactions={bundle.transactions}/>

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

    <Card className="report-chart-card"><div className="card-title-row"><h2>Income by holding</h2></div>{sources.length ? <div className="report-chart short"><ResponsiveContainer><BarChart data={sources.map(([name,value]) => ({name,value}))}><CartesianGrid stroke="var(--line)" vertical={false}/><XAxis dataKey="name"/><YAxis tickFormatter={(value)=>money(Number(value),'AUD',0)}/><Tooltip separator=": " formatter={(value)=>money(Number(value))}/><Bar dataKey="value" fill="var(--chart-1)" radius={[4,4,0,0]}/></BarChart></ResponsiveContainer></div> : <EmptyState icon={CalendarDays} title="No income recorded" description="Dividend, distribution and interest payments appear here."/>}</Card>

    <Card className="data-card report-detail-card"><div className="card-title-row"><h2>Holdings breakdown</h2><Badge>{income.length} payments</Badge></div>{income.length ? <div className="table-scroll"><table><thead><tr><th>Symbol</th><th>Date paid</th><th>Type</th><th>Description</th><th className="numeric">Total</th></tr></thead><tbody>{income.map((item,index) => <HoldingNavigationRow symbol={item.symbol} key={`${item.date}-${item.symbol}-${index}`}><td><span className="asset-cell compact"><HoldingLogo symbol={item.symbol || 'CASH'} size={29} /><span><strong>{item.symbol || 'Cash'}</strong><small>{item.account_name}</small></span></span></td><td>{date(item.date)}</td><td><Badge tone="success">{item.type}</Badge></td><td>{item.description || 'Income payment'}</td><td className="numeric positive">{money(item.aud)}</td></HoldingNavigationRow>)}</tbody></table></div> : <EmptyState icon={CalendarDays} title="No income events" description="Imported payment records appear in this ledger."/>}</Card>

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

    <DailyMovementCalendar bundle={bundle} />

    <Card className="report-chart-card"><div className="card-title-row"><div><span className="section-label">NEXT 12 MONTHS</span><h2>Monthly income</h2></div><Badge tone="warning">Indicative</Badge></div><div className="report-chart short"><ResponsiveContainer><BarChart data={months}><CartesianGrid stroke="var(--line)" vertical={false}/><XAxis dataKey="month"/><YAxis tickFormatter={(value)=>money(Number(value),'AUD',0)}/><Tooltip separator=": " formatter={(value)=>money(Number(value))}/><Bar dataKey="value" fill="var(--chart-1)" radius={[4,4,0,0]}/></BarChart></ResponsiveContainer></div></Card>

    <Card className="data-card report-detail-card"><div className="card-title-row"><div><span className="section-label">SCHEDULE</span><h2>Upcoming payments</h2></div><span>Estimated from prior recorded payments</span></div>{projected.length ? <div className="table-scroll"><table><thead><tr><th>Holding</th><th>Estimated ex-date</th><th>Payment date</th><th>Status</th><th className="numeric">Net amount</th></tr></thead><tbody>{projected.map((item) => <HoldingNavigationRow symbol={item.symbol} key={item.id}><td><span className="asset-cell compact"><HoldingLogo symbol={item.symbol || 'CASH'} size={29} /><span><strong>{item.symbol || 'Cash'}</strong><small>{item.description}</small></span></span></td><td>{date(item.date)}</td><td>{date(item.date)}</td><td><Badge tone="warning">Estimated</Badge></td><td className="numeric positive">{money(item.aud)}</td></HoldingNavigationRow>)}</tbody></table></div> : <EmptyState icon={CalendarDays} title="No upcoming payments to estimate" description="A schedule appears once income history has been imported."/>}</Card>

  </>

}



type CalendarMovement = { date: string; value: number; source: 'snapshot' | 'activity' | 'market' }



function DailyMovementCalendar({ bundle }: { bundle: PortfolioBundle }) {

  const movements = useMemo(() => buildCalendarMovements(bundle), [bundle])

  const [month, setMonth] = useState(() => {

    const latest = movements.at(-1)?.date

    const anchor = latest ? new Date(`${latest}T00:00:00`) : new Date()

    return new Date(anchor.getFullYear(), anchor.getMonth(), 1)

  })

  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  const movementMap = useMemo(() => new Map(movements.map((item) => [item.date, item])), [movements])

  const days = useMemo(() => calendarDays(month), [month])

  const monthKey = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}`

  const monthMovements = movements.filter((item) => item.date.startsWith(monthKey))

  const positiveTotal = monthMovements.filter((item) => item.value > 0).reduce((sum, item) => sum + item.value, 0)

  const negativeTotal = monthMovements.filter((item) => item.value < 0).reduce((sum, item) => sum + item.value, 0)

  const selectedMovement = selectedDate ? movementMap.get(selectedDate) : undefined

  const selectedLabel = selectedDate ? date(`${selectedDate}T00:00:00`, { day: 'numeric', month: 'long', year: 'numeric' }) : 'Select a day'

  const moveMonth = (amount: number) => {

    setMonth((current) => new Date(current.getFullYear(), current.getMonth() + amount, 1))

    setSelectedDate(null)

  }



  return <Card className="daily-calendar-card">

    <div className="daily-calendar-header">

      <div>

        <span className="section-label">PORTFOLIO MOVEMENT</span>

        <h2>Daily portfolio movement</h2>

        <p>See recorded changes by day. Select a day to inspect the value behind it.</p>

      </div>

      <div className="daily-calendar-summary" aria-label="Monthly movement summary">

        <span><i className="calendar-positive-dot" />Positive <strong>{money(positiveTotal)}</strong></span>

        <span><i className="calendar-negative-dot" />Negative <strong>{money(negativeTotal)}</strong></span>

      </div>

    </div>

    <div className="daily-calendar-toolbar">

      <div className="daily-calendar-month-nav">

        <button type="button" aria-label="Previous month" onClick={() => moveMonth(-1)}><ChevronLeft size={16} /></button>

        <strong>{month.toLocaleDateString('en-AU', { month: 'long', year: 'numeric' })}</strong>

        <button type="button" aria-label="Next month" onClick={() => moveMonth(1)}><ChevronRight size={16} /></button>

      </div>

      <button type="button" className="daily-calendar-today" onClick={() => { const today = new Date(); setMonth(new Date(today.getFullYear(), today.getMonth(), 1)); setSelectedDate(null) }}>Today</button>

    </div>

    <div className="daily-calendar-grid daily-calendar-weekdays" aria-hidden="true">{['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((item) => <span key={item}>{item}</span>)}</div>

    <div className="daily-calendar-grid daily-calendar-days" role="grid" aria-label={`${month.toLocaleDateString('en-AU', { month: 'long', year: 'numeric' })} portfolio movement`}>

      {days.map((day) => {

        const key = calendarDateKey(day)

        const movement = movementMap.get(key)

        const inMonth = day.getMonth() === month.getMonth()

        const tone = movement ? movement.value >= 0 ? 'positive' : 'negative' : ''

        return <button type="button" role="gridcell" key={key} data-date={key} className={`daily-calendar-day ${inMonth ? '' : 'is-adjacent'} ${tone} ${selectedDate === key ? 'is-selected' : ''}`} aria-selected={selectedDate === key} aria-label={`${selectedLabelForDay(day)}${movement ? `, ${signedMoney(movement.value)}` : ', no recorded movement'}`} tabIndex={inMonth ? 0 : -1} onClick={() => { if (inMonth) setSelectedDate(key) }}>

          <span className="daily-calendar-day-number">{day.getDate()}</span>

          {movement && <strong>{signedMoney(movement.value)}</strong>}

          {movement && <i aria-hidden="true" />}

        </button>

      })}

    </div>

    <div className="daily-calendar-detail" aria-live="polite">

      <div><span>{selectedLabel}</span><strong className={selectedMovement ? selectedMovement.value >= 0 ? 'positive' : 'negative' : ''}>{selectedMovement ? signedMoney(selectedMovement.value) : 'No recorded movement'}</strong></div>

      <p>{selectedMovement ? movementSourceLabel(selectedMovement.source) : 'Choose a day with a coloured cell to inspect the recorded movement.'}</p>

    </div>

  </Card>

}



function buildCalendarMovements(bundle: PortfolioBundle): CalendarMovement[] {

  const movements = new Map<string, CalendarMovement>()

  const snapshots = [...bundle.snapshots].sort((a, b) => a.date.localeCompare(b.date))

  snapshots.forEach((snapshot, index) => {

    if (!index) return

    const previous = snapshots[index - 1]

    addCalendarMovement(movements, calendarDateKey(new Date(`${snapshot.date}T00:00:00`)), Number(snapshot.value_aud || 0) - Number(previous.value_aud || 0), 'snapshot')

  })

  bundle.transactions.forEach((item) => {

    const key = calendarDateKey(new Date(item.date))

    if (movements.has(key)) return

    addCalendarMovement(movements, key, transactionMovement(item), 'activity')

  })

  const latestMarketDate = bundle.holdings.map((item) => item.as_of).filter((item): item is string => Boolean(item)).sort().at(-1)

  const latestMarketMove = bundle.holdings.reduce((sum, item) => sum + Number(item.day_change_aud || 0), 0)

  if (latestMarketMove && latestMarketDate) addCalendarMovement(movements, calendarDateKey(new Date(latestMarketDate)), latestMarketMove, 'market')

  if (!movements.size && latestMarketMove) addCalendarMovement(movements, calendarDateKey(new Date()), latestMarketMove, 'market')

  return [...movements.values()].filter((item) => Math.abs(item.value) >= 0.005).sort((a, b) => a.date.localeCompare(b.date))

}



function addCalendarMovement(map: Map<string, CalendarMovement>, dateValue: string, value: number, source: CalendarMovement['source']) {

  if (!Number.isFinite(value) || Math.abs(value) < 0.005) return

  const existing = map.get(dateValue)

  if (!existing) map.set(dateValue, { date: dateValue, value, source })

  else if (existing.source === source) existing.value += value

}



function transactionMovement(item: Transaction) {

  const value = Math.abs(Number(item.amount || 0) * Number(item.fx_rate || 1))

  const type = String(item.type).toUpperCase()

  if (['BUY', 'WITHDRAWAL', 'FEE', 'TAX'].includes(type)) return -value

  if (['SELL', 'DIVIDEND', 'DISTRIBUTION', 'INTEREST', 'DEPOSIT'].includes(type)) return value

  return Number(item.amount || 0) * Number(item.fx_rate || 1)

}



function calendarDays(month: Date) {

  const first = new Date(month.getFullYear(), month.getMonth(), 1)

  const start = new Date(month.getFullYear(), month.getMonth(), 1 - first.getDay())

  return Array.from({ length: 42 }, (_, index) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + index))

}



function calendarDateKey(value: Date) {

  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`

}



function selectedLabelForDay(value: Date) {

  return value.toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

}



function signedMoney(value: number) {

  return `${value >= 0 ? '+' : ''}${money(value, 'AUD', 0)}`

}



function movementSourceLabel(source: CalendarMovement['source']) {

  if (source === 'snapshot') return 'Change between recorded portfolio snapshots.'

  if (source === 'activity') return 'Recorded account activity converted to AUD.'

  return 'Latest holding movement recorded for this date.'

}



function enrichIncome(transactions: Transaction[]) { return incomeTransactions(transactions).map((item) => ({ ...item, aud: Math.abs(item.amount * item.fx_rate) })).sort((a,b) => b.date.localeCompare(a.date)) }

function groupPositions(holdings: Position[]) { const map = new Map<string,Position[]>(); holdings.forEach((h)=>{const key=h.market||'Other';map.set(key,[...(map.get(key)||[]),h])}); return [...map.entries()] }

