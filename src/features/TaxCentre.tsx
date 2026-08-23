import { Download, Landmark, Scale, ShieldAlert } from 'lucide-react'
import { useMemo, useState } from 'react'
import { usePortfolio } from '../context/PortfolioContext'
import { financialYearFor } from '../lib/portfolio'
import { matchTaxLots, taxSummary } from '../lib/tax'
import type { TaxMethod } from '../types'
import { date, downloadCsv, money, number } from '../lib/format'
import { Badge, Button, Card, EmptyState, MetricCard, PageHeader, PrivateMoney, Select } from '../components/ui'

function fyOptions() {
  const current = Number(financialYearFor().split('/')[0])
  return Array.from({ length: 7 }, (_, index) => `${current - index}/${String(current - index + 1).slice(-2)}`)
}

export function TaxCentre() {
  const { bundle } = usePortfolio()
  const [fy, setFy] = useState(financialYearFor())
  const [method, setMethod] = useState<TaxMethod>(bundle.profile?.settings?.defaultTaxMethod || 'fifo')
  const matches = useMemo(() => matchTaxLots(bundle.transactions, fy, method), [bundle.transactions, fy, method])
  const summary = useMemo(() => taxSummary(matches), [matches])
  const exportRows = () => downloadCsv(`masterdeck-cgt-${fy.replace('/', '-')}-${method}.csv`, ['Symbol', 'Buy date', 'Sell date', 'Quantity', 'Proceeds AUD', 'Cost base AUD', 'Gain or loss AUD', 'Holding days', '12-month discount eligible', 'Method'], matches.map((item) => [item.symbol, item.boughtAt, item.soldAt, item.quantity, item.proceedsAud, item.costBaseAud, item.gainAud, item.holdingDays, item.discountEligible ? 'Yes' : 'No', method.toUpperCase()]))

  return (
    <>
      <PageHeader title="Tax centre" description="Australian financial-year parcel matching and CGT timing estimates." actions={<><Select value={fy} onChange={(event) => setFy(event.target.value)} aria-label="Tax financial year">{fyOptions().map((item) => <option key={item} value={item}>FY {item}</option>)}</Select><Select value={method} onChange={(event) => setMethod(event.target.value as TaxMethod)} aria-label="Tax lot method"><option value="fifo">FIFO</option><option value="lifo">LIFO</option><option value="hifo">Highest cost first</option></Select><Button icon={Download} onClick={exportRows} disabled={!matches.length}>Export tax CSV</Button></>} />
      <div className="tax-notice"><ShieldAlert size={18} /><span><strong>Record-keeping estimate, not tax advice.</strong> Verify corporate actions, cost-base adjustments, FX treatment and parcel choices with a qualified Australian tax professional.</span></div>
      <div className="metric-grid four compact">
        <MetricCard label="Capital gains" value={<PrivateMoney value={summary.gains} digits={2} />} detail="before losses and discount" />
        <MetricCard label="Capital losses" value={<PrivateMoney value={summary.losses} digits={2} />} tone={summary.losses ? 'negative' : 'neutral'} detail="current-year matched losses" />
        <MetricCard label="Net gain / loss" value={<PrivateMoney value={summary.net} digits={2} />} tone={summary.net >= 0 ? 'positive' : 'negative'} detail="before CGT discount" />
        <MetricCard label="Discount-eligible gains" value={<PrivateMoney value={summary.discountEligibleGains} digits={2} />} change={<PrivateMoney value={summary.estimatedDiscountedNet} digits={2} />} detail="estimated taxable net after 50% discount" />
      </div>
      <div className="tax-method-explainer">
        <Card className={method === 'fifo' ? 'selected' : ''}><span>FIFO</span><strong>Oldest parcel first</strong><p>Often maximises 12-month CGT discount eligibility.</p></Card>
        <Card className={method === 'lifo' ? 'selected' : ''}><span>LIFO</span><strong>Newest parcel first</strong><p>Tests the result of matching the most recent units first.</p></Card>
        <Card className={method === 'hifo' ? 'selected' : ''}><span>HIFO</span><strong>Highest cost first</strong><p>Prioritises parcels with the highest AUD unit cost.</p></Card>
      </div>
      <Card className="data-card tax-table">
        <div className="card-title-row"><div><span className="section-label">CGT MATCHES</span><h2>Matched disposals</h2></div><Badge tone="gold">{method.toUpperCase()} · FY {fy}</Badge></div>
        {matches.length ? <div className="table-scroll"><table><thead><tr><th>Asset</th><th>Acquired</th><th>Disposed</th><th className="numeric">Quantity</th><th className="numeric">Proceeds</th><th className="numeric">Cost base</th><th className="numeric">Gain / loss</th><th>Discount timing</th></tr></thead><tbody>{matches.map((item, index) => <tr key={`${item.sellId}-${index}`}><td><strong>{item.symbol}</strong></td><td>{date(item.boughtAt)}</td><td>{date(item.soldAt)}</td><td className="numeric">{number(item.quantity, 4)}</td><td className="numeric private-value">{money(item.proceedsAud, 'AUD', 2)}</td><td className="numeric private-value">{money(item.costBaseAud, 'AUD', 2)}</td><td className={`numeric private-value ${item.gainAud >= 0 ? 'positive' : 'negative'}`}><strong>{money(item.gainAud, 'AUD', 2)}</strong></td><td><Badge tone={item.discountEligible ? 'success' : 'warning'}>{item.discountEligible ? 'Eligible' : 'Not eligible'}</Badge><small className="account-subline">{item.holdingDays} days held</small></td></tr>)}</tbody></table></div> : <EmptyState icon={Landmark} title="No matched disposals for this financial year" description="Import complete transaction history, then choose a financial year containing SELL activity." />}
        <div className="table-footer"><span>{matches.length} matched parcel rows</span><span>Method: {method.toUpperCase()} · Values use transaction-level FX rates</span></div>
      </Card>
      <Card className="tax-assumptions"><Scale size={20} /><div><h3>Calculation assumptions</h3><p>Buy fees are added to the cost base, sell fees reduce proceeds, and a 365-day holding period marks potential individual CGT discount eligibility. Unmatched sells are excluded until earlier purchase history is imported.</p></div></Card>
    </>
  )
}
