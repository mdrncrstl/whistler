import type { Position } from '../types'
import type { FinancePeriod } from './financePeriods'

export type MarketHistoryPeriod = FinancePeriod | 'MAX'
export interface MarketHistoryPoint { date: string; price: number; adjustedPrice?: number; open?: number; high?: number; low?: number; close?: number; volume?: number }
export interface MarketHistory { symbol: string; currency: string; exchange: string; source: string; generatedAt: string; period?: MarketHistoryPeriod; interval?: string; points: MarketHistoryPoint[]; splits?: Array<{ date: string; numerator: number; denominator: number }> }

export interface MarketMovementItem {
  date: string
  price: number
  previousPrice: number
  change: number
  changePercent: number
  direction: 'up' | 'down' | 'flat'
  headline: string
  description: string
  context: string
  sources: Array<{ title: string; url: string }>
}

export interface MarketMovement {
  symbol: string
  name: string
  currency: string
  exchange: string
  generatedAt: string
  provider: 'news' | 'market-data'
  source: string
  sourceNote: string
  items: MarketMovementItem[]
}

export interface MarketQuote {
  requestId: string
  requestedSymbol: string
  ticker: string
  name: string
  exchange: string
  currency: string
  price: number
  previousClose: number
  change: number
  changePercent: number
  asOf: string
  marketState: 'open' | 'closed'
  ageMinutes: number
  source: string
}

export interface FxQuote { currency: string; rate: number | null; asOf: string | null; source: string }
export interface MarketSnapshot {
  generatedAt: string
  baseCurrency: 'AUD'
  source: string
  quotes: MarketQuote[]
  fx: Record<string, FxQuote>
  failures: Array<{ requestId: string; symbol: string; market: string; error: string }>
}

export type MarketDataStatus = 'idle' | 'loading' | 'ready' | 'partial' | 'error'
export interface MarketDataState {
  status: MarketDataStatus
  source: string | null
  generatedAt: string | null
  updated: number
  failed: number
  message: string | null
}

export function marketHistoryResolution(period: MarketHistoryPeriod) {
  if (period === '1D') return { interval: '5m', label: '5-minute data' }
  if (period === '5D' || period === '1W') return { interval: '15m', label: '15-minute data' }
  if (period === '1M') return { interval: '1h', label: 'Hourly data' }
  return { interval: '1d', label: 'Daily data' }
}

export function mergeMarketHistoryPoints(base: MarketHistoryPoint[], supplemental: MarketHistoryPoint[]) {
  if (!supplemental.length) return [...base].sort((a, b) => Date.parse(a.date) - Date.parse(b.date))
  const supplementalDays = new Set(supplemental.map((point) => point.date.slice(0, 10)))
  const byTimestamp = new Map<number, MarketHistoryPoint>()
  base.filter((point) => !supplementalDays.has(point.date.slice(0, 10))).forEach((point) => byTimestamp.set(Date.parse(point.date), point))
  supplemental.forEach((point) => byTimestamp.set(Date.parse(point.date), point))
  return [...byTimestamp.values()].sort((a, b) => Date.parse(a.date) - Date.parse(b.date))
}

export async function fetchMarketHistory(symbol: string, market: string, signal?: AbortSignal, options: { period?: MarketHistoryPeriod } = {}) {
  const params = new URLSearchParams({ symbol, market })
  if (options.period) params.set('period', options.period)
  const response = await fetch(`/api/market-history?${params.toString()}`, { signal })
  let payload: MarketHistory & { error?: string }
  try { payload = await response.json() as MarketHistory & { error?: string } }
  catch { throw new Error('Daily market history is unavailable in this runtime.') }
  if (!response.ok) throw new Error(payload.error || `Market history request failed (${response.status}).`)
  return payload
}

export async function fetchMarketMovement(symbol: string, market: string, signal?: AbortSignal) {
  const response = await fetch(`/api/market-movement?symbol=${encodeURIComponent(symbol)}&market=${encodeURIComponent(market)}`, { signal })
  let payload: MarketMovement & { error?: string }
  try { payload = await response.json() as MarketMovement & { error?: string } }
  catch { throw new Error('Daily price movement is unavailable in this runtime.') }
  if (!response.ok) throw new Error(payload.error || `Daily movement request failed (${response.status}).`)
  return payload
}

export async function fetchMarketSnapshot(holdings: Position[], signal?: AbortSignal, force = false) {
  const unique = new Map<string, Position>()
  holdings.forEach((holding) => unique.set(`${holding.symbol.toUpperCase()}|${String(holding.market || '').toUpperCase()}|${holding.currency.toUpperCase()}`, holding))
  const params = new URLSearchParams()
  unique.forEach((holding) => params.append('symbol', [holding.symbol, holding.market || '', holding.currency].map(encodeURIComponent).join('|')))
  if (force) params.set('refresh', String(Date.now()))
  const response = await fetch(`/api/market-data?${params}`, { signal, cache: force ? 'no-store' : 'default' })
  let payload: MarketSnapshot & { error?: string }
  try { payload = await response.json() as MarketSnapshot & { error?: string } }
  catch { throw new Error('Market data returned an invalid response.') }
  if (!response.ok || !payload.quotes?.length) throw new Error(payload.error || `Market data request failed (${response.status}).`)
  return payload
}

export function marketFreshnessLabel(state: MarketDataState) {
  if (state.status === 'idle') return 'Preparing market data…'
  if (state.status === 'loading') return 'Refreshing market data…'
  if (state.status === 'error') return 'Market data unavailable'
  if (state.status === 'ready' && state.message && !state.source) {
    return state.message === 'No open holdings to price.' ? 'No holdings to price' : state.message
  }
  if (!state.generatedAt || !state.source) return 'Market data unavailable'
  const ageMinutes = Math.max(0, Math.floor((Date.now() - new Date(state.generatedAt).getTime()) / 60000))
  const age = ageMinutes < 1 ? 'Just now' : ageMinutes === 1 ? '1 min ago' : `${ageMinutes} min ago`
  return `${age}${state.failed ? ` · ${state.failed} unavailable` : ''}`
}
