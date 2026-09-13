import type { PortfolioBundle, PortfolioSnapshot, Transaction } from '../types'
import type { MarketHistory } from './marketDataApi'

const DAY = 86400000
const day = (value: string) => value.slice(0, 10)
export const historyKey = (symbol: string, market = '') => `${symbol.toUpperCase()}|${market.toUpperCase()}`
const accountKey = (provider: string, account?: string | null) => `${provider}|${account || ''}`
const round = (value: number) => Math.round(value * 100) / 100

/** Reconstruct closing valuations backwards from the current balances and recorded ledger.
 * Prices and FX are observed closes, never interpolation between monthly snapshots.
 */
export function buildDailyPortfolioHistory(bundle: PortfolioBundle, histories: Map<string, MarketHistory>, endDate: string): PortfolioSnapshot[] {
  const end = Date.parse(day(endDate))
  const firstRecord = bundle.snapshots.map(p => Date.parse(day(p.date))).filter(Number.isFinite).sort((a,b) => a-b)[0]
  const start = Math.max(end - 365 * DAY, firstRecord ?? end - 365 * DAY)
  if (!Number.isFinite(end) || !bundle.holdings.length) return []
  histories.forEach(h => {
    if (h.splits?.some(s => Date.parse(day(s.date)) >= start && Date.parse(day(s.date)) <= end)) throw new Error(`Daily history for ${h.symbol} needs its stock split reconciled first.`)
  })
  const positions = bundle.holdings.map(p => ({ ...p, quantity: Number(p.quantity) }))
  const trades = bundle.transactions.filter(t => Date.parse(day(t.date)) >= start && Date.parse(day(t.date)) <= end)
    .sort((a,b) => b.date.localeCompare(a.date))
  const cash = new Map<string, { currency: string; amount: number }>()
  bundle.cash.forEach(c => {
    const key = `${accountKey(c.provider, c.account_name)}|${c.currency}`
    cash.set(key, { currency: c.currency, amount: (cash.get(key)?.amount || 0) + Number(c.balance) })
  })
  const prices = new Map<string, Array<{ date: string; price: number }>>()
  histories.forEach((h,key) => prices.set(key, [...h.points].filter(p => Number.isFinite(p.price) && p.price > 0).sort((a,b) => a.date.localeCompare(b.date))))
  function close(key: string, date: string) {
    const series = prices.get(key) || []
    let lo = 0, hi = series.length - 1, found = -1
    while (lo <= hi) { const mid = (lo + hi) >>> 1; if (day(series[mid].date) <= date) { found = mid; lo = mid + 1 } else hi = mid - 1 }
    if (found < 0 || Date.parse(date) - Date.parse(day(series[found].date)) > 7 * DAY) throw new Error(`Daily history is missing for ${key.split('|')[0]} on ${date}.`)
    return series[found].price
  }
  function fx(currency: string, date: string) { return currency === 'AUD' ? 1 : close(historyKey(`${currency}AUD=X`, 'FX'), date) }
  function reverse(t: Transaction) {
    const type = t.type.toUpperCase()
    if (!['BUY','SELL','DIVIDEND','DISTRIBUTION','INTEREST','DEPOSIT','WITHDRAWAL','FEE','TAX'].includes(type)) throw new Error(`Review ${type} activity before calculating daily history.`)
    if (type === 'BUY' || type === 'SELL') {
      const matches = positions.filter(p => p.symbol === t.symbol && accountKey(p.provider, p.account_name) === accountKey(t.provider, t.account_name))
      if (matches.length !== 1) throw new Error(`Daily history needs the recorded position and market for ${t.symbol}.`)
      matches[0].quantity += (type === 'BUY' ? -1 : 1) * Math.abs(t.quantity)
      if (matches[0].quantity < -0.000001) throw new Error(`Trade history does not reconcile for ${t.symbol}.`)
    }
    const prefix = accountKey(t.provider, t.account_name)
    const localKey = `${prefix}|${t.currency}`, audKey = `${prefix}|AUD`
    const key = cash.has(localKey) ? localKey : cash.has(audKey) ? audKey : localKey
    const currency = cash.get(key)?.currency || t.currency
    const rate = currency === t.currency ? 1 : Number(t.fx_rate)
    if (!Number.isFinite(rate) || rate <= 0) throw new Error(`Missing cash conversion for ${t.symbol || type}.`)
    const outgoing = ['BUY','WITHDRAWAL','FEE','TAX'].includes(type)
    const change = (outgoing ? -1 : 1) * Math.abs(t.amount) - (['BUY','SELL'].includes(type) ? Math.abs(t.fees) : 0)
    cash.set(key, { currency, amount: (cash.get(key)?.amount || 0) - change * rate })
  }
  const output: PortfolioSnapshot[] = []
  let index = 0
  for (let time = end; time >= start; time -= DAY) {
    const date = new Date(time).toISOString().slice(0,10)
    while (index < trades.length && day(trades[index].date) > date) reverse(trades[index++])
    const holdingsValue = positions.reduce((sum,p) => {
      if (Math.abs(p.quantity) < 0.000001) return sum
      const key = historyKey(p.symbol, p.market || '')
      if (histories.get(key)?.currency !== p.currency) throw new Error(`Price currency mismatch for ${p.symbol}.`)
      return sum + p.quantity * close(key, date) * fx(p.currency, date)
    }, 0)
    const cashValue = [...cash.values()].reduce((sum,c) => sum + c.amount * fx(c.currency, date), 0)
    output.push({ date, value_aud: round(holdingsValue + cashValue), cash_aud: round(cashValue), invested_aud: round(holdingsValue), source: 'daily-market-ledger' })
  }
  return output.reverse()
}
