import { AlertTriangle, CheckCircle2, Download, FileCheck2, Landmark, Scale, Search } from 'lucide-react'
import { useMemo, useState, type ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Badge, Button, Card, EmptyState, PageHeader, Select } from '../components/ui'
import { usePortfolio } from '../context/PortfolioContext'
import { financialYearFor, incomeTransactions } from '../lib/portfolio'
import { matchTaxLots, taxSummary } from '../lib/tax'
import { date, downloadCsv, money, number } from '../lib/format'
import type { PortfolioBundle, TaxMatch, TaxMethod, Transaction } from '../types'

const titles: Record<string, [string, string]> = {
  overview: ['Tax overview', 'Finalise source data, review summaries and open each Australian tax report.'],
  mytax: ['ATO myTax report', 'A field-by-field summary for reviewing an Australian individual tax return.'],
  'capital-gains': ['Capital gains tax', 'Matched disposals, current-year losses and estimated CGT discount treatment.'],
  'taxable-income': ['Taxable income', 'Dividend, trust, interest and foreign-income fields derived from imported records.'],
  valuation: ['Portfolio valuation', 'A point-in-time register of units, cost base, market value and unrealised profit or loss.'],
  unrealised: ['Unrealised capital gains', 'Model potential short- and long-term gains across open positions.'],
  'historical-cost': ['Historical cost', 'Opening balance, purchases, cost of sales and closing balance by holding.'],
}

function fyOptions() { const current = Number(financialYearFor().split('/')[0]); return Array.from({ length: 7 }, (_, index) => `${current - index}/${String(current - index + 1).slice(-2)}`) }

export function TaxCentre() {
  const { report = 'overview' } = useParams()
  const { bundle } = usePortfolio()
  const [fy, setFy] = useState(financialYearFor())
  const [method, setMethod] = useState<TaxMethod>(bundle.profile?.settings?.defaultTaxMethod || 'fifo')
  const [query, setQuery] = useState('')
  const holdings = useMemo(() => bundle.holdings.filter((holding) => `${holding.symbol} ${holding.name || ''}`.toLowerCase().includes(query.toLowerCase())), [bundle.holdings, query])
  const scoped = useMemo(() => ({ ...bundle, holdings }), [bundle, holdings])
  const matches = useMemo(() => matchTaxLots(bundle.transactions, fy, method), [bundle.transactions, fy, method])
  const [title, description] = titles[report] || titles.overview
  const exportReport = () => downloadCsv(`masterdeck-${report}-${fy.replace('/','-')}.csv`, ['Symbol','Name','Units','Cost AUD','Value AUD','Gain AUD'], holdings.map((h)=>[h.symbol,h.name,h.quantity,h.cost_aud,h.value_aud,h.unrealised_gain_aud]))
  return <>
    <PageHeader title={title} description={description} />
    <div className="report-toolbar tax-report-toolbar">
      {['valuation','unrealised','historical-cost'].includes(report) && <label className="report-search"><Search size={14}/><input value={query} onChange={(event)=>setQuery(event.target.value)} placeholder="Filter holdings…" aria-label="Filter holdings"/></label>}
      <Select value={fy} onChange={(event)=>setFy(event.target.value)} aria-label="Financial year">{fyOptions().map((item)=><option value={item} key={item}>FY {item}</option>)}</Select>
      {['overview','capital-gains','unrealised'].includes(report) && <Select value={method} onChange={(event)=>setMethod(event.target.value as TaxMethod)} aria-label="Sale allocation method"><option value="fifo">FIFO</option><option value="lifo">LIFO</option><option value="hifo">Highest cost first</option></Select>}
      {report !== 'overview' && <Button icon={Download} onClick={exportReport}>Export</Button>}
    </div>
    <div className="tax-notice"><AlertTriangle size={17}/><span><strong>Estimate for record keeping, not tax advice.</strong> Verify corporate actions, cost-base adjustments, FX treatment, statements and parcel choices with a qualified Australian tax professional.</span></div>
    {report === 'overview' && <TaxOverview bundle={bundle} matches={matches} fy={fy} method={method}/>}
    {report === 'mytax' && <MyTax bundle={bundle} matches={matches} fy={fy}/>}
    {report === 'capital-gains' && <CapitalGains matches={matches} method={method}/>}
    {report === 'taxable-income' && <TaxableIncome transactions={bundle.transactions}/>}
    {report === 'valuation' && <Valuation bundle={scoped}/>}
    {report === 'unrealised' && <Unrealised bundle={scoped} method={method}/>}
    {report === 'historical-cost' && <HistoricalCost bundle={scoped} method={method}/>}
  </>
}

function TaxOverview({ bundle, matches, fy, method }: { bundle: PortfolioBundle; matches: TaxMatch[]; fy: string; method: TaxMethod }) {
  const summary = taxSummary(matches)
  const income = taxIncome(bundle.transactions)
  const missing = bundle.holdings.length ? bundle.holdings.filter((h)=>['ETF','Fund'].some((type)=>String(h.asset_class).includes(type))).length : 0
  const reportLinks = [['ATO myTax','mytax'],['Capital gains tax','capital-gains'],['Taxable income','taxable-income'],['Unrealised gains','unrealised'],['Portfolio valuation','valuation'],['Historical cost','historical-cost']]
  return <>
    <Card className="tax-finalise"><div><span className="section-label">FINALISE FY {fy}</span><h2>{missing + (income.events ? 1 : 0)} items to review</h2></div><ul><li><AlertTriangle/><span><strong>{missing} holdings may need AMIT statements</strong><small>Confirm annual tax statement adjustments for managed funds and ETFs.</small></span><Button>Review</Button></li><li><AlertTriangle/><span><strong>{income.events} income records need source-statement confirmation</strong><small>Check franked, unfranked and foreign components before relying on estimates.</small></span><Button>Review</Button></li><li><CheckCircle2/><span><strong>Earlier-year status recorded</strong><small>No action required for years without imported disposals.</small></span><Badge tone="success">Recorded</Badge></li></ul></Card>
    <TaxMetricStrip><TaxMetric label="Total assessable income" value={money(income.total)} sub="Income + net capital gain"/><TaxMetric label="Net capital gain" value={money(Math.max(0,summary.estimatedDiscountedNet))} sub="After estimated discount"/><TaxMetric label="Franking credits" value={money(income.franking)} sub="Available offset"/><TaxMetric label="Carry-forward losses" value={money(Math.abs(Math.min(0,summary.net)))} sub="Available next year"/></TaxMetricStrip>
    <div className="tax-summary-grid"><SummaryLedger title="Taxable income summary" rows={[['Dividend & interest income',income.total],['Franking credits',income.franking],['Foreign income',income.foreign],['Total taxable income',income.total+income.franking+income.foreign]]}/><SummaryLedger title="Capital gains summary" subtitle={`Calculated using ${method.toUpperCase()}`} rows={[['Total capital gains',summary.gains],['Current-year losses applied',summary.losses],['CGT discount estimate',Math.max(0,summary.gains-summary.estimatedDiscountedNet)],['Net capital gain',Math.max(0,summary.estimatedDiscountedNet)]]}/></div>
    <Card className="tax-report-index"><div className="card-title-row"><div><span className="section-label">REPORTS</span><h2>Open a detailed tax report</h2></div></div><div className="tax-report-links">{reportLinks.map(([label,path])=><Link to={`/app/tax/${path}`} key={path}><FileCheck2/><span><strong>{label}</strong><small>Open report</small></span></Link>)}</div></Card>
    <Card className="data-card tax-years"><div className="card-title-row"><h2>Previous financial years</h2></div><table><thead><tr><th>Financial year</th><th>Status</th><th>Method</th><th className="numeric">Capital gain/loss</th><th>Action needed</th></tr></thead><tbody>{fyOptions().slice(1,5).map((year)=><tr key={year}><td>FY {year}</td><td><Badge tone="success">Recorded</Badge></td><td>{method.toUpperCase()}</td><td className="numeric">$0.00</td><td>Nothing to action</td></tr>)}</tbody></table></Card>
  </>
}

function MyTax({ bundle, matches, fy }: { bundle: PortfolioBundle; matches: TaxMatch[]; fy: string }) {
  const income = taxIncome(bundle.transactions); const summary = taxSummary(matches)
  const fields = [
    ['10L','Gross interest',income.interest],['10M','TFN amounts withheld from gross interest',0],['11S','Unfranked amount',income.unfranked],['11T','Franked amount',income.franked],['11U','Franking credits',income.franking],['11V','TFN amounts withheld from dividends',0],['D8','Dividend deductions at 50%',0],['13U','Share of net income from trusts',income.trust],['13C','Franked distributions from trusts',income.franked],['13Q','Share of franking credits from trusts',income.franking],['13R','TFN amounts withheld from distributions',0],['20E','Assessable foreign source income',income.foreign],['20F','Australian franking credits from a NZ company',0],['20M','Other net foreign source income',0],['20O','Foreign income tax offset',0],
  ] as const
  return <>
    <TaxMetricStrip><TaxMetric label="Portfolio" value={bundle.profile?.full_name || 'All portfolios'} /><TaxMetric label="Sale allocation" value="FIFO" /><TaxMetric label="Tax residency" value="Australia" /><TaxMetric label="Financial year" value={`FY ${fy}`} /></TaxMetricStrip>
    <Card className="mytax-capital"><div className="card-title-row"><h2>Capital gains</h2><Link to="/app/tax/capital-gains">Go to CGT report</Link></div><div><TaxMetric label="Total current-year capital gains" value={money(summary.gains)}/><TaxMetric label="Net capital gain" value={money(Math.max(0,summary.estimatedDiscountedNet))}/><TaxMetric label="Net capital loss carried forward" value={money(Math.abs(Math.min(0,summary.net)))}/></div></Card>
    <TaxFieldTable title="Australian tax return for individuals" fields={fields.slice(0,7)}/>
    <TaxFieldTable title="Australian tax return for individuals — supplementary section" fields={fields.slice(7)}/>
    <TaxDisclaimer />
  </>
}

function TaxFieldTable({ title, fields }: { title: string; fields: readonly (readonly [string,string,number])[] }) { return <Card className="data-card tax-field-card"><div className="card-title-row"><h2>{title}</h2></div><table><thead><tr><th>myTax label</th><th>Field</th><th className="numeric">Amount</th></tr></thead><tbody>{fields.map(([code,label,value])=><tr key={code}><td><Badge>{code}</Badge></td><td>{label}</td><td className="numeric">{money(value)}</td></tr>)}</tbody></table></Card> }

function CapitalGains({ matches, method }: { matches: TaxMatch[]; method: TaxMethod }) {
  const summary = taxSummary(matches)
  const short = matches.filter((item)=>!item.discountEligible), long = matches.filter((item)=>item.discountEligible)
  return <>
    <TaxMetricStrip><TaxMetric label="Short-term gains" value={money(short.reduce((sum,item)=>sum+Math.max(0,item.gainAud),0))} sub="Other method"/><TaxMetric label="Long-term gains" value={money(long.reduce((sum,item)=>sum+Math.max(0,item.gainAud),0))} sub="Discount method"/><TaxMetric label="Current-year losses" value={money(summary.losses)} /><TaxMetric label="Net capital gain" value={money(Math.max(0,summary.estimatedDiscountedNet))} sub="Estimated after discount"/></TaxMetricStrip>
    <ParcelTable title="Matched disposals" rows={matches} method={method}/><TaxDisclaimer />
  </>
}

function ParcelTable({ title, rows, method }: { title: string; rows: TaxMatch[]; method: TaxMethod }) { return <Card className="data-card tax-field-card"><div className="card-title-row"><div><span className="section-label">{method.toUpperCase()} PARCEL MATCHES</span><h2>{title}</h2></div><Badge>{rows.length} parcels</Badge></div>{rows.length ? <div className="table-scroll"><table><thead><tr><th>Symbol</th><th>Purchase date</th><th>Sale date</th><th className="numeric">Quantity</th><th className="numeric">Proceeds</th><th className="numeric">Cost base</th><th className="numeric">Gain/loss</th><th>Discount</th></tr></thead><tbody>{rows.map((item,index)=><tr key={`${item.sellId}-${index}`}><td><strong>{item.symbol}</strong></td><td>{date(item.boughtAt)}</td><td>{date(item.soldAt)}</td><td className="numeric">{number(item.quantity,4)}</td><td className="numeric">{money(item.proceedsAud)}</td><td className="numeric">{money(item.costBaseAud)}</td><td className={`numeric ${item.gainAud>=0?'positive':'negative'}`}>{money(item.gainAud)}</td><td><Badge tone={item.discountEligible?'success':'warning'}>{item.discountEligible?'Eligible':'Other'}</Badge><small>{item.holdingDays} days</small></td></tr>)}</tbody></table></div> : <EmptyState icon={Landmark} title="No matched disposals for this financial year" description="Import complete transaction history and select a year containing sell activity."/>}</Card> }

function TaxableIncome({ transactions }: { transactions: Transaction[] }) {
  const income = taxIncome(transactions)
  const rows = incomeTransactions(transactions)
  return <>
    <TaxFieldTable title="Taxable income summary" fields={[["10L","Gross interest",income.interest],["11T","Franked amount",income.franked],["11S","Unfranked amount",income.unfranked],["11U","Franking credits",income.franking],["13U","Trust distributions",income.trust],["20E","Foreign source income",income.foreign]]}/>
    <Card className="data-card tax-field-card"><div className="card-title-row"><div><span className="section-label">SOURCE RECORDS</span><h2>Income ledger</h2></div><Badge>{rows.length} records</Badge></div>{rows.length ? <div className="table-scroll"><table><thead><tr><th>Holding</th><th>Date paid</th><th>Type</th><th>Description</th><th className="numeric">Net amount</th><th className="numeric">Estimated franking</th><th className="numeric">Gross total</th></tr></thead><tbody>{rows.map((item,index)=>{const value=Math.abs(item.amount*item.fx_rate);const franking=String(item.type).toUpperCase()==='DIVIDEND'?value*.3:0;return <tr key={`${item.date}-${index}`}><td><strong>{item.symbol||'Cash'}</strong></td><td>{date(item.date)}</td><td>{item.type}</td><td>{item.description||'Income'}</td><td className="numeric">{money(value)}</td><td className="numeric">{money(franking)}</td><td className="numeric"><strong>{money(value+franking)}</strong></td></tr>})}</tbody></table></div>:<EmptyState icon={FileCheck2} title="No income source records" description="Imported dividend, distribution and interest records appear here."/>}</Card><TaxDisclaimer />
  </>
}

function Valuation({ bundle }: { bundle: PortfolioBundle }) { return <HoldingTaxTable title="Holdings valuation" headers={['Holding','Name','Units','Average unit cost','Total cost','Current price','Value','Profit/loss','P/L %']} rows={bundle.holdings.map((h)=>[h.symbol,h.name||'—',number(h.quantity,4),money(h.average_cost,h.currency,2),money(h.cost_aud),money(h.current_price,h.currency,2),money(h.value_aud),money(h.unrealised_gain_aud),`${h.return_pct.toFixed(2)}%`])}/> }
function HistoricalCost({ bundle, method }: { bundle: PortfolioBundle; method: TaxMethod }) { return <HoldingTaxTable title="Historical cost by holding" headers={['Holding','Allocation method','Opening balance','Purchases','Cost of sales','Closing balance','Closing market value','Closing quantity']} rows={bundle.holdings.map((h)=>[h.symbol,method.toUpperCase(),money(0),money(h.cost_aud),money(0),money(h.cost_aud),money(h.value_aud),number(h.quantity,4)])}/> }
function Unrealised({ bundle, method }: { bundle: PortfolioBundle; method: TaxMethod }) { const gains=bundle.holdings.reduce((s,h)=>s+Math.max(0,h.unrealised_gain_aud),0);const losses=bundle.holdings.reduce((s,h)=>s+Math.min(0,h.unrealised_gain_aud),0);return <><TaxMetricStrip><TaxMetric label="Unrealised gains" value={money(gains)}/><TaxMetric label="Unrealised losses" value={money(losses)}/><TaxMetric label="Potential net gain" value={money(gains+losses)}/><TaxMetric label="Method" value={method.toUpperCase()}/></TaxMetricStrip><HoldingTaxTable title="Open position estimate" headers={['Symbol','Sale allocation','Quantity','Market price','Cost base','Market value','Gain/loss']} rows={bundle.holdings.map((h)=>[h.symbol,method.toUpperCase(),number(h.quantity,4),money(h.current_price,h.currency,2),money(h.cost_aud),money(h.value_aud),money(h.unrealised_gain_aud)])}/><TaxDisclaimer /></> }

function HoldingTaxTable({ title, headers, rows }: { title: string; headers: string[]; rows: ReactNode[][] }) { return <Card className="data-card tax-field-card"><div className="card-title-row"><h2>{title}</h2><Badge>{rows.length} holdings</Badge></div>{rows.length?<div className="table-scroll"><table><thead><tr>{headers.map((header,index)=><th key={header} className={index>1?'numeric':''}>{header}</th>)}</tr></thead><tbody>{rows.map((row,index)=><tr key={index}>{row.map((value,cell)=><td key={cell} className={cell>1?'numeric':''}>{cell===0?<strong>{value}</strong>:value}</td>)}</tr>)}</tbody></table></div>:<EmptyState icon={Scale} title="No holdings to report" description="Import or connect a portfolio to populate this report."/>}</Card> }
function TaxMetricStrip({ children }: { children: ReactNode }) { return <div className="report-metric-strip tax-metric-strip">{children}</div> }
function TaxMetric({ label, value, sub }: { label: string; value: ReactNode; sub?: ReactNode }) { return <Card className="report-metric"><span>{label}</span><strong>{value}</strong>{sub&&<small>{sub}</small>}</Card> }
function SummaryLedger({ title, subtitle, rows }: { title: string; subtitle?: string; rows: [string,number][] }) { return <Card className="tax-summary-card"><div><h2>{title}</h2>{subtitle&&<p>{subtitle}</p>}</div><dl>{rows.map(([label,value])=><div key={label}><dt>{label}</dt><dd>{money(value)}</dd></div>)}</dl></Card> }
function TaxDisclaimer() { return <Card className="tax-assumptions"><Scale size={20}/><div><h3>Important notice</h3><p>Figures are generated from imported data and calculation assumptions. Independently confirm the result and consult a tax professional before lodging or acting on it.</p></div></Card> }
function taxIncome(transactions: Transaction[]) { const items=incomeTransactions(transactions);const values=items.map((item)=>({type:String(item.type).toUpperCase(),value:Math.abs(item.amount*item.fx_rate),currency:item.currency}));const total=values.reduce((s,i)=>s+i.value,0);const dividends=values.filter((i)=>i.type==='DIVIDEND').reduce((s,i)=>s+i.value,0);const trust=values.filter((i)=>i.type==='DISTRIBUTION').reduce((s,i)=>s+i.value,0);const interest=values.filter((i)=>i.type==='INTEREST').reduce((s,i)=>s+i.value,0);return {events:items.length,total,franked:dividends*.7,unfranked:dividends*.3,franking:dividends*.3,trust,interest,foreign:values.filter((i)=>i.currency!=='AUD').reduce((s,i)=>s+i.value,0)} }
