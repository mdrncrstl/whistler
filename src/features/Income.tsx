import { CircleDollarSign, Download, ReceiptText } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { usePortfolio } from '../context/PortfolioContext'
import { financialYearBounds, financialYearFor, incomeTransactions } from '../lib/portfolio'
import { date, downloadCsv, money } from '../lib/format'
import { Badge, Button, Card, EmptyState, MetricCard, PageHeader, PrivateMoney, Select } from '../components/ui'

function fyOptions() {
  const current = Number(financialYearFor().split('/')[0])
  return Array.from({ length: 5 }, (_, index) => `${current - index}/${String(current - index + 1).slice(-2)}`)
}

export function Income() {
  const { bundle } = usePortfolio()
  const [fy, setFy] = useState(financialYearFor())
  const { start, end } = financialYearBounds(fy)
  const rows = useMemo(() => incomeTransactions(bundle.transactions)
    .filter((item) => { const value = new Date(item.date); return value >= start && value <= end })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()), [bundle.transactions, end, start])
  const total = rows.reduce((sum, item) => sum + Math.abs(item.amount * (item.fx_rate || 1)), 0)
  const dividends = rows.filter((item) => ['DIVIDEND', 'DISTRIBUTION'].includes(String(item.type).toUpperCase())).reduce((sum, item) => sum + Math.abs(item.amount * (item.fx_rate || 1)), 0)
  const interest = rows.filter((item) => String(item.type).toUpperCase() === 'INTEREST').reduce((sum, item) => sum + Math.abs(item.amount * (item.fx_rate || 1)), 0)
  const byAsset = [...rows.reduce((map, item) => { const key = item.symbol || 'Cash'; map.set(key, (map.get(key) || 0) + Math.abs(item.amount * (item.fx_rate || 1))); return map }, new Map<string, number>())].sort((a, b) => b[1] - a[1])
  const byMonth = Array.from({ length: 12 }, (_, index) => {
    const dateValue = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + index, 1))
    return { month: dateValue.toLocaleDateString('en-AU', { month: 'short' }), value: rows.filter((item) => { const d = new Date(item.date); return d.getUTCFullYear() === dateValue.getUTCFullYear() && d.getUTCMonth() === dateValue.getUTCMonth() }).reduce((sum, item) => sum + Math.abs(item.amount * (item.fx_rate || 1)), 0) }
  })

  const exportRows = () => downloadCsv(`masterdeck-income-${fy.replace('/', '-')}.csv`, ['Date', 'Type', 'Symbol', 'Description', 'Broker', 'Currency', 'Native amount', 'FX rate', 'AUD amount'], rows.map((item) => [item.date, item.type, item.symbol, item.description, item.provider, item.currency, item.amount, item.fx_rate, Math.abs(item.amount * (item.fx_rate || 1))]))

  return (
    <>
      <PageHeader title="Income" description="Dividends, distributions and interest recorded across your portfolio." actions={<><Select value={fy} onChange={(event) => setFy(event.target.value)} aria-label="Income financial year">{fyOptions().map((item) => <option key={item} value={item}>FY {item}</option>)}</Select><Button icon={Download} onClick={exportRows} disabled={!rows.length}>Export CSV</Button></>} />
      <div className="metric-grid four compact">
        <MetricCard label={`FY ${fy} income`} value={<PrivateMoney value={total} digits={2} />} detail={`${rows.length} payments`} />
        <MetricCard label="Dividends & distributions" value={<PrivateMoney value={dividends} digits={2} />} detail={total ? `${(dividends / total * 100).toFixed(1)}% of income` : 'No payments'} />
        <MetricCard label="Interest" value={<PrivateMoney value={interest} digits={2} />} detail={total ? `${(interest / total * 100).toFixed(1)}% of income` : 'No interest'} />
        <MetricCard label="Largest payer" value={byAsset[0]?.[0] || '–'} change={byAsset[0] ? <PrivateMoney value={byAsset[0][1]} digits={2} /> : '–'} detail="recorded this FY" />
      </div>
      <div className="income-grid">
        <Card className="income-chart-card"><div className="card-title-row"><div><span className="section-label">CASH FLOW</span><h2>Income by month</h2></div><Badge tone="gold">FY {fy}</Badge></div>{rows.length ? <div className="income-chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={byMonth} margin={{ top: 15, right: 5, bottom: 0, left: 0 }}><CartesianGrid stroke="#203429" strokeDasharray="3 5" vertical={false} /><XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#789087', fontSize: 11 }} /><YAxis tickFormatter={(value) => `$${value}`} axisLine={false} tickLine={false} width={44} tick={{ fill: '#789087', fontSize: 11 }} /><Tooltip cursor={{ fill: '#14231a' }} contentStyle={{ background: '#0d1913', border: '1px solid #294335', borderRadius: 10 }} formatter={(value) => [money(Number(value), 'AUD', 2), 'Income']} /><Bar dataKey="value" fill="#d6b56b" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div> : <EmptyState icon={CircleDollarSign} title="No income in this financial year" description="Choose another financial year or sync your broker activity." />}</Card>
        <Card className="payer-card"><div className="card-title-row"><div><span className="section-label">PAYERS</span><h2>Income by asset</h2></div></div>{byAsset.length ? <div className="payer-list">{byAsset.slice(0, 8).map(([symbol, value], index) => <div key={symbol}><span><i>{index + 1}</i><strong>{symbol}</strong></span><span><strong className="private-value">{money(value, 'AUD', 2)}</strong><small>{total ? (value / total * 100).toFixed(1) : 0}%</small></span></div>)}</div> : <EmptyState icon={ReceiptText} title="No payers yet" description="Dividend and interest transactions will be grouped here." />}</Card>
      </div>
      <Card className="data-card income-ledger"><div className="card-title-row"><div><span className="section-label">LEDGER</span><h2>Income payments</h2></div></div>{rows.length ? <div className="table-scroll"><table><thead><tr><th>Date</th><th>Type</th><th>Asset</th><th>Description</th><th>Broker</th><th className="numeric">Native amount</th><th className="numeric">AUD amount</th></tr></thead><tbody>{rows.map((item) => <tr key={item.provider_external_id}><td>{date(item.date)}</td><td><Badge tone="gold">{item.type}</Badge></td><td><strong>{item.symbol || 'Cash'}</strong></td><td>{item.description || 'Portfolio income'}</td><td>{item.provider === 'ibkr' ? 'IBKR' : 'Superhero'}</td><td className="numeric private-value">{money(Math.abs(item.amount), item.currency, 2)}</td><td className="numeric private-value positive"><strong>{money(Math.abs(item.amount * (item.fx_rate || 1)), 'AUD', 2)}</strong></td></tr>)}</tbody></table></div> : <EmptyState icon={CircleDollarSign} title="No income rows" description="Income transactions for the selected financial year will appear here." />}</Card>
    </>
  )
}
