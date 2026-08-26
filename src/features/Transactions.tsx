import { Download, ListFilter, SearchX, TableProperties } from 'lucide-react'
import { useMemo, useState } from 'react'
import { usePortfolio } from '../context/PortfolioContext'
import { date, downloadCsv, money, number } from '../lib/format'
import { Badge, Button, Card, EmptyState, PageHeader, SearchInput, Select } from '../components/ui'
import { PortfolioSetupGuide } from '../components/PortfolioSetupGuide'

const PAGE_SIZE = 25

function toneForType(type: string) {
  if (['BUY', 'DEPOSIT'].includes(type)) return 'success' as const
  if (['SELL', 'WITHDRAWAL'].includes(type)) return 'purple' as const
  if (['DIVIDEND', 'DISTRIBUTION', 'INTEREST'].includes(type)) return 'gold' as const
  if (['FEE', 'TAX'].includes(type)) return 'warning' as const
  return 'neutral' as const
}

export function Transactions() {
  const { bundle } = usePortfolio()
  const [query, setQuery] = useState('')
  const [type, setType] = useState('all')
  const [provider, setProvider] = useState('all')
  const [page, setPage] = useState(1)
  const filtered = useMemo(() => [...bundle.transactions]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .filter((item) => type === 'all' || String(item.type).toUpperCase() === type)
    .filter((item) => provider === 'all' || item.provider === provider)
    .filter((item) => `${item.symbol} ${item.description} ${item.account_name} ${item.type}`.toLowerCase().includes(query.toLowerCase())), [bundle.transactions, provider, query, type])
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, pages)
  const rows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)
  const transactionTypes = [...new Set(bundle.transactions.map((item) => String(item.type).toUpperCase()))].sort()

  const exportRows = () => downloadCsv('masterdeck-transactions.csv', ['Date', 'Type', 'Symbol', 'Description', 'Broker', 'Account', 'Quantity', 'Price', 'Currency', 'Amount', 'Fees', 'FX rate', 'External ID'], filtered.map((item) => [item.date, item.type, item.symbol, item.description, item.provider, item.account_name, item.quantity, item.price, item.currency, item.amount, item.fees, item.fx_rate, item.provider_external_id]))

  return (
    <>
      <PageHeader title="Transactions" description="A searchable, deduplicated ledger across every connected account." actions={<Button icon={Download} onClick={exportRows} disabled={!filtered.length}>Export filtered CSV</Button>} />
      {!bundle.holdings.length && !bundle.transactions.length && !bundle.connections.length ? <PortfolioSetupGuide compact /> :
      <Card className="data-card">
        <div className="data-toolbar">
          <SearchInput value={query} onChange={(event) => { setQuery(event.target.value); setPage(1) }} placeholder="Search symbol, description or account" aria-label="Search transactions" />
          <div className="toolbar-filters"><ListFilter size={16} /><Select value={type} onChange={(event) => { setType(event.target.value); setPage(1) }} aria-label="Filter transaction type"><option value="all">All activity</option>{transactionTypes.map((item) => <option key={item}>{item}</option>)}</Select><Select value={provider} onChange={(event) => { setProvider(event.target.value); setPage(1) }} aria-label="Filter transaction broker"><option value="all">All brokers</option><option value="ibkr">IBKR</option><option value="superhero">Superhero</option></Select></div>
        </div>
        {rows.length ? <div className="table-scroll"><table className="transactions-table"><thead><tr><th>Date</th><th>Activity</th><th>Asset</th><th>Account</th><th className="numeric">Quantity</th><th className="numeric">Price</th><th className="numeric">Amount</th><th className="numeric">Fees</th></tr></thead><tbody>{rows.map((item) => { const typeLabel = String(item.type).toUpperCase(); return <tr key={`${item.provider}-${item.provider_external_id}`}><td><strong>{date(item.date, { day: '2-digit', month: 'short', year: 'numeric' })}</strong></td><td><Badge tone={toneForType(typeLabel)}>{typeLabel}</Badge></td><td><span className="asset-cell simple"><i>{(item.symbol || '–').slice(0, 2)}</i><span><strong>{item.symbol || '–'}</strong><small>{item.description || typeLabel}</small></span></span></td><td><span>{item.provider === 'ibkr' ? 'IBKR' : 'Superhero'}</span><small className="account-subline">{item.account_name || 'Portfolio'}</small></td><td className="numeric">{item.quantity ? number(item.quantity, 4) : '–'}</td><td className="numeric">{item.price ? money(item.price, item.currency, 2) : '–'}</td><td className={`numeric private-value ${item.amount >= 0 ? 'positive-soft' : ''}`}><strong>{money(item.amount * (item.fx_rate || 1), 'AUD', 2)}</strong><small>{item.currency !== 'AUD' ? `${money(item.amount, item.currency, 2)} ${item.currency}` : 'AUD'}</small></td><td className="numeric private-value">{item.fees ? money(item.fees * (item.fx_rate || 1), 'AUD', 2) : '–'}</td></tr> })}</tbody></table></div> : <EmptyState icon={bundle.transactions.length ? SearchX : TableProperties} title={bundle.transactions.length ? 'No ledger rows match' : 'No transactions imported'} description={bundle.transactions.length ? 'Try a broader search or remove a filter.' : 'Your broker sync and Superhero reports will create a deduplicated activity ledger here.'} />}
        <div className="table-footer pagination"><span>Showing {filtered.length ? (safePage - 1) * PAGE_SIZE + 1 : 0}–{Math.min(safePage * PAGE_SIZE, filtered.length)} of {filtered.length}</span><div><button disabled={safePage <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>Previous</button><span>Page {safePage} of {pages}</span><button disabled={safePage >= pages} onClick={() => setPage((value) => Math.min(pages, value + 1))}>Next</button></div></div>
      </Card>
      }
    </>
  )
}
