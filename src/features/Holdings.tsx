import { ArrowDown, ArrowUp, BriefcaseBusiness, Download, SearchX } from 'lucide-react'
import { useMemo, useState } from 'react'
import { usePortfolio } from '../context/PortfolioContext'
import { allocationBy, summarisePortfolio } from '../lib/portfolio'
import { downloadCsv, money, number, percent } from '../lib/format'
import { Badge, Button, Card, EmptyState, MetricCard, PageHeader, PrivateMoney, SearchInput, Select } from '../components/ui'

type SortKey = 'value_aud' | 'return_pct' | 'symbol' | 'day_change_aud'

export function Holdings() {
  const { bundle } = usePortfolio()
  const [query, setQuery] = useState('')
  const [broker, setBroker] = useState('all')
  const [assetClass, setAssetClass] = useState('all')
  const [sort, setSort] = useState<SortKey>('value_aud')
  const [ascending, setAscending] = useState(false)
  const summary = useMemo(() => summarisePortfolio(bundle), [bundle])
  const allocation = useMemo(() => allocationBy(bundle.holdings, 'asset_class'), [bundle.holdings])
  const rows = useMemo(() => bundle.holdings
    .filter((item) => broker === 'all' || item.provider === broker)
    .filter((item) => assetClass === 'all' || (item.asset_class || 'Other') === assetClass)
    .filter((item) => `${item.symbol} ${item.name} ${item.account_name}`.toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => {
      const left = a[sort]
      const right = b[sort]
      const result = typeof left === 'string' ? left.localeCompare(String(right)) : Number(left) - Number(right)
      return ascending ? result : -result
    }), [ascending, assetClass, broker, bundle.holdings, query, sort])

  const exportRows = () => downloadCsv('masterdeck-holdings.csv', ['Symbol', 'Name', 'Broker', 'Account', 'Market', 'Currency', 'Quantity', 'Average cost', 'Current price', 'Value AUD', 'Cost AUD', 'Unrealised gain AUD', 'Return %', 'Day change AUD'], rows.map((item) => [item.symbol, item.name, item.provider, item.account_name, item.market, item.currency, item.quantity, item.average_cost, item.current_price, item.value_aud, item.cost_aud, item.unrealised_gain_aud, item.return_pct, item.day_change_aud]))

  return (
    <>
      <PageHeader title="Holdings" description="Every current position across your connected portfolio." actions={<Button icon={Download} onClick={exportRows} disabled={!rows.length}>Export CSV</Button>} />
      <div className="metric-grid four compact">
        <MetricCard label="Invested value" value={<PrivateMoney value={summary.invested} />} detail="excluding cash" />
        <MetricCard label="Total cost" value={<PrivateMoney value={summary.cost} />} detail="AUD cost base" />
        <MetricCard label="Unrealised" value={<PrivateMoney value={summary.unrealised} />} change={percent(summary.returnPct)} tone={summary.unrealised >= 0 ? 'positive' : 'negative'} />
        <MetricCard label="Largest asset class" value={allocation[0]?.name || '–'} change={allocation[0] ? `${allocation[0].percentage.toFixed(1)}%` : '–'} detail="of invested value" />
      </div>
      <Card className="data-card">
        <div className="data-toolbar">
          <SearchInput value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search symbol, company or account" aria-label="Search holdings" />
          <div className="toolbar-filters">
            <Select value={broker} onChange={(event) => setBroker(event.target.value)} aria-label="Filter holdings by broker"><option value="all">All brokers</option><option value="ibkr">IBKR</option><option value="superhero">Superhero</option></Select>
            <Select value={assetClass} onChange={(event) => setAssetClass(event.target.value)} aria-label="Filter holdings by asset class"><option value="all">All asset classes</option>{[...new Set(bundle.holdings.map((item) => item.asset_class || 'Other'))].map((item) => <option key={item}>{item}</option>)}</Select>
            <Select value={sort} onChange={(event) => setSort(event.target.value as SortKey)} aria-label="Sort holdings"><option value="value_aud">Sort by value</option><option value="return_pct">Sort by return</option><option value="day_change_aud">Sort by today</option><option value="symbol">Sort by symbol</option></Select>
            <button className="sort-direction" aria-label={`Sort ${ascending ? 'descending' : 'ascending'}`} onClick={() => setAscending((value) => !value)}>{ascending ? <ArrowUp size={16} /> : <ArrowDown size={16} />}</button>
          </div>
        </div>
        {rows.length ? <div className="table-scroll"><table className="holdings-table"><thead><tr><th>Asset</th><th>Broker / account</th><th className="numeric">Quantity</th><th className="numeric">Price</th><th className="numeric">Market value</th><th className="numeric">Cost</th><th className="numeric">Unrealised</th><th className="numeric">Today</th></tr></thead><tbody>{rows.map((item) => <tr key={`${item.provider}-${item.account_name}-${item.symbol}`}><td><span className="asset-cell"><i>{item.symbol.slice(0, 2)}</i><span><strong>{item.symbol}</strong><small>{item.name || item.symbol}</small></span></span></td><td><Badge tone={item.provider === 'ibkr' ? 'purple' : 'success'}>{item.provider === 'ibkr' ? 'IBKR' : 'Superhero'}</Badge><small className="account-subline">{item.account_name}</small></td><td className="numeric">{number(item.quantity, 4)}</td><td className="numeric">{money(item.current_price, item.currency, 2)}<small className="currency-subline">{item.currency}</small></td><td className="numeric private-value"><strong>{money(item.value_aud)}</strong><small>{summary.invested ? (item.value_aud / summary.invested * 100).toFixed(1) : '0'}% weight</small></td><td className="numeric private-value">{money(item.cost_aud)}</td><td className={`numeric private-value ${item.unrealised_gain_aud >= 0 ? 'positive' : 'negative'}`}><strong>{money(item.unrealised_gain_aud)}</strong><small>{percent(item.return_pct)}</small></td><td className={`numeric private-value ${item.day_change_aud >= 0 ? 'positive' : 'negative'}`}>{money(item.day_change_aud)}</td></tr>)}</tbody></table></div> : <EmptyState icon={bundle.holdings.length ? SearchX : BriefcaseBusiness} title={bundle.holdings.length ? 'No holdings match these filters' : 'No holdings imported'} description={bundle.holdings.length ? 'Clear the search or choose a different account.' : 'Connect IBKR or import a Superhero portfolio report to populate this table.'} />}
        <div className="table-footer"><span>{rows.length} of {bundle.holdings.length} holdings</span><span>Values converted to AUD using each position’s latest FX rate</span></div>
      </Card>
    </>
  )
}
