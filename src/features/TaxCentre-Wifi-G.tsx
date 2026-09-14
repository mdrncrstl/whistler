import { AlertTriangle, ArrowUpRight, CheckCircle2, ChevronDown, Download, FileCheck2, Landmark, Scale, Search } from 'lucide-react'
import { HoldingLogo } from '../components/HoldingLogo'
import { HoldingNavigationRow } from '../components/HoldingNavigation'
import { useMemo, useState, type ReactNode } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
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
  const location = useLocation()
  const { bundle } = usePortfolio()
  const [fy, setFy] = useState(() => {
    const from = new URLSearchParams(location.search).get('from')
    return from ? financialYearFor(new Date(`${from}T12:00:00Z`)) : financialYearFor()
  })
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
    if (report === 'mytax') {
      const income = taxIncome(bundle.transactions.filter(t => financialYearFor(new Date(t.date)) === fy))
      const fields = myTaxFieldGroups(income).flatMap(group => group.fields.map(field => [group.title, field.code, field.label, field.value === null ? 'Not supplied' : field.value, field.source]))
      const summary = taxSummary(matches)
      return downloadCsv(filename, ['Section','Code','Field','Amount','Source'], [
        ['Capital gains','','Total current-year capital gains',summary.gains,'Matched disposals'],
        ['Capital gains','','Net capital gain',Math.max(0, summary.estimatedDiscountedNet),'Matched disposals'],
        ['Capital gains','','Net capital loss carried forward',Math.abs(Math.min(0, summary.net)),'Calculated from current year'],
        ...fields,
      ])
    }
    return downloadCsv(`masterdeck-${report}-current.csv`, ['Symbol','Name','Units','Recorded cost AUD','Latest value AUD','Unrealised gain AUD'], holdings.map(h => [h.symbol,h.name,h.quantity,h.cost_aud,h.value_aud,h.unrealised_gain_aud]))
  }
  return <div className={`tax-page tax-page--${report}`}>
    <PageHeader
      title={title}
      description={description}
      actions={report === 'mytax' ? <div className="tax-header-actions">
        <Select value={fy} onChange={(event)=>setFy(event.target.value)} aria-label="Financial year">{fyOptions().map((item)=><option value={item} key={item}>FY {item}</option>)}</Select>
        <Select value={method} onChange={(event)=>setMethod(event.target.value as TaxMethod)} aria-label="Sale allocation method"><option value="fifo">FIFO</option><option value="lifo">LIFO</option><option value="hifo">Highest cost first</option></Select>
        <Button icon={Download} onClick={exportReport}>Export</Button>
      </div> : undefined}
    />
    {report !== 'mytax' && <div className="report-toolbar tax-report-toolbar">
      {['valuation','unrealised','historical-cost'].includes(report) && <label className="report-search"><Search size={14}/><input value={query} onChange={(event)=>setQuery(event.target.value)} placeholder="Filter holdings…" aria-label="Filter holdings"/></label>}
      {!['valuation','unrealised','historical-cost'].includes(report) && <Select value={fy} onChange={(event)=>setFy(event.target.value)} aria-label="Financial year">{fyOptions().map((item)=><option value={item} key={item}>FY {item}</option>)}</Select>}
      {['overview','capital-gains','mytax'].includes(report) && <Select value={method} onChange={(event)=>setMethod(event.target.value as TaxMethod)} aria-label="Sale allocation method"><option value="fifo">FIFO</option><option value="lifo">LIFO</option><option value="hifo">Highest cost first</option></Select>}
      {!['overview','mytax'].includes(report) && <Button icon={Download} onClick={exportReport}>Export</Button>}
    </div>}
    {unmatchedSales && ['overview','mytax','capital-gains'].includes(report) && <p role="alert" className="connection-error">Some sales could not be fully matched to purchase records. These estimates are incomplete. Import the missing purchase history before using this report.</p>}
    {report === 'overview' && <TaxOverview bundle={bundle} matches={matches} fy={fy} method={method}/>}
    {report === 'mytax' && <MyTax bundle={bundle} matches={matches} fy={fy} method={method} unmatchedSales={unmatchedSales}/>}
    {report === 'capital-gains' && <CapitalGains matches={matches} method={method}/>}
    {report === 'taxable-income' && <TaxableIncome transactions={bundle.transactions.filter(t => financialYearFor(new Date(t.date)) === fy)}/>}
    {report === 'valuation' && <Valuation bundle={scoped}/>}
    {report === 'unrealised' && <Unrealised bundle={scoped}/>}
    {report === 'historical-cost' && <HistoricalCost bundle={scoped}/>}
  </div>
}

function TaxOverview({ bundle, matches, fy, method }: { bundle: PortfolioBundle; matches: TaxMatch[]; fy: string; method: TaxMethod }) {
  const navigate = useNavigate()
  const summary = taxSummary(matches)
  const income = taxIncome(bundle.transactions.filter(t => financialYearFor(new Date(t.date)) === fy))
  const missing = bundle.holdings.length ? bundle.holdings.filter((h)=>['ETF','Fund'].some((type)=>String(h.asset_class).includes(type))).length : 0
  const reportLinks = [['ATO myTax','mytax'],['Capital gains tax','capital-gains'],['Taxable income','taxable-income'],['Unrealised gains','unrealised'],['Portfolio valuation','valuation'],['Recorded cost','historical-cost']]
  return <>
    <Card className="tax-finalise"><div><span className="section-label">FINALISE FY {fy}</span><h2>{missing + (income.events ? 1 : 0)} items to review</h2></div><ul><li><AlertTriangle/><span><strong>{missing} holdings may need AMIT statements</strong><small>Confirm annual tax statement adjustments for managed funds and ETFs.</small></span><Button type="button" onClick={() => navigate('/workspace/tax/valuation')}>Review</Button></li><li><AlertTriangle/><span><strong>{income.events} income records need source-statement confirmation</strong><small>Check franked, unfranked and foreign components before relying on estimates.</small></span><Button type="button" onClick={() => navigate('/workspace/tax/taxable-income')}>Review</Button></li><li><AlertTriangle/><span><strong>Check historical coverage</strong><small>Years without imported records have not been verified.</small></span><Badge>Review</Badge></li></ul></Card>
    <TaxMetricStrip><TaxMetric label="Recorded income" value={money(income.total)} sub="Selected financial year"/><TaxMetric label="Net capital gain" value={money(Math.max(0,summary.estimatedDiscountedNet))} sub="After estimated discount"/><TaxMetric label="Franking credits" value="Not supplied" sub="Confirm tax statements"/><TaxMetric label="Carry-forward losses" value={money(Math.abs(Math.min(0,summary.net)))} sub="Available next year"/></TaxMetricStrip>
    <div className="tax-summary-grid"><SummaryLedger title="Recorded income summary" rows={[['Domestic cash income',income.total-income.foreign],['Franking credits',income.franking],['Foreign income',income.foreign],['Total recorded cash income',income.total]]}/><SummaryLedger title="Capital gains summary" subtitle={`Calculated using ${method.toUpperCase()}`} rows={[['Total capital gains',summary.gains],['Current-year losses applied',summary.losses],['CGT discount estimate',Math.max(0,summary.net-summary.estimatedDiscountedNet)],['Net capital gain',Math.max(0,summary.estimatedDiscountedNet)]]}/></div>
    <TaxDisclaimer />
    <Card className="tax-report-index"><div className="card-title-row"><div><span className="section-label">REPORTS</span><h2>Open a detailed tax report</h2></div></div><div className="tax-report-links">{reportLinks.map(([label,path])=><Link to={`/workspace/tax/${path}`} key={path}><FileCheck2/><span><strong>{label}</strong><small>Open report</small></span></Link>)}</div></Card>
    <Card className="data-card tax-years"><div className="card-title-row"><h2>Previous financial years</h2></div><div className="table-scroll"><table><thead><tr><th>Financial year</th><th>Status</th><th>Method</th><th className="numeric">Capital gain/loss</th><th>Action needed</th></tr></thead><tbody>{fyOptions().slice(1,5).map(year => { const prior = matchTaxLots(bundle.transactions, year, method); return <tr key={year}><td>FY {year}</td><td><Badge>{prior.length ? 'Calculated' : 'No matched records'}</Badge></td><td>{method.toUpperCase()}</td><td className="numeric">{prior.length ? money(taxSummary(prior).net) : '—'}</td><td>Confirm source history</td></tr> })}</tbody></table></div></Card>
  </>
}

function MyTax({ bundle, matches, fy, method, unmatchedSales }: { bundle: PortfolioBundle; matches: TaxMatch[]; fy: string; method: TaxMethod; unmatchedSales: boolean }) {
  const income = taxIncome(bundle.transactions.filter(t => financialYearFor(new Date(t.date)) === fy))
  const summary = taxSummary(matches)
  const fieldGroups = myTaxFieldGroups(income)
  const capitalBreakdown = getCapitalBreakdown(bundle, matches)
  const [breakdownOpen, setBreakdownOpen] = useState(false)
  const netCapitalGain = Math.max(0, summary.estimatedDiscountedNet)
  const estimatedDiscount = Math.max(0, summary.net - summary.estimatedDiscountedNet)
  const carriedForwardLoss = Math.abs(Math.min(0, summary.net))
  const portfolioName = bundle.profile?.full_name || 'All portfolios'
  const missingFieldCount = fieldGroups.reduce((total, group) => total + group.fields.filter(field => field.value === null).length, 0)
  const connectedCount = bundle.connections.filter(connection => connection.status === 'connected').length
  const fieldCount = fieldGroups.reduce((total, group) => total + group.fields.length, 0)

  return <>
    <section className="mytax-report-meta" aria-label="Return context">
      <div className="mytax-meta-copy">
        <span className="section-label">RETURN CONTEXT</span>
        <p>Review the figures from your recorded portfolio activity before you transfer them into myTax.</p>
      </div>
      <dl className="mytax-context-grid">
        <div><dt>Portfolio</dt><dd>{portfolioName}</dd></div>
        <div><dt>Sale allocation</dt><dd>{method.toUpperCase()}</dd></div>
        <div><dt>Tax residency</dt><dd>Australia <small>assumed</small></dd></div>
      </dl>
    </section>

    <section className="mytax-section-card mytax-capital" aria-labelledby="mytax-capital-title">
      <div className="mytax-section-head">
        <div>
          <span className="section-label">CAPITAL GAINS</span>
          <h2 id="mytax-capital-title">Capital gains</h2>
        </div>
        <Link className="mytax-section-link" to="/workspace/tax/capital-gains">Go to CGT report <ArrowUpRight size={15} aria-hidden="true" /></Link>
      </div>
      <dl className="mytax-report-rows">
        <div><dt>Total current-year capital gains</dt><dd>{taxMoney(summary.gains)}</dd></div>
        <div><dt>Net capital gain</dt><dd>{taxMoney(netCapitalGain)}</dd></div>
        <div><dt>Net capital loss carried forward</dt><dd>{taxMoney(carriedForwardLoss)}</dd></div>
        <div><dt>Estimated CGT discount applied</dt><dd>{taxMoney(estimatedDiscount)}</dd></div>
      </dl>
      <button className={'mytax-disclosure ' + (breakdownOpen ? 'is-open' : '')} type="button" aria-expanded={breakdownOpen} aria-controls="mytax-capital-breakdown" onClick={() => setBreakdownOpen(open => !open)}>
        <ChevronDown size={16} aria-hidden="true" />
        <span>Capital Gains Tax Breakdown</span>
        <small>{breakdownOpen ? 'Hide detail' : 'Show detail'}</small>
      </button>
      {breakdownOpen && <div id="mytax-capital-breakdown" className="mytax-breakdown">
        <table>
          <thead><tr><th>Asset class</th><th className="numeric">Capital gain</th><th className="numeric">Capital loss</th></tr></thead>
          <tbody>{capitalBreakdown.map(row => <tr key={row.label}><td>{row.label}</td><td className="numeric">{taxMoney(row.gain)}</td><td className="numeric">{taxMoney(row.loss)}</td></tr>)}</tbody>
        </table>
      </div>}
    </section>

    <section className="mytax-section-card mytax-income-summary" aria-labelledby="mytax-income-title">
      <div className="mytax-section-head">
        <div>
          <span className="section-label">TAXABLE INCOME</span>
          <h2 id="mytax-income-title">Income recorded for this return</h2>
          <p>Cash income is shown from imported transactions. Statement-only tax components stay marked for review.</p>
        </div>
        <Link className="mytax-section-link" to="/workspace/tax/taxable-income">Go to Taxable Income report <ArrowUpRight size={15} aria-hidden="true" /></Link>
      </div>
      <div className="mytax-income-stats">
        <div><span>Recorded cash income</span><strong>{taxMoney(income.total)}</strong><small>{income.events} source records</small></div>
        <div><span>Domestic cash records</span><strong>{taxMoney(income.total - income.foreign)}</strong><small>Converted to AUD</small></div>
        <div><span>Non-AUD cash records</span><strong>{taxMoney(income.foreign)}</strong><small>Converted using source FX</small></div>
        <div><span>Fields to confirm</span><strong>{missingFieldCount}</strong><small>Annual statements required</small></div>
      </div>
    </section>

    <section className="mytax-section-card mytax-return-section" aria-labelledby="mytax-return-title">
      <div className="mytax-section-head mytax-return-head">
        <div>
          <span className="section-label">AUSTRALIAN TAX RETURN FOR INDIVIDUALS</span>
          <h2 id="mytax-return-title">Australian tax return for individuals</h2>
          <p>Field-by-field values for FY {fy}. Use the source links beside each figure to check the underlying records.</p>
        </div>
        <div className="mytax-return-count"><strong>{fieldCount}</strong><span>ATO fields</span></div>
      </div>
      <TaxReturnTable groups={fieldGroups} />
    </section>

    <section className="mytax-section-card mytax-review-section" aria-labelledby="mytax-review-title">
      <div className="mytax-section-head">
        <div>
          <span className="section-label">REVIEW BEFORE LODGING</span>
          <h2 id="mytax-review-title">Source checks</h2>
          <p>Keep the report open while you reconcile statements and the matched disposal detail.</p>
        </div>
      </div>
      <div className="mytax-review-grid">
        <div className={'mytax-review-item ' + (unmatchedSales ? 'is-warning' : 'is-ready')}>
          <span className="mytax-review-icon">{unmatchedSales ? <AlertTriangle size={17} /> : <CheckCircle2 size={17} />}</span>
          <div><strong>Capital gains matching</strong><small>{unmatchedSales ? 'Some sales still need purchase history.' : matches.length + ' disposal' + (matches.length === 1 ? '' : 's') + ' matched with ' + method.toUpperCase() + '.'}</small></div>
          <Badge tone={unmatchedSales ? 'warning' : 'success'}>{unmatchedSales ? 'Review' : 'Ready'}</Badge>
        </div>
        <div className={'mytax-review-item ' + (income.events ? 'is-ready' : 'is-warning')}>
          <span className="mytax-review-icon">{income.events ? <CheckCircle2 size={17} /> : <AlertTriangle size={17} />}</span>
          <div><strong>Income ledger</strong><small>{income.events ? income.events + ' payment record' + (income.events === 1 ? '' : 's') + ' included for FY ' + fy + '.' : 'No income records were found for this year.'}</small></div>
          <Badge tone={income.events ? 'success' : 'warning'}>{income.events ? 'Recorded' : 'Check'}</Badge>
        </div>
        <div className="mytax-review-item is-warning">
          <span className="mytax-review-icon"><AlertTriangle size={17} /></span>
          <div><strong>Annual tax statements</strong><small>Confirm franking, withholding, trust and foreign income components against broker statements.</small></div>
          <Badge tone="warning">Review</Badge>
        </div>
        <div className={'mytax-review-item ' + (connectedCount ? 'is-ready' : 'is-warning')}>
          <span className="mytax-review-icon">{connectedCount ? <CheckCircle2 size={17} /> : <AlertTriangle size={17} />}</span>
          <div><strong>Portfolio source coverage</strong><small>{connectedCount ? connectedCount + ' connected source' + (connectedCount === 1 ? '' : 's') + ' available for reconciliation.' : 'Connect or import a source before relying on this report.'}</small></div>
          <Badge tone={connectedCount ? 'success' : 'warning'}>{connectedCount ? 'Connected' : 'Check'}</Badge>
        </div>
      </div>
    </section>

    <TaxDisclaimer className="mytax-disclaimer" />
  </>
}

type TaxReturnField = { code: string; label: string; value: number | null; source: string }
type TaxReturnGroup = { title: string; fields: TaxReturnField[] }

function taxMoney(value: number) { return money(value, 'AUD', 2) }

function myTaxFieldGroups(income: ReturnType<typeof taxIncome>): TaxReturnGroup[] {
  return [
    { title: 'Gross interest other than from partnerships and trusts', fields: [
      { code: '10L', label: 'Gross interest', value: income.interest, source: 'Income ledger' },
      { code: '10M', label: 'TFN amounts withheld from gross interest', value: null, source: 'Annual statement' },
    ] },
    { title: 'Dividends other than from partnerships and trusts', fields: [
      { code: '11S', label: 'Unfranked amount', value: income.unfranked, source: 'Annual statement' },
      { code: '11T', label: 'Franked amount', value: income.franked, source: 'Annual statement' },
      { code: '11U', label: 'Franking credits', value: income.franking, source: 'Annual statement' },
      { code: '11V', label: 'TFN amounts withheld from dividends', value: null, source: 'Annual statement' },
    ] },
    { title: 'Deductions other than from partnerships and trusts', fields: [
      { code: 'D8', label: 'Dividend deductions @ 50%', value: null, source: 'Annual statement' },
    ] },
    { title: 'Income from partnerships and trusts', fields: [
      { code: '13U', label: 'Share of net income from trusts', value: null, source: 'Annual statement' },
      { code: '13C', label: 'Franked distributions from trusts', value: null, source: 'Annual statement' },
      { code: '13Q', label: 'Share of franking credits from franked dividends', value: null, source: 'Annual statement' },
      { code: '13R', label: 'TFN amounts withheld from distributions', value: null, source: 'Annual statement' },
    ] },
    { title: 'Income from foreign sources and assets', fields: [
      { code: '20E', label: 'Assessable foreign source income', value: null, source: 'Annual statement' },
      { code: '20F', label: 'Australian franking credits from a NZ company', value: null, source: 'Annual statement' },
      { code: '20M', label: 'Other net foreign source income', value: null, source: 'Annual statement' },
      { code: '20O', label: 'Foreign income tax offset', value: null, source: 'Annual statement' },
    ] },
  ]
}

function getCapitalBreakdown(bundle: PortfolioBundle, matches: TaxMatch[]) {
  const labels = ['Shares in Australian listed companies', 'Other shares', 'Units in Australian listed unit trusts', 'Other units', 'Other assets']
  const groups = new Map(labels.map(label => [label, { label, gain: 0, loss: 0 }]))
  const holdings = new Map(bundle.holdings.map(holding => [holding.symbol.toUpperCase(), holding]))
  matches.forEach(match => {
    const holding = holdings.get(match.symbol.toUpperCase())
    const asset = (holding?.asset_class || '') + ' ' + (holding?.market || '')
    const normalizedAsset = asset.toLowerCase()
    const label = normalizedAsset.includes('etf') || normalizedAsset.includes('fund') || normalizedAsset.includes('trust') || normalizedAsset.includes('unit')
      ? normalizedAsset.includes('asx') ? 'Units in Australian listed unit trusts' : 'Other units'
      : normalizedAsset.includes('asx') || normalizedAsset.includes('au shares') || normalizedAsset.includes('australian')
        ? 'Shares in Australian listed companies'
        : normalizedAsset.includes('share') || normalizedAsset.includes('stock') || normalizedAsset.includes('nasdaq') || normalizedAsset.includes('nyse')
          ? 'Other shares'
          : 'Other assets'
    const row = groups.get(label)!
    if (match.gainAud >= 0) row.gain += match.gainAud
    else row.loss += Math.abs(match.gainAud)
  })
  return [...groups.values()]
}

function TaxReturnTable({ groups }: { groups: TaxReturnGroup[] }) {
  return <div className="mytax-return-table table-scroll"><table><thead><tr><th>Code</th><th>Field</th><th className="numeric">Amount</th><th>Source</th></tr></thead><tbody>{groups.flatMap(group => [
    <tr className="mytax-field-group" key={'group-' + group.title}><th colSpan={4}>{group.title}</th></tr>,
    ...group.fields.map(field => <tr key={field.code}><td><span className="mytax-code">{field.code}</span></td><td>{field.label}</td><td className="numeric">{field.value === null ? <span className="mytax-missing">Not supplied</span> : taxMoney(field.value)}</td><td><span className={'mytax-source ' + (field.value === null ? 'is-missing' : 'is-recorded')}>{field.source}</span></td></tr>),
  ])}</tbody></table></div>
}

function TaxFieldTable({ title, description, fields, className = '', labelStyle = 'badge' }: { title: string; description?: string; fields: readonly (readonly [string,string,number | null])[]; className?: string; labelStyle?: 'badge' | 'code' }) { return <Card className={`data-card tax-field-card ${className}`.trim()}><div className="card-title-row"><div><h2>{title}</h2>{description && <p className="tax-field-description">{description}</p>}</div></div><div className="table-scroll"><table><thead><tr><th>Code</th><th>Field</th><th className="numeric">Amount</th></tr></thead><tbody>{fields.map(([code,label,value])=><tr key={code}><td>{labelStyle === 'code' ? <span className="mytax-code">{code}</span> : <Badge>{code}</Badge>}</td><td>{label}</td><td className="numeric">{value === null ? <span className="mytax-missing">Not supplied</span> : money(value)}</td></tr>)}</tbody></table></div></Card> }

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
function TaxDisclaimer({ className = '' }: { className?: string }) { return <Card className={`tax-assumptions ${className}`.trim()}><Scale size={20}/><div><h3>Important notice</h3><p>Franking, withholding and trust tax components are not supplied by the transaction ledger and must be checked against annual statements. CGT estimates assume a resident individual, complete purchase history and no carried-forward losses. Independently confirm the result and consult a tax professional before lodging or acting on it.</p></div></Card> }

function taxIncome(transactions: Transaction[]) {
  const items = incomeTransactions(transactions)
  const values = items.map(item => ({ type: String(item.type).toUpperCase(), value: Math.abs(item.amount * item.fx_rate), currency: item.currency }))
  const total = values.reduce((sum, item) => sum + item.value, 0)
  const trust = values.filter(item => item.type === 'DISTRIBUTION' && item.currency === 'AUD').reduce((sum, item) => sum + item.value, 0)
  const interest = values.filter(item => item.type === 'INTEREST' && item.currency === 'AUD').reduce((sum, item) => sum + item.value, 0)
  return { events: items.length, total, franked: null, unfranked: null, franking: null, trust, interest, foreign: values.filter(item => item.currency !== 'AUD').reduce((sum, item) => sum + item.value, 0) }
}
