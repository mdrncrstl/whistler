import type { PortfolioBundle } from '../types'
import type { MarketSnapshot } from './marketDataApi'

function key(symbol: string, market?: string | null) {
  return `${symbol.trim().toUpperCase()}|${String(market || '').trim().toUpperCase()}`
}

function round(value: number, digits = 4) {
  const factor = 10 ** digits
  return Math.round((value + Number.EPSILON) * factor) / factor
}

export function applyMarketSnapshot(bundle: PortfolioBundle, snapshot: MarketSnapshot) {
  const quoteByPosition = new Map(snapshot.quotes.map((quote) => [key(quote.requestedSymbol, quote.requestId.split(':')[1]), quote]))
  const quoteBySymbol = new Map(snapshot.quotes.map((quote) => [quote.requestedSymbol.toUpperCase(), quote]))
  let updated = 0

  const holdings = bundle.holdings.map((holding) => {
    const quote = quoteByPosition.get(key(holding.symbol, holding.market)) || quoteBySymbol.get(holding.symbol.toUpperCase())
    if (!quote || !Number.isFinite(quote.price) || quote.price <= 0) return holding
    const holdingCurrency = holding.currency.toUpperCase()
    if (quote.currency && holdingCurrency && quote.currency !== holdingCurrency) return holding
    const fxQuote = snapshot.fx[holdingCurrency]
    const fxRate = holdingCurrency === 'AUD' ? 1 : Number(fxQuote?.rate)
    if (!Number.isFinite(fxRate) || fxRate <= 0) return holding

    updated += 1
    const valueAud = holding.quantity * quote.price * fxRate
    const gainAud = valueAud - holding.cost_aud
    return {
      ...holding,
      current_price: round(quote.price),
      fx_rate: round(fxRate, 6),
      value_aud: round(valueAud, 2),
      unrealised_gain_aud: round(gainAud, 2),
      return_pct: holding.cost_aud ? round(gainAud / holding.cost_aud * 100, 2) : 0,
      day_change_aud: round(holding.quantity * quote.change * fxRate, 2),
      as_of: quote.asOf,
    }
  })

  if (!updated) return { bundle, updated: 0, failed: bundle.holdings.length }
  const cashAud = bundle.cash.reduce((sum, cash) => sum + Number(cash.value_aud || 0), 0)
  const investedAud = holdings.reduce((sum, holding) => sum + Number(holding.value_aud || 0), 0)
  const snapshotDate = snapshot.generatedAt.slice(0, 10)
  const snapshots = [...bundle.snapshots]
  const latest = snapshots.at(-1)
  const current = {
    date: snapshotDate,
    value_aud: round(investedAud + cashAud, 2),
    cash_aud: round(cashAud, 2),
    invested_aud: round(latest?.invested_aud ?? holdings.reduce((sum, holding) => sum + Number(holding.cost_aud || 0), 0), 2),
    benchmark_value_aud: latest?.benchmark_value_aud ?? null,
    source: 'market-data',
  }
  const existingIndex = snapshots.findIndex((item) => (item.snapshot_date || item.date) === snapshotDate)
  if (existingIndex >= 0) snapshots[existingIndex] = { ...snapshots[existingIndex], ...current }
  else snapshots.push(current)
  snapshots.sort((a, b) => (a.snapshot_date || a.date).localeCompare(b.snapshot_date || b.date))

  return { bundle: { ...bundle, holdings, snapshots }, updated, failed: bundle.holdings.length - updated }
}
