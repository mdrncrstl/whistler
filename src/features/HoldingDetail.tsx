import {
  ArrowDownUp, ChevronDown, ChevronRight, CircleDollarSign, Download,
  FileText, Hash, MessageSquareText, Network, PieChart, ReceiptText, Scale, TrendingUp,
} from 'lucide-react'
import { Fragment, useEffect, useMemo, useState, type Dispatch, type SetStateAction } from 'react'
import { Link, useParams } from 'react-router-dom'
import { filterPerformancePoints, type PerformancePeriod } from '../components/AdvancedPerformanceChart'
import { PriceSummary } from '../components/PriceSummary'
import { HoldingChart } from '../components/HoldingChart'
import { isFund } from '../lib/assetType'
import { HoldingLogo } from '../components/HoldingLogo'
import { EmptyState, PrivateMoney } from '../components/ui'
import { usePortfolio } from '../context/PortfolioContext'
import { date, money } from '../lib/format'
import { holdingCurrencyGain } from '../lib/portfolio'
import { fetchMarketHistory, fetchMarketMovement, marketFreshnessLabel, type MarketMovement } from '../lib/marketDataApi'
import type { Transaction } from '../types'
import { SupplyChain } from './SupplyChain'

type Tab = 'Overview' | 'Trades' | 'Income' | 'Notes'
type SortDirection = 'asc' | 'desc'
type TradeSort = 'date' | 'type' | 'quantity' | 'price' | 'fees' | 'amount'
type IncomeSort = 'date' | 'type' | 'gross' | 'franking' | 'net'
type PerformancePoint = { date: string; holdingPercent: number; benchmarkPercent: number; holdingAmount: number; benchmarkAmount: number; price: number }
type PricePoint = { date: string; price: number; adjustedPrice?: number }

function transactionKey(item: Transaction) { return item.id || item.provider_external_id }
function financialYear(value: string) { const current = new Date(value); const year = current.getUTCFullYear(); return `FY ${current.getUTCMonth() >= 6 ? year + 1 : year}` }
function compareValues(a: string | number, b: string | number, direction: SortDirection) { const result = typeof a === 'number' && typeof b === 'number' ? a - b : String(a).localeCompare(String(b)); return direction === 'asc' ? result : -result }
function toggleSet(setter: Dispatch<SetStateAction<Set<string>>>, key: string) { setter((current) => { const next = new Set(current); if (next.has(key)) next.delete(key); else next.add(key); return next }) }
function downloadCsv(filename: string, rows: Array<Array<string | number>>) {
  const csv = rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(',')).join('\n')
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  const link = document.createElement('a'); link.href = url; link.download = filename; link.click(); URL.revokeObjectURL(url)
}

function SortButton<T extends string>({ label, column, active, direction, onSort }: { label: string; column: T; active: boolean; direction: SortDirection; onSort: (column: T) => void }) {
  return <button type="button" className={active ? 'active' : ''} onClick={() => onSort(column)}>{label}<ArrowDownUp size={11} aria-label={active ? `Sorted ${direction}` : undefined}/></button>
}

export function HoldingDetail() {
  const { symbol = '' } = useParams()
  const { bundle, setNotice, marketData } = usePortfolio()
  const holding = bundle.holdings.find((item) => item.symbol.toLowerCase() === symbol.toLowerCase())
  const [tab, setTab] = useState<Tab>('Overview')
  const [mode, setMode] = useState<'Amount' | 'Percent'>('Amount')
  const [period, setPeriod] = useState<PerformancePeriod>({ preset: '1Y' })
  const [pricePeriod, setPricePeriod] = useState<PerformancePeriod>({ preset: '1Y' })
  const [positionMode, setPositionMode] = useState('All Positions')
  const [tradeSort, setTradeSort] = useState<{ column: TradeSort; direction: SortDirection }>({ column: 'date', direction: 'desc' })
  const [incomeSort, setIncomeSort] = useState<{ column: IncomeSort; direction: SortDirection }>({ column: 'date', direction: 'desc' })
  const [selectedTrades, setSelectedTrades] = useState<Set<string>>(new Set())
  const [expandedTrades, setExpandedTrades] = useState<Set<string>>(new Set())
  const [selectedIncome, setSelectedIncome] = useState<Set<string>>(new Set())
  const [collapsedYears, setCollapsedYears] = useState<Set<string>>(new Set())
  const [pageSize, setPageSize] = useState(25)
  const [historyResult, setHistoryResult] = useState<{ symbol: string; points: PricePoint[] } | null>(null)
  const marketHistory = useMemo(() => historyResult?.symbol === symbol ? historyResult.points : [], [historyResult, symbol])
  const [marketMovement, setMarketMovement] = useState<MarketMovement | null>(null)
  const [marketMovementLoading, setMarketMovementLoading] = useState(false)
  const [marketMovementError, setMarketMovementError] = useState<string | null>(null)
  const noteKey = symbol.toUpperCase()
  const [notes, setNotes] = useState<Record<string, string>>({})
  const note = notes[noteKey] ?? window.localStorage.getItem(`masterdeck-note-${noteKey}`) ?? ''
  const setNote = (value: string) => setNotes((current) => ({ ...current, [noteKey]: value }))
  const transactions = useMemo(() => bundle.transactions.filter((item) => item.symbol?.toLowerCase() === symbol.toLowerCase()), [bundle.transactions, symbol])
  const income = useMemo(() => transactions.filter((item) => ['DIVIDEND', 'DISTRIBUTION', 'INTEREST'].includes(item.type.toUpperCase())), [transactions])

  useEffect(() => {
    if (!holding) return
    const controller = new AbortController()
    fetchMarketHistory(holding.symbol, holding.market || '', controller.signal).then((result) => {
      if (!controller.signal.aborted) setHistoryResult({ symbol, points: result.points })
    }).catch(() => { if (!controller.signal.aborted) setHistoryResult({ symbol, points: [] }) })
    return () => controller.abort()
  }, [holding, symbol])

  useEffect(() => {
    if (!holding) return
    const controller = new AbortController()
    const loadMovement = async () => {
      setMarketMovement(null)
      setMarketMovementError(null)
      setMarketMovementLoading(true)
      try {
        setMarketMovement(await fetchMarketMovement(holding.symbol, holding.market || '', controller.signal))
      } catch (error) {
        const isAbort = error instanceof Error && error.name === 'AbortError'
        if (!isAbort) setMarketMovementError(error instanceof Error ? error.message : 'Daily price movement is unavailable.')
      } finally {
        if (!controller.signal.aborted) setMarketMovementLoading(false)
      }
    }
    void loadMovement()
    return () => controller.abort()
  }, [holding])

  const priceHistory = useMemo<PricePoint[]>(() => {
    if (!holding) return []
    if (marketHistory.length > 1) return marketHistory
    const recorded = transactions.filter((item) => Number(item.price) > 0).sort((a, b) => a.date.localeCompare(b.date)).map((item) => ({ date: item.date, price: Number(item.price) }))
    const currentDate = holding.as_of || new Date().toISOString()
    if (!recorded.length) return [{ date: currentDate, price: holding.current_price }]
    if (recorded[recorded.length - 1].date.slice(0, 10) !== currentDate.slice(0, 10)) recorded.push({ date: currentDate, price: holding.current_price })
    return recorded
  }, [holding, marketHistory, transactions])

  const performanceData = useMemo<PerformancePoint[]>(() => {
    if (!holding || !priceHistory.length) return []
    const firstPrice = Math.max(priceHistory[0].adjustedPrice ?? priceHistory[0].price, .01)
    const latestPrice = Math.max(priceHistory.at(-1)?.adjustedPrice ?? priceHistory.at(-1)?.price ?? firstPrice, .01)
    const snapshots = [...bundle.snapshots].sort((a, b) => a.date.localeCompare(b.date))
    const firstBenchmark = Math.max(snapshots[0]?.value_aud || 1, 1)
    return priceHistory.map((point) => {
      const pointTime = new Date(point.date).getTime()
      const benchmarkPoint = snapshots.reduce((chosen, item) => new Date(item.date).getTime() <= pointTime ? item : chosen, snapshots[0])
      const comparablePrice = point.adjustedPrice ?? point.price
      const holdingPercent = (comparablePrice / firstPrice - 1) * 100
      const benchmarkPercent = ((benchmarkPoint?.value_aud || firstBenchmark) / firstBenchmark - 1) * 100
      return { date: point.date, holdingPercent, benchmarkPercent, holdingAmount: holding.value_aud * comparablePrice / latestPrice, benchmarkAmount: holding.cost_aud * (1 + benchmarkPercent / 100), price: comparablePrice }
    })
  }, [bundle.snapshots, holding, priceHistory])

  const visiblePerformance = useMemo(() => filterPerformancePoints(performanceData, period), [performanceData, period])
  if (!holding) return <div className="holding-page"><div className="holding-breadcrumb"><Link to="/app">Portfolio</Link><ChevronRight size={13}/><span>{symbol.toUpperCase()}</span></div><EmptyState title="Holding not found" description="This holding is not part of the selected portfolio."/></div>

  const periodStart = visiblePerformance[0]
  const periodEnd = visiblePerformance[visiblePerformance.length - 1]
  const periodReturnPct = periodStart && periodEnd ? ((periodEnd.holdingAmount - periodStart.holdingAmount) / Math.max(Math.abs(periodStart.holdingAmount), 1)) * 100 : holding.return_pct
  const cutoff = period.preset === 'MAX' ? null : periodStart ? new Date(periodStart.date).getTime() : null
  const visibleIncome = income.filter((item) => cutoff === null || new Date(item.date).getTime() >= cutoff)
  const incomeTotal = visibleIncome.reduce((sum, item) => sum + Math.abs(item.amount * item.fx_rate), 0)
  const periodCapitalGain = period.preset === 'MAX' ? holding.unrealised_gain_aud : holding.value_aud * periodReturnPct / Math.max(100 + periodReturnPct, 1)
  const capitalPct = periodCapitalGain / Math.max(holding.value_aud - periodCapitalGain, 1) * 100
  const totalReturn = periodCapitalGain + incomeTotal
  const totalPct = totalReturn / Math.max(holding.value_aud - periodCapitalGain, 1) * 100
  const dayPct = holding.value_aud ? holding.day_change_aud / holding.value_aud * 100 : 0
  const portfolioTotal = bundle.holdings.reduce((sum, item) => sum + item.value_aud, 0)
  const annualCutoff = new Date(priceHistory[priceHistory.length - 1]?.date || '1970-01-01').getTime() - 365 * 86400000
  const annualIncome = income.filter((item) => new Date(item.date).getTime() >= annualCutoff).reduce((sum, item) => sum + Math.abs(item.amount * item.fx_rate), 0)
  const saveNote = () => { window.localStorage.setItem(`masterdeck-note-${holding.symbol}`, note); setNotice({ tone: 'success', message: `Note saved for ${holding.symbol}.` }) }
  const changeTradeSort = (column: TradeSort) => setTradeSort((current) => ({ column, direction: current.column === column && current.direction === 'desc' ? 'asc' : 'desc' }))
  const sortedTrades = [...transactions].sort((a, b) => compareValues(a[tradeSort.column] as string | number, b[tradeSort.column] as string | number, tradeSort.direction)).slice(0, pageSize)
  const changeIncomeSort = (column: IncomeSort) => setIncomeSort((current) => ({ column, direction: current.column === column && current.direction === 'desc' ? 'asc' : 'desc' }))
  const incomeRows = income.map((item) => { const net = Math.abs(item.amount); const gross = item.currency === 'AUD' ? net / .7 : net; return { item, net, gross, franking: Math.max(0, gross - net), year: financialYear(item.date) } }).sort((a, b) => compareValues(incomeSort.column === 'date' || incomeSort.column === 'type' ? a.item[incomeSort.column] : a[incomeSort.column], incomeSort.column === 'date' || incomeSort.column === 'type' ? b.item[incomeSort.column] : b[incomeSort.column], incomeSort.direction))
  const incomeYears = [...new Set(incomeRows.map((item) => item.year))]
  const exportTrades = () => downloadCsv(`${holding.symbol}-trades.csv`, [['Date', 'Type', 'Quantity', 'Price', 'Fees', 'Amount'], ...transactions.filter((item) => selectedTrades.has(transactionKey(item))).map((item) => [item.date, item.type, item.quantity, item.price, item.fees, item.amount])])
  const exportIncome = () => downloadCsv(`${holding.symbol}-income.csv`, [['Date paid', 'Type', 'Gross amount', 'Franking credits', 'Net amount'], ...incomeRows.filter(({ item }) => selectedIncome.has(transactionKey(item))).map(({ item, gross, franking, net }) => [item.date, item.type, gross.toFixed(2), franking.toFixed(2), net.toFixed(2)])])

  return <div className="holding-page">
    <div className="holding-breadcrumb"><Link to="/app">Portfolio</Link><ChevronRight size={13}/><span>{holding.symbol}</span></div>
    <header className="holding-page-header"><HoldingLogo symbol={holding.symbol} assetClass={holding.asset_class} size={46}/><div className="holding-heading-copy"><h1>{holding.name || holding.symbol}</h1><div className="holding-meta"><strong>{holding.symbol}:{holding.market || 'GLOBAL'}</strong><span className="holding-account-badge">{holding.account_name}</span><span>{holding.sector || holding.asset_class || 'Investment'}</span><span className="holding-current-price">{money(holding.current_price, holding.currency, 2)}</span><span className={`holding-day-move ${holding.day_change_aud >= 0 ? 'positive' : 'negative'}`}>{holding.day_change_aud >= 0 ? '+' : ''}{money(holding.day_change_aud, 'AUD', 2)} ({dayPct.toFixed(2)}%)</span><span className={`holding-market-state state-${marketData.status}`} title={marketData.message || undefined}><i/>{marketFreshnessLabel(marketData)}</span></div></div>{!isFund(holding) && <Link className="holding-supply-chain-link" to={`/app/tools/supply-chain/${encodeURIComponent(holding.symbol.toUpperCase())}`} aria-label="View supply chain relationship map"><Network size={15}/><span>View supply chain</span><ChevronRight size={14}/></Link>}</header>
    <nav className="holding-tabs" aria-label="Holding details">{(['Overview', 'Trades', 'Income', 'Notes'] as Tab[]).map((item) => <button key={item} aria-current={tab === item ? 'page' : undefined} onClick={() => setTab(item)}>{item}</button>)}</nav>

    {tab === 'Overview' && <>
      <div className="holding-controls holding-position-controls"><label><select aria-label="Holding positions" value={positionMode} onChange={(event) => setPositionMode(event.target.value)}><option>All Positions</option><option>Open Positions Only</option></select><ChevronDown size={13}/></label></div>
      <div className="holding-metrics"><article className="active"><span>Holding Value</span><strong><PrivateMoney value={holding.value_aud} digits={2}/></strong><small className={totalPct >= 0 ? 'positive' : 'negative'}>{totalPct.toFixed(2)}% <em>period</em></small></article><article><span>Capital Gain</span><strong><PrivateMoney value={periodCapitalGain} digits={2}/></strong><small className={capitalPct >= 0 ? 'positive' : 'negative'}>{capitalPct.toFixed(2)}% <em>period</em></small></article><article><span>Income Return</span><strong><PrivateMoney value={incomeTotal} digits={2}/></strong><small className={incomeTotal >= 0 ? 'positive' : 'negative'}>{holding.cost_aud ? (incomeTotal / holding.cost_aud * 100).toFixed(2) : '0.00'}% <em>period</em></small></article><article><span>Currency Gain</span><strong>{holdingCurrencyGain(holding) === null ? '—' : <PrivateMoney value={holdingCurrencyGain(holding)!} digits={2}/>}</strong><small>{holdingCurrencyGain(holding) === null ? 'Cost base not recorded' : 'Exchange-rate movement'}</small></article><article><span>Total Return</span><strong><PrivateMoney value={totalReturn} digits={2}/></strong><small className={totalPct >= 0 ? 'positive' : 'negative'}>{totalPct.toFixed(2)}% <em>period</em></small></article></div>
      <HoldingChart loading={historyResult?.symbol !== symbol} points={performanceData} symbol={holding.symbol} currency="AUD" mode={mode} onModeChange={setMode} period={period} onPeriodChange={setPeriod}/>
      <section className="holding-overview-grid"><div className="holding-stats-panel"><div className="holding-section-heading"><h2>Key Stats</h2><span>As of {holding.as_of ? date(holding.as_of, { day: 'numeric', month: 'short', year: 'numeric' }) : 'latest sync'}</span></div><dl><div><dt><CircleDollarSign size={14}/>Holding Value</dt><dd>{money(holding.value_aud, 'AUD', 2)}</dd></div><div><dt><Hash size={14}/>Current Quantity</dt><dd>{holding.quantity.toLocaleString('en-AU')}</dd></div><div><dt><ReceiptText size={14}/>Tax Cost Base</dt><dd>{money(holding.cost_aud, 'AUD', 2)} <small>({money(holding.average_cost, holding.currency, 2)} p/s)</small></dd></div><div><dt><Scale size={14}/>Avg Buy Price</dt><dd>{money(holding.average_cost, holding.currency, 3)}</dd></div><div><dt><TrendingUp size={14}/>Dividend Yield</dt><dd>{(annualIncome / Math.max(holding.value_aud, 1) * 100).toFixed(2)}%</dd></div><div><dt><PieChart size={14}/>Portfolio Weight</dt><dd>{(holding.value_aud / Math.max(1, portfolioTotal) * 100).toFixed(2)}%</dd></div></dl></div><HoldingChart loading={historyResult?.symbol !== symbol} points={performanceData} symbol={holding.symbol} currency={holding.currency} price period={pricePeriod} onPeriodChange={setPricePeriod}/></section>
      <PriceSummary movement={marketMovement} loading={marketMovementLoading} error={marketMovementError}/>
    </>}

    {tab === 'Trades' && <section className="holding-ledger holding-audit-ledger"><div className="holding-ledger-title"><div><h2>Trades</h2><p>Every recorded transaction and its imported source.</p></div><label>Rows <select value={pageSize} onChange={(event) => setPageSize(Number(event.target.value))}><option>25</option><option>50</option><option>100</option></select></label></div>{selectedTrades.size > 0 && <div className="holding-selection-bar"><strong>{selectedTrades.size} selected</strong><button onClick={() => setSelectedTrades(new Set())}>Clear</button><button onClick={exportTrades}><Download size={13}/>Export selected</button></div>}{transactions.length ? <div className="holding-table-scroll"><table><thead><tr><th className="holding-check"><input type="checkbox" aria-label="Select all trades" checked={selectedTrades.size === transactions.length} onChange={(event) => setSelectedTrades(event.target.checked ? new Set(transactions.map(transactionKey)) : new Set())}/></th><th><SortButton label="Trade date" column="date" active={tradeSort.column === 'date'} direction={tradeSort.direction} onSort={changeTradeSort}/></th><th><SortButton label="Type" column="type" active={tradeSort.column === 'type'} direction={tradeSort.direction} onSort={changeTradeSort}/></th><th className="numeric"><SortButton label="Quantity" column="quantity" active={tradeSort.column === 'quantity'} direction={tradeSort.direction} onSort={changeTradeSort}/></th><th className="numeric"><SortButton label="Price" column="price" active={tradeSort.column === 'price'} direction={tradeSort.direction} onSort={changeTradeSort}/></th><th className="numeric"><SortButton label="Brokerage" column="fees" active={tradeSort.column === 'fees'} direction={tradeSort.direction} onSort={changeTradeSort}/></th><th className="numeric"><SortButton label="Value" column="amount" active={tradeSort.column === 'amount'} direction={tradeSort.direction} onSort={changeTradeSort}/></th><th aria-label="Details"/></tr></thead><tbody>{sortedTrades.map((item) => { const key = transactionKey(item); const expanded = expandedTrades.has(key); return <Fragment key={key}><tr className={expanded ? 'is-expanded' : ''} onClick={() => toggleSet(setExpandedTrades, key)}><td className="holding-check" onClick={(event) => event.stopPropagation()}><input type="checkbox" aria-label={`Select trade ${key}`} checked={selectedTrades.has(key)} onChange={() => toggleSet(setSelectedTrades, key)}/></td><td>{date(item.date, { day: '2-digit', month: 'short', year: 'numeric' })}</td><td><span className={`holding-trade-type type-${item.type.toLowerCase()}`}>{item.type}</span></td><td className="numeric">{item.quantity || '—'}</td><td className="numeric">{item.price ? money(item.price, item.currency, 2) : '—'}</td><td className="numeric">{money(item.fees, item.currency, 2)}</td><td className="numeric">{money(item.amount, item.currency, 2)}</td><td><button className="holding-expand" aria-label={expanded ? 'Collapse trade details' : 'Expand trade details'}><ChevronDown size={14}/></button></td></tr>{expanded && <tr className="holding-audit-row"><td/><td colSpan={7}><strong>Audit history</strong><dl><div><dt>Imported by</dt><dd>{item.provider.toUpperCase()} · {item.account_name || holding.account_name}</dd></div><div><dt>Source record</dt><dd>{item.provider_external_id}</dd></div><div><dt>Recorded change</dt><dd>{item.type} {item.quantity || ''} {holding.symbol} at {item.price ? money(item.price, item.currency, 2) : 'recorded value'}</dd></div><div><dt>FX rate</dt><dd>{item.fx_rate.toFixed(4)}</dd></div></dl></td></tr>}</Fragment>})}</tbody></table></div> : <EmptyState icon={TrendingUp} title="No trades recorded" description={`No transactions are attached to ${holding.symbol}.`}/>}</section>}

    {tab === 'Income' && <section className="holding-ledger holding-audit-ledger"><div className="holding-ledger-title"><div><h2>Income</h2><p>Distributions grouped by Australian financial year.</p></div>{holding.asset_class?.toLowerCase().includes('etf') && <span className="holding-amit-status">AMIT review required</span>}</div>{selectedIncome.size > 0 && <div className="holding-selection-bar"><strong>{selectedIncome.size} selected</strong><button onClick={() => setSelectedIncome(new Set())}>Clear</button><button onClick={exportIncome}><Download size={13}/>Export selected</button></div>}{income.length ? <div className="holding-table-scroll"><table><thead><tr><th className="holding-check"><input type="checkbox" aria-label="Select all income" checked={selectedIncome.size === income.length} onChange={(event) => setSelectedIncome(event.target.checked ? new Set(income.map(transactionKey)) : new Set())}/></th><th><SortButton label="Date paid" column="date" active={incomeSort.column === 'date'} direction={incomeSort.direction} onSort={changeIncomeSort}/></th><th><SortButton label="Type" column="type" active={incomeSort.column === 'type'} direction={incomeSort.direction} onSort={changeIncomeSort}/></th><th className="numeric"><SortButton label="Gross amount" column="gross" active={incomeSort.column === 'gross'} direction={incomeSort.direction} onSort={changeIncomeSort}/></th><th className="numeric"><SortButton label="Franking credits" column="franking" active={incomeSort.column === 'franking'} direction={incomeSort.direction} onSort={changeIncomeSort}/></th><th className="numeric"><SortButton label="Net dividend" column="net" active={incomeSort.column === 'net'} direction={incomeSort.direction} onSort={changeIncomeSort}/></th></tr></thead><tbody>{incomeYears.map((year) => { const rows = incomeRows.filter((item) => item.year === year); const yearNet = rows.reduce((sum, item) => sum + item.net, 0); const collapsed = collapsedYears.has(year); return <Fragment key={year}><tr className={`holding-year-row ${collapsed ? 'is-collapsed' : ''}`} onClick={() => toggleSet(setCollapsedYears, year)}><td colSpan={6}><button type="button"><ChevronDown size={13}/><strong>{year}</strong><span>{rows.length} payment{rows.length === 1 ? '' : 's'}</span><b>{money(yearNet, holding.currency, 2)}</b></button></td></tr>{!collapsed && rows.map(({ item, gross, franking, net }) => { const key = transactionKey(item); return <tr key={key}><td className="holding-check"><input type="checkbox" aria-label={`Select income ${key}`} checked={selectedIncome.has(key)} onChange={() => toggleSet(setSelectedIncome, key)}/></td><td>{date(item.date, { day: '2-digit', month: 'short', year: 'numeric' })}</td><td>{item.type}<small>{item.description || holding.name}</small></td><td className="numeric">{money(gross, item.currency, 2)}</td><td className="numeric">{franking ? money(franking, item.currency, 2) : '—'}</td><td className="numeric positive">{money(net, item.currency, 2)}</td></tr>})}{!collapsed && <tr className="holding-income-subtotal"><td colSpan={3}>{year} subtotal</td><td className="numeric">{money(rows.reduce((sum, item) => sum + item.gross, 0), holding.currency, 2)}</td><td className="numeric">{money(rows.reduce((sum, item) => sum + item.franking, 0), holding.currency, 2)}</td><td className="numeric">{money(yearNet, holding.currency, 2)}</td></tr>}</Fragment>})}<tr className="holding-income-total"><td colSpan={3}>Grand total</td><td className="numeric">{money(incomeRows.reduce((sum, item) => sum + item.gross, 0), holding.currency, 2)}</td><td className="numeric">{money(incomeRows.reduce((sum, item) => sum + item.franking, 0), holding.currency, 2)}</td><td className="numeric">{money(incomeRows.reduce((sum, item) => sum + item.net, 0), holding.currency, 2)}</td></tr></tbody></table></div> : <EmptyState icon={FileText} title="No income recorded" description={`No distributions are attached to ${holding.symbol}.`}/>}<p className="holding-estimate-note">Gross amounts and franking credits are estimates where the broker feed only supplied a net payment. Confirm them against the issuer tax statement before lodging.</p></section>}

    {tab === 'Notes' && <section className="holding-notes"><MessageSquareText size={20}/><div><h2>Holding notes</h2><p>Keep private research and reminders with this position.</p></div><textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder={`Add a note about ${holding.symbol}…`}/><button onClick={saveNote}>Save note</button></section>}
    {tab === 'Overview' && !isFund(holding) && <SupplyChain key={holding.symbol} embedded embeddedSymbol={holding.symbol}/>}
  </div>
}
