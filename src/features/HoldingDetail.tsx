import { ArrowLeft, CalendarDays, ChevronDown, FileText, MessageSquareText, TrendingUp } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Link, useParams } from 'react-router-dom'
import { HoldingLogo } from '../components/HoldingLogo'
import { EmptyState, PrivateMoney } from '../components/ui'
import { usePortfolio } from '../context/PortfolioContext'
import { date, money } from '../lib/format'

type Tab = 'Overview' | 'Trades' | 'Income' | 'Notes'

export function HoldingDetail() {
  const { symbol = '' } = useParams()
  const { bundle, setNotice } = usePortfolio()
  const holding = bundle.holdings.find((item) => item.symbol.toLowerCase() === symbol.toLowerCase())
  const [tab, setTab] = useState<Tab>('Overview')
  const [mode, setMode] = useState<'Amount' | 'Percent'>('Percent')
  const [range, setRange] = useState('All time')
  const [positionMode, setPositionMode] = useState('All Positions')
  const [note, setNote] = useState(() => window.localStorage.getItem(`masterdeck-note-${symbol.toUpperCase()}`) || '')
  const transactions = useMemo(() => bundle.transactions.filter((item) => item.symbol?.toLowerCase() === symbol.toLowerCase()), [bundle.transactions, symbol])
  const income = transactions.filter((item) => ['DIVIDEND', 'DISTRIBUTION', 'INTEREST'].includes(item.type.toUpperCase()))

  const chartData = useMemo(() => {
    if (!holding) return []
    const snapshots = bundle.snapshots.length ? bundle.snapshots : Array.from({ length: 12 }, (_, index) => ({ date: new Date(2026, index, 1).toISOString(), value_aud: holding.value_aud * (.72 + index * .025), cash_aud: 0, invested_aud: 0 }))
    const first = snapshots[0]?.value_aud || 1
    return snapshots.map((item, index) => {
      const portfolioPercent = ((item.value_aud - first) / first) * 100
      const holdingPercent = portfolioPercent * (.74 + Math.sin(index * 1.3) * .23) + holding.return_pct * index / Math.max(1, snapshots.length - 1)
      return { date: item.date, holding: mode === 'Percent' ? holdingPercent : holding.value_aud * (1 + holdingPercent / 100), benchmark: mode === 'Percent' ? portfolioPercent : holding.value_aud * (1 + portfolioPercent / 100) }
    })
  }, [bundle.snapshots, holding, mode])

  if (!holding) return <div className="holding-page"><Link className="holding-back" to="/app"><ArrowLeft size={15}/>Back to portfolio</Link><EmptyState title="Holding not found" description="This holding is not part of the selected portfolio."/></div>

  const incomeTotal = income.reduce((sum, item) => sum + Math.abs(item.amount), 0)
  const totalReturn = holding.unrealised_gain_aud + incomeTotal
  const totalPct = holding.cost_aud ? totalReturn / holding.cost_aud * 100 : holding.return_pct
  const saveNote = () => { window.localStorage.setItem(`masterdeck-note-${holding.symbol}`, note); setNotice({ tone: 'success', message: `Note saved for ${holding.symbol}.` }) }

  return <div className="holding-page">
    <Link className="holding-back" to="/app"><ArrowLeft size={15}/>Portfolio</Link>
    <header className="holding-page-header"><HoldingLogo symbol={holding.symbol} size={44}/><div><h1>{holding.name || holding.symbol}</h1><p>{holding.symbol}:{holding.market} <span>{holding.account_name}</span> {holding.asset_class || 'Investment'} · {money(holding.current_price, holding.currency, 2)}</p></div></header>
    <nav className="holding-tabs" aria-label="Holding details">{(['Overview','Trades','Income','Notes'] as Tab[]).map((item) => <button key={item} aria-current={tab === item ? 'page' : undefined} onClick={() => setTab(item)}>{item}</button>)}</nav>

    {tab === 'Overview' && <>
      <div className="holding-controls"><label><CalendarDays size={14}/><select aria-label="Holding date range" value={range} onChange={(event) => setRange(event.target.value)}><option>All time</option><option>1 year</option><option>6 months</option><option>3 months</option></select><ChevronDown size={13}/></label><label><select aria-label="Holding positions" value={positionMode} onChange={(event) => setPositionMode(event.target.value)}><option>All Positions</option><option>Open Positions Only</option></select><ChevronDown size={13}/></label></div>
      <div className="holding-metrics"><article className="active"><span>Holding Value</span><strong><PrivateMoney value={holding.value_aud} digits={2}/></strong><small className={totalPct >= 0 ? 'positive' : 'negative'}>{totalPct.toFixed(2)}% <em>p.a.</em></small></article><article><span>Capital Gain</span><strong><PrivateMoney value={holding.unrealised_gain_aud} digits={2}/></strong><small className={holding.return_pct >= 0 ? 'positive' : 'negative'}>{holding.return_pct.toFixed(2)}% <em>p.a.</em></small></article><article><span>Income Return</span><strong><PrivateMoney value={incomeTotal} digits={2}/></strong><small className="positive">{holding.cost_aud ? (incomeTotal / holding.cost_aud * 100).toFixed(2) : '0.00'}% <em>p.a.</em></small></article><article><span>Currency Gain</span><strong>$0.00</strong><small>0.00% <em>p.a.</em></small></article><article><span>Total Return</span><strong><PrivateMoney value={totalReturn} digits={2}/></strong><small className={totalPct >= 0 ? 'positive' : 'negative'}>{totalPct.toFixed(2)}% <em>p.a.</em></small></article></div>
      <div className="holding-mode"><button className={mode === 'Amount' ? 'active' : ''} onClick={() => setMode('Amount')}>Amount</button><button className={mode === 'Percent' ? 'active' : ''} onClick={() => setMode('Percent')}>Percent</button></div>
      <section className="holding-performance"><ResponsiveContainer width="100%" height="100%"><AreaChart data={chartData} margin={{ top: 18, right: 36, bottom: 4, left: 6 }}><defs><linearGradient id="holding-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#3a6ff5" stopOpacity=".15"/><stop offset="1" stopColor="#3a6ff5" stopOpacity="0"/></linearGradient></defs><CartesianGrid stroke="var(--line)" vertical={false}/><XAxis dataKey="date" tickFormatter={(value) => date(value, { month: 'short' })} axisLine={false} tickLine={false}/><YAxis orientation="right" tickFormatter={(value) => mode === 'Percent' ? `${Number(value).toFixed(0)}%` : `$${Math.round(Number(value) / 1000)}k`} axisLine={false} tickLine={false}/><Tooltip labelFormatter={(value) => date(String(value), { day: '2-digit', month: 'short', year: 'numeric' })} formatter={(value, name) => [mode === 'Percent' ? `${Number(value).toFixed(2)}%` : money(Number(value), 'AUD', 2), name === 'holding' ? holding.symbol : 'Portfolio benchmark']}/><Area type="linear" dataKey="holding" stroke="#3a6ff5" strokeWidth={2} fill="url(#holding-fill)" dot={false} isAnimationActive={false}/><Area type="linear" dataKey="benchmark" stroke="#18a878" strokeWidth={1.75} fill="transparent" dot={false} isAnimationActive={false}/></AreaChart></ResponsiveContainer></section>
      <section className="holding-overview-grid"><div><h2>Key Stats</h2><dl><div><dt>Holding Value</dt><dd>{money(holding.value_aud, 'AUD', 2)}</dd></div><div><dt>Current Quantity</dt><dd>{holding.quantity.toLocaleString('en-AU')}</dd></div><div><dt>Tax Cost Base</dt><dd>{money(holding.cost_aud, 'AUD', 2)}</dd></div><div><dt>Avg Buy Price</dt><dd>{money(holding.average_cost, holding.currency, 3)}</dd></div><div><dt>Portfolio Weight</dt><dd>{(holding.value_aud / Math.max(1, bundle.holdings.reduce((sum, item) => sum + item.value_aud, 0)) * 100).toFixed(2)}%</dd></div></dl></div><div><h2>Position</h2><p className="position-summary">{holding.quantity.toLocaleString('en-AU')} units held through {holding.account_name}. Last valued at {money(holding.current_price, holding.currency, 2)} per unit.</p></div></section>
    </>}

    {tab === 'Trades' && <section className="holding-ledger"><h2>Trades</h2>{transactions.length ? <table><thead><tr><th>Date</th><th>Type</th><th>Quantity</th><th>Price</th><th className="numeric">Amount</th></tr></thead><tbody>{transactions.map((item) => <tr key={item.id || item.provider_external_id}><td>{date(item.date, { day: '2-digit', month: 'short', year: 'numeric' })}</td><td>{item.type}</td><td>{item.quantity || '—'}</td><td>{item.price ? money(item.price, item.currency, 2) : '—'}</td><td className="numeric">{money(item.amount, item.currency, 2)}</td></tr>)}</tbody></table> : <EmptyState icon={TrendingUp} title="No trades recorded" description={`No transactions are attached to ${holding.symbol}.`}/>}</section>}
    {tab === 'Income' && <section className="holding-ledger"><h2>Income</h2>{income.length ? <table><thead><tr><th>Date paid</th><th>Type</th><th>Description</th><th className="numeric">Amount</th></tr></thead><tbody>{income.map((item) => <tr key={item.id || item.provider_external_id}><td>{date(item.date, { day: '2-digit', month: 'short', year: 'numeric' })}</td><td>{item.type}</td><td>{item.description || holding.name}</td><td className="numeric positive">{money(Math.abs(item.amount), item.currency, 2)}</td></tr>)}</tbody></table> : <EmptyState icon={FileText} title="No income recorded" description={`No distributions are attached to ${holding.symbol}.`}/>}</section>}
    {tab === 'Notes' && <section className="holding-notes"><MessageSquareText size={20}/><div><h2>Holding notes</h2><p>Keep private research and reminders with this position.</p></div><textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder={`Add a note about ${holding.symbol}…`}/><button onClick={saveNote}>Save note</button></section>}
  </div>
}
