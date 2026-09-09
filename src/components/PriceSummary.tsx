import type { MarketMovement } from '../lib/marketDataApi'
import { date, money } from '../lib/format'

export function PriceSummary({ movement, loading, error }: { movement: MarketMovement | null; loading: boolean; error: string | null }) {
  const items = [...(movement?.items || [])].sort((a, b) => a.date.localeCompare(b.date))
  const first = items[0], latest = items.at(-1)
  const change = first && latest && first.previousPrice > 0 ? (latest.price / first.previousPrice - 1) * 100 : null
  const low = Math.min(...items.map(item => item.price))
  const high = Math.max(...items.map(item => item.price))
  const finalChange = latest && latest.previousPrice > 0 ? (latest.price / latest.previousPrice - 1) * 100 : 0
  const reports = [...items].filter(item => item.sources.some(source => /^https?:\/\//i.test(source.url)) && item.headline && !/\?/.test(item.headline)).sort((a,b) => b.date.localeCompare(a.date) || Math.abs(b.changePercent) - Math.abs(a.changePercent)).filter((item,index,rows) => rows.findIndex(row => row.headline === item.headline || row.sources[0]?.title === item.sources[0]?.title) === index).slice(0,2)
  const sources = [...new Map(reports.flatMap(item => item.sources).filter(source => /^https?:\/\//i.test(source.url)).map(source => [source.url, source])).values()]
  return <section className="price-summary" aria-label="Price summary"><h2>Price summary</h2>
    {loading ? <p role="status">Loading the latest market summary…</p> : !latest || !first || change === null ? <p>{error ? 'The latest market summary is temporarily unavailable.' : 'No recent price data is available yet.'}</p> : <>
      <p>{movement!.symbol} {change >= 0 ? 'rose' : 'fell'} {Math.abs(change).toFixed(2)}% across {date(first.date, { day: 'numeric', month: 'short' })}–{date(latest.date, { day: 'numeric', month: 'short', year: 'numeric' })}, closing at {money(latest.price, movement!.currency, 2)}. {items.length > 1 && <>Recorded closing prices ranged from {money(low, movement!.currency, 2)} to {money(high, movement!.currency, 2)}; the latest session {finalChange === 0 ? 'was unchanged' : `${finalChange > 0 ? 'gained' : 'lost'} ${Math.abs(finalChange).toFixed(2)}%`}. </>}{reports.length ? <>Reporting around these sessions focused on {reports.map((item,index) => <span key={item.date}>{index > 0 && '; '}<a href={item.sources[0].url} target="_blank" rel="noreferrer">{item.headline.replace(/\s+-\s+[^-]+$/, '').split(/\s+/).slice(0,22).join(' ')}{item.headline.replace(/\s+-\s+[^-]+$/, '').split(/\s+/).length > 22 ? '…' : ''}</a> ({item.sources[0].title})</span>)}. Coverage describes the reported developments; it does not isolate their contribution to the return.</> : <>No matching company report was returned for these sessions. The price figures above remain available; check the linked market coverage for newly published developments.</>}</p>
      <div className="price-summary-sources"><span>Updated {date(movement!.generatedAt, { day: 'numeric', month: 'short' })}</span>{!sources.length && <a href={`https://finance.yahoo.com/quote/${encodeURIComponent(movement!.symbol)}/news/`} target="_blank" rel="noreferrer">Market coverage</a>}{sources.map(source => <a key={source.url} href={source.url} target="_blank" rel="noreferrer">{source.title}</a>)}</div>
    </>}
  </section>
}
