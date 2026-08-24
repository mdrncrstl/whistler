import { CalendarDays, Download, FileBarChart, Landmark, PieChart as PieChartIcon, Scale, TrendingUp } from 'lucide-react'
import { useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart as RechartsPieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Badge, Button, Card, EmptyState, MetricCard, PageHeader, PrivateMoney, Select } from '../components/ui'
import { usePortfolio } from '../context/PortfolioContext'
import { allocationBy, summarisePortfolio } from '../lib/portfolio'
import { date, downloadCsv, money, percent } from '../lib/format'

const palette = ['#0f766e', '#2563eb', '#7c3aed', '#d97706', '#e11d48', '#64748b']
const titles: Record<string, [string, string]> = {
  performance: ['Performance breakdown', 'Understand the capital, income and currency drivers behind your return.'],
  benchmark: ['Benchmark analysis', 'Compare your portfolio with a market index on the same invested-capital basis.'],
  diversification: ['Diversification', 'See concentration by asset class, sector, market and account.'],
  'income-calendar': ['Income calendar', 'Review recorded distributions and expected cash-flow windows.'],
  mytax: ['ATO myTax report', 'A consolidated Australian tax-year summary ready for review with your accountant.'],
  unrealised: ['Unrealised gains', 'Review open tax lots and estimate potential gains before selling.'],
  valuation: ['Portfolio valuation', 'A point-in-time portfolio register with cost base and market value.'],
}

export function Reports() {
  const { report = 'performance' } = useParams()
  const { bundle } = usePortfolio()
  const summary = useMemo(() => summarisePortfolio(bundle), [bundle])
  const allocation = useMemo(() => allocationBy(bundle.holdings, report === 'diversification' ? 'sector' : 'asset_class'), [bundle.holdings, report])
  const [title, description] = titles[report] || titles.performance
  const income = bundle.transactions.filter((item) => ['DIVIDEND', 'DISTRIBUTION', 'INTEREST'].includes(item.type)).map((item) => ({ ...item, aud: item.amount * item.fx_rate }))
  const exportReport = () => downloadCsv(`masterdeck-${report}.csv`, ['Symbol', 'Account', 'Value AUD', 'Cost AUD', 'Unrealised gain', 'Return %'], bundle.holdings.map((h) => [h.symbol, h.account_name, h.value_aud, h.cost_aud, h.unrealised_gain_aud, h.return_pct]))

  return <>
    <PageHeader title={title} description={description} actions={<div className="page-actions"><Select aria-label="Report period" defaultValue="all"><option value="all">All time</option><option>2025–26 FY</option><option>Last 12 months</option></Select><Button icon={Download} onClick={exportReport}>Export</Button></div>} />
    {report === 'performance' && <Performance bundle={bundle} summary={summary} />}
    {report === 'benchmark' && <Benchmark bundle={bundle} />}
    {report === 'diversification' && <Diversification allocation={allocation} total={summary.invested} />}
    {report === 'income-calendar' && <IncomeCalendar income={income} />}
    {report === 'mytax' && <MyTax income={income} totalGain={summary.unrealised} />}
    {report === 'unrealised' && <HoldingsReport title="Open tax lots" bundle={bundle} unrealised />}
    {report === 'valuation' && <HoldingsReport title="Valuation register" bundle={bundle} />}
  </>
}

function Performance({ bundle, summary }: { bundle: ReturnType<typeof usePortfolio>['bundle']; summary: ReturnType<typeof summarisePortfolio> }) {
  const capital = summary.unrealised
  return <><div className="metric-grid four compact"><MetricCard label="Total return" value={<PrivateMoney value={capital + summary.income} />} change={percent(summary.returnPct)} tone="positive"/><MetricCard label="Capital gain" value={<PrivateMoney value={capital}/>} detail="open positions"/><MetricCard label="Income return" value={<PrivateMoney value={summary.income}/>} detail="recorded cash income"/><MetricCard label="Currency gain" value={<PrivateMoney value={0}/>} detail="isolated FX effect"/></div><Card className="report-chart-card"><div className="card-title-row"><div><span className="section-label">RETURN SERIES</span><h2>Portfolio and benchmark</h2></div><Badge tone="success">Time weighted</Badge></div>{bundle.snapshots.length > 1 ? <div className="report-chart"><ResponsiveContainer><LineChart data={bundle.snapshots}><CartesianGrid stroke="var(--line)" vertical={false}/><XAxis dataKey="date" tickFormatter={(v)=>date(v,{month:'short'})}/><YAxis tickFormatter={(v)=>`$${Math.round(Number(v)/1000)}k`}/><Tooltip formatter={(v)=>money(Number(v))}/><Line dataKey="value_aud" stroke="#0f766e" strokeWidth={2.5} dot={false}/><Line dataKey="benchmark_value_aud" stroke="#7c3aed" strokeDasharray="5 5" dot={false}/></LineChart></ResponsiveContainer></div> : <EmptyState icon={TrendingUp} title="Performance history is building" description="Daily snapshots appear here after account syncs."/>}</Card></>
}

function Benchmark({ bundle }: { bundle: ReturnType<typeof usePortfolio>['bundle'] }) {
  const data = bundle.snapshots.map((s) => ({...s, difference: s.benchmark_value_aud ? s.value_aud - s.benchmark_value_aud : 0}))
  const last = data.at(-1)
  return <div className="report-two-col"><Card className="report-chart-card"><div className="card-title-row"><div><span className="section-label">COMPARISON</span><h2>Portfolio vs S&P/ASX 200</h2></div><Badge tone={(last?.difference || 0)>=0?'success':'error'}>{money(last?.difference || 0)} ahead</Badge></div><div className="report-chart"><ResponsiveContainer><LineChart data={data}><CartesianGrid stroke="var(--line)" vertical={false}/><XAxis dataKey="date" tickFormatter={(v)=>date(v,{month:'short'})}/><YAxis hide/><Tooltip/><Line dataKey="value_aud" stroke="#0f766e" strokeWidth={2.5} dot={false}/><Line dataKey="benchmark_value_aud" stroke="#7c3aed" strokeWidth={2} dot={false}/></LineChart></ResponsiveContainer></div></Card><Card className="report-summary"><Scale/><h2>Benchmark settings</h2><p>Comparison uses the same starting value and excludes the timing effect of deposits and withdrawals.</p><dl><div><dt>Benchmark</dt><dd>S&P/ASX 200</dd></div><div><dt>Method</dt><dd>Time-weighted</dd></div><div><dt>Currency</dt><dd>AUD</dd></div></dl></Card></div>
}

function Diversification({ allocation, total }: { allocation: ReturnType<typeof allocationBy>; total:number }) {
  return <div className="report-two-col"><Card className="report-chart-card"><div className="card-title-row"><div><span className="section-label">EXPOSURE</span><h2>Sector allocation</h2></div></div><div className="donut-layout"><div className="donut-chart"><ResponsiveContainer><RechartsPieChart><Pie data={allocation} dataKey="value" nameKey="name" innerRadius="62%" outerRadius="86%" paddingAngle={2}>{allocation.map((_,i)=><Cell key={i} fill={palette[i%palette.length]}/>)}</Pie><Tooltip formatter={(v)=>money(Number(v))}/></RechartsPieChart></ResponsiveContainer><span><strong>{money(total)}</strong><small>Invested</small></span></div><div className="allocation-list">{allocation.map((a,i)=><div key={a.name}><span><i style={{background:palette[i%palette.length]}}/>{a.name}</span><strong>{a.percentage.toFixed(1)}%</strong><small>{money(a.value)}</small></div>)}</div></div></Card><Card className="report-summary"><PieChartIcon/><h2>Concentration check</h2><p>{allocation[0] ? `${allocation[0].name} is your largest exposure at ${allocation[0].percentage.toFixed(1)}%.` : 'Connect an account to calculate concentration.'}</p><div className="health-meter"><span style={{width:`${Math.min(100,allocation[0]?.percentage||0)}%`}}/></div><small>Lower concentration can reduce single-sector risk.</small></Card></div>
}
function IncomeCalendar({ income }: { income: Array<{date:string; symbol?:string|null; description?:string|null; aud:number}> }) {
  const months = useMemo(()=>Array.from({length:12},(_,i)=>{const d=new Date();d.setMonth(d.getMonth()+i);const key=d.toISOString().slice(0,7);return {month:d.toLocaleDateString('en-AU',{month:'short'}),value:income.filter(x=>x.date.startsWith(key)).reduce((a,b)=>a+b.aud,0)}}),[income])
  return <><Card className="report-chart-card"><div className="card-title-row"><div><span className="section-label">NEXT 12 MONTHS</span><h2>Income by month</h2></div></div><div className="report-chart"><ResponsiveContainer><BarChart data={months}><CartesianGrid stroke="var(--line)" vertical={false}/><XAxis dataKey="month"/><YAxis hide/><Tooltip formatter={(v)=>money(Number(v))}/><Bar dataKey="value" fill="#0f766e" radius={[4,4,0,0]}/></BarChart></ResponsiveContainer></div></Card><Card className="data-card report-ledger"><div className="card-title-row"><div><span className="section-label">RECORDED</span><h2>Income events</h2></div></div>{income.length?<table><thead><tr><th>Date</th><th>Asset</th><th>Description</th><th className="numeric">Amount</th></tr></thead><tbody>{income.map((x,i)=><tr key={i}><td>{date(x.date)}</td><td>{x.symbol||'Cash'}</td><td>{x.description}</td><td className="numeric positive">{money(x.aud)}</td></tr>)}</tbody></table>:<EmptyState icon={CalendarDays} title="No income recorded" description="Dividend and distribution events appear here automatically."/>}</Card></>
}

function MyTax({ income, totalGain }: { income:Array<{aud:number}>; totalGain:number }) {
  const gross=income.reduce((a,b)=>a+b.aud,0)
  const rows=[['Australian dividends',gross],['Franking credits',gross*.3],['Foreign income',0],['Capital gains (estimate)',Math.max(0,totalGain)],['Capital losses applied',0]] as const
  return <><div className="tax-callout"><Landmark/><div><strong>2025–26 Australian tax summary</strong><p>Estimates only. Review parcel selection and source statements before lodging.</p></div><Badge tone="warning">Review required</Badge></div><Card className="data-card"><table><thead><tr><th>myTax section</th><th>Status</th><th className="numeric">Amount</th></tr></thead><tbody>{rows.map(([label,value])=><tr key={label}><td><strong>{label}</strong></td><td><Badge tone={value?'success':'neutral'}>{value?'Calculated':'No data'}</Badge></td><td className="numeric private-value">{money(value)}</td></tr>)}</tbody></table></Card></>
}

function HoldingsReport({ title, bundle, unrealised=false }: { title:string; bundle:ReturnType<typeof usePortfolio>['bundle']; unrealised?:boolean }) {
  return <Card className="data-card"><div className="report-table-title"><FileBarChart/><div><span className="section-label">{unrealised?'TAX PLANNING':'AS OF TODAY'}</span><h2>{title}</h2></div></div>{bundle.holdings.length?<div className="table-scroll"><table><thead><tr><th>Asset</th><th>Account</th><th className="numeric">Quantity</th><th className="numeric">Average cost</th><th className="numeric">Market value</th><th className="numeric">Cost base</th><th className="numeric">{unrealised?'Potential gain':'P&L'}</th></tr></thead><tbody>{bundle.holdings.map(h=><tr key={`${h.account_name}-${h.symbol}`}><td><strong>{h.symbol}</strong><small>{h.name}</small></td><td>{h.account_name}</td><td className="numeric">{h.quantity}</td><td className="numeric">{money(h.average_cost,h.currency,2)}</td><td className="numeric private-value">{money(h.value_aud)}</td><td className="numeric private-value">{money(h.cost_aud)}</td><td className={`numeric private-value ${h.unrealised_gain_aud>=0?'positive':'negative'}`}>{money(h.unrealised_gain_aud)}</td></tr>)}</tbody></table></div>:<EmptyState icon={FileBarChart} title="No holdings to report" description="Import or connect a portfolio first."/>}</Card>
}
