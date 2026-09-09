import { AlertTriangle, Download, FileCheck2, Landmark, Scale, Search } from 'lucide-react'
import { HoldingLogo } from '../components/HoldingLogo'
import { HoldingNavigationRow } from '../components/HoldingNavigation'
import { useMemo, useState, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
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
  valuation: ['Portfolio valuation', 'Current imported holdings, cost base and latest available market values.'],
  unrealised: ['Unrealised capital gains', 'Current unrealised gains and losses based on recorded holding costs.'],
  'historical-cost': ['Recorded cost', 'Current holding costs from imported records. Historical opening and closing balances are not reconstructed.'],
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
  const unmatchedSales = bundle.transactions.filter(t => String(t.type).toUpperCase() === 'SELL' && financialYearFor(new Date(t.date)) === fy).reduce((sum,t) => sum + Math.abs(t.quantity || 0),0) - matches.reduce((sum,m) => sum + m.quantity,0) > 0.000001
  const [title, description] = titles[report] || titles.overview
  const exportReport = () => {
    const filename = `masterdeck-${report}-${fy.replace('/','-')}.csv`
    if (report === 'capital-gains') return downloadCsv(filename, ['Symbol','Bought','Sold','Units','Proceeds AUD','Cost AUD','Gain AUD','Discount eligible','Method'], matches.map(m => [m.symbol,m.boughtAt,m.soldAt,m.quantity,m.proceedsAud,m.costBaseAud,m.gainAud,m.discountEligible,method]))
    if (report === 'taxable-income') return downloadCsv(filename, ['Symbol','Date','Type','Description','Recorded cash AUD','Franking credits','Gross taxable amount'], incomeTransactions(bundle.transactions.filter(t => financialYearFor(new Date(t.date)) === fy)).map(t => [t.symbol,t.date,t.type,t.description,Math.abs(t.amount*t.fx_rate),'Not supplied','Not supplied']))
    return downloadCsv(`masterdeck-${report}-current.csv`, ['Symbol','Name','Units','Recorded cost AUD','Latest value AUD','Unrealised gain AUD'], holdings.map(h => [h.symbol,h.name,h.quantity,h.cost_aud,h.value_aud,h.unrealised_gain_aud]))
  }
  return <>
    <PageHeader title={title} description={description} />
    <div className="report-toolbar tax-report-toolbar">
      {['valuation','unrealised','historical-cost'].includes(report) && <label className="report-search"><Search size={14}/><input value={query} onChange={(event)=>setQuery(event.target.value)} placeholder="Filter holdings…" aria-label="Filter holdings"/></label>}
      {!['valuation','unrealised','historical-cost'].includes(report) && <Select value={fy} onChange={(event)=>setFy(event.target.value)} aria-label="Financial year">{fyOptions().map((item)=><option value={item} key={item}>FY {item}</option>)}</Select>}
      {['overview','capital-gains','mytax'].includes(report) && <Select value={method} onChange={(event)=>setMethod(event.target.value as TaxMethod)} aria-label="Sale allocation method"><option value="fifo">FIFO</option><option value="lifo">LIFO</option><option value="hifo">Highest cost first</option></Select>}
      {!['overview','mytax'].includes(report) && <Button icon={Download} onClick={exportReport}>Export</Button>}
    </div>
    {unmatchedSales && ['overview','mytax','capital-gains'].includes(report) && <p role="alert" className="connection-error">Some sales could not be fully matched to purchase records. These estimates are incomplete. Import the missing purchase history before using this report.</p>}
    {report === 'overview' && <TaxOverview bundle={bundle} matches={matches} fy={fy} method={method}/>}
    {report === 'mytax' && <MyTax bundle={bundle} matches={matches} fy={fy} method={method}/>}
    {report === 'capital-gains' && <CapitalGains matches={matches} method={method}/>}
    {report === 'taxable-income' && <TaxableIncome transactions={bundle.transactions.filter(t => financialYearFor(new Date(t.date)) === fy)}/>}
    {report === 'valuation' && <Valuation bundle={scoped}/>}
    {report === 'unrealised' && <Unrealised bundle={scoped}/>}
    {report === 'historical-cost' && <HistoricalCost bundle={scoped}/>}
  </>
}

function TaxOverview({ bundle, matches, fy, method }: { bundle: PortfolioBundle; matches: TaxMatch[]; fy: string; method: TaxMethod }) {
  const navigate = useNavigate()
  const summary = taxSummary(matches)
  const income = taxIncome(bundle.transactions.filter(t => financialYearFor(new Date(t.date)) === fy))
  const missing = bundle.holdings.length ? bundle.holdings.filter((h)=>['ETF','Fund'].some((type)=>String(h.asset_class).includes(type))).length : 0
  const reportLinks = [['ATO myTax','mytax'],['Capital gains tax','capital-gains'],['Taxable income','taxable-income'],['Unrealised gains','unrealised'],['Portfolio valuation','valuation'],['Recorded cost','historical-cost']]
  return <>
    <Card className="tax-finalise"><div><span className="section-label">FINALISE FY {fy}</span><h2>{missing + (income.events ? 1 : 0)} items to review</h2></div><ul><li><AlertTriangle/><span><strong>{missing} holdings may need AMIT statements</strong><small>Confirm annual tax statement adjustments for managed funds and ETFs.</small></span><Button type="button" onClick={() => navigate('/app/tax/valuation')}>Review</Button></li><li><AlertTriangle/><span><strong>{income.events} income records need source-statement confirmation</strong><small>Check franked, unfranked and foreign components before relying on estimates.</small></span><Button type="button" onClick={() => navigate('/app/tax/taxable-income')}>Review</Button></li><li><AlertTriangle/><span><strong>Check historical coverage</strong><small>Years without imported records have not been verified.</small></span><Badge>Review</Badge></li></ul></Card>
    <TaxMetricStrip><TaxMetric label="Recorded income" value={money(income.total)} sub="Selected financial year"/><TaxMetric label="Net capital gain" value={money(Math.max(0,summary.estimatedDiscountedNet))} sub="After estimated discount"/><TaxMetric label="Franking credits" value="Not supplied" sub="Confirm tax statements"/><TaxMetric label="Carry-forward losses" value={money(Math.abs(Math.min(0,summary.net)))} sub="Available next year"/></TaxMetricStrip>
    <div className="tax-summary-grid"><SummaryLedger title="Recorded income summary" rows={[['Domestic cash income',income.total-income.foreign],['Franking credits',income.franking],['Foreign income',income.foreign],['Total recorded cash income',income.total]]}/><SummaryLedger title="Capital gains summary" subtitle={`Calculated using ${method.toUpperCase()}`} rows={[['Total capital gains',summary.gains],['Current-year losses applied',summary.losses],['CGT discount estimate',Math.max(0,summary.net-summary.estimatedDiscountedNet)],['Net capital gain',Math.max(0,summary.estimatedDiscountedNet)]]}/></div>
    <TaxDisclaimer />
    <Card className="tax-report-index"><div className="card-title-row"><div><span className="section-label">REPORTS</span><h2>Open a detailed tax report</h2></div></div><div className="tax-report-links">{reportLinks.map(([label,path])=><Link to={`/app/tax/${path}`} key={path}><FileCheck2/><span><strong>{label}</strong><small>Open report</small></span></Link>)}</div></Card>
    <Card className="data-card tax-years"><div className="card-title-row"><h2>Previous financial years</h2></div><div className="table-scroll"><table><thead><tr><th>Financial year</th><th>Status</th><th>Method</th><th className="numeric">Capital gain/loss</th><th>Action needed</th></tr></thead><tbody>{fyOptions().slice(1,5).map(year => { const prior = matchTaxLots(bundle.transactions, year, method); return <tr key={year}><td>FY {year}</td><td><Badge>{prior.length ? 'Calculated' : 'No matched records'}</Badge></td><td>{method.toUpperCase()}</td><td className="numeric">{prior.length ? money(taxSummary(prior).net) : '—'}</td><td>Confirm source history</td></tr> })}</tbody></table></div></Card>
  </>
}

function MyTax({ bundle, matches, fy, method }: { bundle: PortfolioBundle; matches: TaxMatch[]; fy: string; method: TaxMethod }) {
  const income = taxIncome(bundle.transactions.filter(t => financialYearFor(new Date(t.date)) === fy)); const summary = taxSummary(matches)
  const fields = [
    ['10L','Gross interest',income.interest],['10M','TFN amounts withheld from gross interest',null],['11S','Unfranked amount',income.unfranked],['11T','Franked amount',income.franked],['11U','Franking credits',income.franking],['11V','TFN amounts withheld from dividends',null],['D8','Dividend deductions',null],['13U','Share of net income from trusts',null],['13C','Franked distributions from trusts',null],['13Q','Share of franking credits from trusts',null],['13R','TFN amounts withheld from distributions',null],['20E','Assessable foreign source income',null],['20F','Australian franking credits from a NZ company',null],['20M','Other net foreign source income',null],['20O','Foreign income tax offset',null],
  ] as const
  return <>
    <TaxMetricStrip><TaxMetric label="Portfolio" value={bundle.profile?.full_name || 'All portfolios'} /><TaxMetric label="Sale allocation" value={method.toUpperCase()} /><TaxMetric label="Estimate assumes" value="Resident individual" /><TaxMetric label="Financial year" value={`FY ${fy}`} /></TaxMetricStrip>
    <Card className="mytax-capital"><div className="card-title-row"><h2>Capital gains</h2><Link to="/app/tax/capital-gains">Go to CGT report</Link></div><div><TaxMetric label="Total current-year capital gains" value={money(summary.gains)}/><TaxMetric label="Net capital gain" value={money(Math.max(0,summary.estimatedDiscountedNet))}/><TaxMetric label="Net capital loss carried forward" value={money(Math.abs(Math.min(0,summary.net)))}/></div></Card>
    <TaxFieldTable title="Australian tax return for individuals" fields={fields.slice(0,7)}/>
    <TaxFieldTable title="Australian tax return for individuals — supplementary section" fields={fields.slice(7)}/>
    <TaxDisclaimer />
  </>
}

function TaxFieldTable({ title, fields }: { title: string; fields: readonly (readonly [string,string,number | null])[] }) { return <Card className="data-card tax-field-card"><div className="card-title-row"><h2>{title}</h2></div><div className="table-scroll"><table><thead><tr><th>myTax label</th><th>Field</th><th className="numeric">Amount</th></tr></thead><tbody>{fields.map(([code,label,value])=><tr key={code}><td><Badge>{code}</Badge></td><td>{label}</td><td className="numeric">{value === null ? 'Not supplied' : money(value)}</td></tr>)}</tbody></table></div></Card> }

function CapitalGains({ matches, method }: { matches: TaxMatch[]; method: TaxMethod }) {
  const summary = taxSummary(matches)
  const short = matches.filter((item)=>!item.discountEligible), long = matches.filter((item)=>item.discountEligible)
  return <>
    <TaxMetricStrip><TaxMetric label="Short-term gains" value={money(short.reduce((sum,item)=>sum+Math.max(0,item.gainAud),0))} sub="Other method"/><TaxMetric label="Long-term gains" value={money(long.reduce((sum,item)=>sum+Math.max(0,item.gainAud),0))} sub="Discount method"/><TaxMetric label="Current-year losses" value={money(summary.losses)} /><TaxMetric label="Net capital gain" value={money(Math.max(0,summary.estimatedDiscountedNet))} sub="Estimated after discount"/></TaxMetricStrip>
    <ParcelTable title="Matched disposals" rows={matches} method={method}/><TaxDisclaimer />
  </>
}

function ParcelTable({ title, rows, method }: { title: string; rows: TaxMatch[]; method: TaxMethod }) { return <Card className="data-card tax-field-card"><div className="card-title-row"><div><span className="section-label">{method.toUpperCase()} PARCEL MATCHES</span><h2>{title}</h2></div><Badge>{rows.length} parcels</Badge></div>{rows.length ? <div className="table-scroll"><table><thead><tr><th>Symbol</th><th>Purchase date</th><th>Sale date</th><th className="numeric">Quantity</th><th className="numeric">Proceeds</th><th className="numeric">Cost base</th><th className="numeric">Gain/loss</th><th>Discount</th></tr></thead><tbody>{rows.map((item,index)=><HoldingNavigationRow symbol={item.symbol} key={`${item.sellId}-${index}`}><td><span className="asset-cell compact"><HoldingLogo symbol={item.symbol} size={29} /><strong>{item.symbol}</strong></span></td><td>{date(item.boughtAt)}</td><td>{date(item.soldAt)}</td><td className="numeric">{number(item.quantity,4)}</td><td className="numeric">{money(item.proceedsAud)}</td><td className="numeric">{money(item.costBaseAud)}</td><td className={`numeric ${item.gainAud>=0?'positive':'negative'}`}>{money(item.gainAud)}</td><td><Badge tone={item.discountEligible?'success':'warning'}>{item.discountEligible?'Eligible':'Other'}</Badge><small>{item.holdingDays} days</small></td></HoldingNavigationRow>)}</tbody></table></div> : <EmptyState icon={Landmark} title="No matched disposals for this financial year" description="Import complete transaction history and select a year containing sell activity."/>}</Card> }

function TaxableIncome({ transactions }: { transactions: Transaction[] }) {
  const income = taxIncome(transactions)
  const rows = incomeTransactions(transactions)
  return <>
    <TaxFieldTable title="Taxable income summary" fields={[["10L","Gross interest",income.interest],["11T","Franked amount",income.franked],["11S","Unfranked amount",income.unfranked],["11U","Franking credits",income.franking],["13U","Taxable trust distributions",null],["20E","Assessable foreign income",null]]}/>
    <Card className="data-card tax-field-card"><div className="card-title-row"><div><span className="section-label">SOURCE RECORDS</span><h2>Income ledger</h2></div><Badge>{rows.length} records</Badge></div>{rows.length ? <div className="table-scroll"><table><thead><tr><th>Holding</th><th>Date paid</th><th>Type</th><th>Description</th><th className="numeric">Net amount</th><th className="numeric">Franking credits</th><th className="numeric">Gross total</th></tr></thead><tbody>{rows.map((item,index)=>{const value=Math.abs(item.amount*item.fx_rate);return <HoldingNavigationRow symbol={item.symbol} key={`${item.date}-${index}`}><td><span className="asset-cell compact"><HoldingLogo symbol={item.symbol || 'CASH'} size={29} /><strong>{item.symbol||'Cash'}</strong></span></td><td>{date(item.date)}</td><td>{item.type}</td><td>{item.description||'Income'}</td><td className="numeric">{value === null ? 'Not supplied' : money(value)}</td><td className="numeric">Not supplied</td><td className="numeric"><strong>Not supplied</strong></td></HoldingNavigationRow>})}</tbody></table></div>:<EmptyState icon={FileCheck2} title="No income source records" description="Imported dividend, distribution and interest records appear here."/>}</Card><TaxDisclaimer />
  </>
}

function Valuation({ bundle }: { bundle: PortfolioBundle }) { return <HoldingTaxTable title="Holdings valuation" headers={['Holding','Name','Units','Average unit cost','Total cost','Current price','Value','Profit/loss','P/L %']} rows={bundle.holdings.map((h)=>[h.symbol,h.name||'—',number(h.quantity,4),money(h.average_cost,h.currency,2),money(h.cost_aud),money(h.current_price,h.currency,2),money(h.value_aud),money(h.unrealised_gain_aud),`${h.return_pct.toFixed(2)}%`])}/> }
function HistoricalCost({ bundle }: { bundle: PortfolioBundle }) { return <HoldingTaxTable title="Current recorded cost by holding" headers={['Holding','Quantity','Average unit cost','Recorded cost AUD']} rows={bundle.holdings.map(h => [h.symbol,number(h.quantity,4),money(h.average_cost,h.currency,2),money(h.cost_aud)])}/> }
function Unrealised({ bundle }: { bundle: PortfolioBundle }) { const gains=bundle.holdings.reduce((s,h)=>s+Math.max(0,h.unrealised_gain_aud),0);const losses=bundle.holdings.reduce((s,h)=>s+Math.min(0,h.unrealised_gain_aud),0);return <><TaxMetricStrip><TaxMetric label="Unrealised gains" value={money(gains)}/><TaxMetric label="Unrealised losses" value={money(losses)}/><TaxMetric label="Potential net gain" value={money(gains+losses)}/></TaxMetricStrip><HoldingTaxTable title="Current open positions" headers={['Symbol','Quantity','Market price','Recorded cost AUD','Market value AUD','Gain/loss AUD']} rows={bundle.holdings.map(h=>[h.symbol,number(h.quantity,4),money(h.current_price,h.currency,2),money(h.cost_aud),money(h.value_aud),money(h.unrealised_gain_aud)])}/><TaxDisclaimer /></> }

function HoldingTaxTable({ title, headers, rows }: { title: string; headers: string[]; rows: ReactNode[][] }) { return <Card className="data-card tax-field-card"><div className="card-title-row"><h2>{title}</h2><Badge>{rows.length} holdings</Badge></div>{rows.length?<div className="table-scroll"><table><thead><tr>{headers.map((header,index)=><th key={header} className={index>1?'numeric':''}>{header}</th>)}</tr></thead><tbody>{rows.map((row,index)=><HoldingNavigationRow symbol={String(row[0])} key={index}>{row.map((value,cell)=><td key={cell} className={cell>1?'numeric':''}>{cell===0?<span className="asset-cell compact"><HoldingLogo symbol={String(value)} size={29} /><strong>{value}</strong></span>:value}</td>)}</HoldingNavigationRow>)}</tbody></table></div>:<EmptyState icon={Scale} title="No holdings to report" description="Import or connect a portfolio to populate this report."/>}</Card> }
function TaxMetricStrip({ children }: { children: ReactNode }) { return <div className="report-metric-strip tax-metric-strip">{children}</div> }
function TaxMetric({ label, value, sub }: { label: string; value: ReactNode; sub?: ReactNode }) { return <Card className="report-metric"><span>{label}</span><strong>{value}</strong>{sub&&<small>{sub}</small>}</Card> }
function SummaryLedger({ title, subtitle, rows }: { title: string; subtitle?: string; rows: [string,number | null][] }) { return <Card className="tax-summary-card"><div><h2>{title}</h2>{subtitle&&<p>{subtitle}</p>}</div><dl>{rows.map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value === null ? 'Not supplied' : money(value)}</dd></div>)}</dl></Card> }
function TaxDisclaimer() { return <Card className="tax-assumptions"><Scale size={20}/><div><h3>Important notice</h3><p>Franking, withholding and trust tax components are not supplied by the transaction ledger and must be checked against annual statements. CGT estimates assume a resident individual, complete purchase history and no carried-forward losses. Independently confirm the result and consult a tax professional before lodging or acting on it.</p></div></Card> }
function taxIncome(transactions: Transaction[]) {
  const items = incomeTransactions(transactions)
  const values = items.map(item => ({ type: String(item.type).toUpperCase(), value: Math.abs(item.amount * item.fx_rate), currency: item.currency }))
  const total = values.reduce((sum, item) => sum + item.value, 0)
  const trust = values.filter(item => item.type === 'DISTRIBUTION' && item.currency === 'AUD').reduce((sum, item) => sum + item.value, 0)
  const interest = values.filter(item => item.type === 'INTEREST' && item.currency === 'AUD').reduce((sum, item) => sum + item.value, 0)
  return { events: items.length, total, franked: null, unfranked: null, franking: null, trust, interest, foreign: values.filter(item => item.currency !== 'AUD').reduce((sum, item) => sum + item.value, 0) }
}
