import { useEffect, useState } from 'react'
import type { PortfolioBundle, PortfolioSnapshot } from '../types'
import { fetchMarketHistory, type MarketHistory } from '../lib/marketDataApi'
import { buildDailyPortfolioHistory, historyKey } from '../lib/dailyPortfolioHistory'

const cache = new Map<string, { time: number; value: Promise<MarketHistory> }>()
function history(symbol: string, market: string) {
  const key = historyKey(symbol, market), existing = cache.get(key)
  if (existing && Date.now() - existing.time < 3600000) return existing.value
  const value = fetchMarketHistory(symbol, market).catch(error => { cache.delete(key); throw error })
  cache.set(key, { time: Date.now(), value })
  return value
}

export function useDailyPortfolioHistory(bundle: PortfolioBundle, enabled = true) {
  const [result, setResult] = useState<{ bundle: PortfolioBundle; snapshots: PortfolioSnapshot[]; error: string | null } | null>(null)
  useEffect(() => {
    if (!enabled || !bundle.holdings.length) return
    let cancelled = false
    const requests = new Map<string, [string,string]>()
    bundle.holdings.forEach(p => requests.set(historyKey(p.symbol, p.market || ''), [p.symbol, p.market || '']))
    const currencies = new Set([...bundle.holdings, ...bundle.cash, ...bundle.transactions].map(p => p.currency))
    currencies.forEach(currency => { if (currency !== 'AUD') requests.set(historyKey(`${currency}AUD=X`,'FX'), [`${currency}AUD=X`,'FX']) })
    async function load() {
      try {
        const entries = await Promise.all([...requests].map(async ([key,[symbol,market]]) => [key, await history(symbol,market)] as const))
        const snapshots = buildDailyPortfolioHistory(bundle, new Map(entries), new Date().toISOString())
        if (!cancelled) setResult({ bundle, snapshots, error: null })
      } catch (error) {
        if (!cancelled) setResult({ bundle, snapshots: bundle.snapshots, error: error instanceof Error ? error.message : 'Daily history could not be loaded.' })
      }
    }
    void load()
    return () => { cancelled = true }
  }, [bundle, enabled])
  const current = result?.bundle === bundle ? result : null
  return { snapshots: current?.snapshots ?? bundle.snapshots, loading: enabled && !!bundle.holdings.length && !current, error: current?.error, daily: !!current && !current.error }
}
