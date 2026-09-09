import { ExternalLink, Minus, TrendingDown, TrendingUp } from 'lucide-react'
import type { MarketMovement, MarketMovementItem } from '../lib/marketDataApi'
import { date, money, percent } from '../lib/format'

function MovementIcon({ direction }: { direction: MarketMovementItem['direction'] }) {
  if (direction === 'up') return <TrendingUp size={14} aria-hidden="true" />
  if (direction === 'down') return <TrendingDown size={14} aria-hidden="true" />
  return <Minus size={14} aria-hidden="true" />
}

function MovementRow({ item, currency, provider }: { item: MarketMovementItem; currency: string; provider: MarketMovement['provider'] }) {
  const changeTone = item.direction === 'up' ? 'positive' : item.direction === 'down' ? 'negative' : 'neutral'
  const hasArticleContext = provider === 'news' && Boolean(item.context) && item.context !== 'No verified company-specific catalyst was supplied by the market data feed.'
  return (
    <li className="holding-movement-entry">
      <div className="holding-movement-date"><strong>{date(item.date, { day: 'numeric', month: 'short' })}</strong><small>{date(item.date, { weekday: 'short' })}</small></div>
      <span className={`holding-movement-marker direction-${item.direction}`} aria-hidden="true"><MovementIcon direction={item.direction} /></span>
      <div className="holding-movement-copy">
        <div className="holding-movement-entry-head"><strong>{item.headline}</strong><span className={`holding-movement-change ${changeTone}`}>{percent(item.changePercent)} · {money(item.price, currency, 2)}</span></div>
        {hasArticleContext ? <><p className="holding-movement-context">{item.context}</p><p className="holding-movement-price">{item.description}</p></> : <p className="holding-movement-price holding-movement-price-only">{item.description}</p>}
        {item.sources.length > 0 && <div className="holding-movement-sources">{item.sources.slice(0, 3).map((source) => <a key={`${item.date}-${source.url}`} href={source.url} target="_blank" rel="noreferrer">{source.title}<ExternalLink size={11} aria-hidden="true" /></a>)}</div>}
      </div>
    </li>
  )
}

export function DailyMovementTimeline({ movement, loading = false, error = null }: { movement: MarketMovement | null; loading?: boolean; error?: string | null }) {
  const items = movement?.items || []
  return (
    <section className="holding-movement" aria-label="Recent price movement">
      <div className="holding-movement-heading">
        <div><h2>Recent price movement</h2><p>One entry for each of the latest trading sessions.</p></div>
        {movement && <div className="holding-movement-source"><span>{movement.source}</span><small>{items.length} {items.length === 1 ? 'session' : 'sessions'}</small></div>}
      </div>
      {loading && <div className="holding-movement-loading" role="status"><span /><span /><span />Loading recent movement…</div>}
      {!loading && error && <div className="holding-movement-state"><strong>Recent movement unavailable</strong><p>{error}</p></div>}
      {!loading && !error && !items.length && <div className="holding-movement-state"><strong>No recent sessions available</strong><p>Daily movement will appear when the market history feed returns valid closes.</p></div>}
      {!loading && !error && items.length > 0 && <ol className="holding-movement-list">{items.slice().reverse().map((item) => <MovementRow key={item.date} item={item} currency={movement?.currency || 'AUD'} provider={movement?.provider || 'market-data'} />)}</ol>}
      {movement && <p className="holding-movement-note">{movement.sourceNote}</p>}
    </section>
  )
}
