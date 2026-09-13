import type { PortfolioBundle, PortfolioSnapshot, Transaction } from '../types'
import type { MarketHistory } from './marketDataApi'

const DAY = 86400000
const day = (value: string) => value.slice(0, 10)
export const historyKey = (symbol: string, market = '') => `${symbol.toUpperCase()}|${market.toUpperCase()}`
const accountKey = (provider: string, account?: string | null) => `${provider}|${account || ''}`
const round = (value: number) => Math.round(value * 100) / 100
const incomeTypes = new Set(['DIVIDEND', 'DISTRIBUTION', 'INTEREST'])
const positionKey = (provider: string, account: string | null | undefined, symbol: string) => `${accountKey(provider, account)}|${symbol.toUpperCase()}`

type PositionState = {
  key: string
  symbol: string
  market: string
  currency: string
  quantity: number
  costLocal: number
  costAud: number
}

function transactionIncome(t: Transaction) {
  return incomeTypes.has(String(t.type).toUpperCase()) ? Math.abs(Number(t.amount || 0) * Number(t.fx_rate || 1)) : 0
}

function buildDemoPortfolioHistory(bundle: PortfolioBundle): PortfolioSnapshot[] {
  const recorded = [...bundle.snapshots]
    .map(snapshot => ({ ...snapshot, time: Date.parse(day(snapshot.date)) }))
    .filter(snapshot => Number.isFinite(snapshot.time))
    .sort((a, b) => a.time - b.time)
  if (recorded.length < 2) return bundle.snapshots

  const cost = bundle.holdings.reduce((sum, holding) => sum + Math.abs(Number(holding.cost_aud || 0)), 0)
  const cash = bundle.cash.reduce((sum, item) => sum + Number(item.value_aud || item.balance || 0), 0)
  const currentValue = bundle.holdings.reduce((sum, holding) => sum + Number(holding.value_aud || 0), 0) + cash
  const currencyGain = bundle.holdings.reduce((sum, holding) => {
    const localCost = Number(holding.average_cost || 0) * Number(holding.quantity || 0)
    const costAud = Number(holding.cost_aud || 0)
    const rate = Number(holding.fx_rate || 0)
    if (!localCost || !costAud || !rate) return sum
    return sum + localCost * (rate - costAud / localCost)
  }, 0)
  const income = bundle.transactions
    .filter(transaction => transactionTypesForHistory(transaction))
    .map(transaction => ({ time: Date.parse(day(transaction.date)), value: transactionIncome(transaction) }))
    .filter(item => Number.isFinite(item.time))
  const historyEnd = Math.max(recorded.at(-1)!.time, ...income.map(item => item.time))
  const valueAt = (time: number) => {
    if (time === historyEnd) return currentValue
    const nextIndex = recorded.findIndex(snapshot => snapshot.time >= time)
    if (nextIndex <= 0) return recorded[0].value_aud
    if (nextIndex === -1) return recorded.at(-1)!.value_aud
    const previous = recorded[nextIndex - 1]
    const next = recorded[nextIndex]
    const progress = (time - previous.time) / Math.max(next.time - previous.time, 1)
    return previous.value_aud + (next.value_aud - previous.value_aud) * progress
  }
  const output: PortfolioSnapshot[] = []
  for (let time = recorded[0].time; time <= historyEnd; time += DAY) {
    const date = new Date(time).toISOString().slice(0, 10)
    const portfolioValue = valueAt(time)
    const incomeValue = income.filter(item => item.time <= time).reduce((sum, item) => sum + item.value, 0)
    const capitalGain = portfolioValue - cash - cost - currencyGain
    output.push({
      date,
      value_aud: round(portfolioValue),
      cash_aud: round(cash),
      invested_aud: round(portfolioValue - cash),
      capital_gain_aud: round(capitalGain),
      currency_gain_aud: round(currencyGain),
      income_aud: round(incomeValue),
      total_return_aud: round(capitalGain + currencyGain + incomeValue),
      source: 'demo-recorded-ledger',
    })
  }
  return output
}

function transactionTypesForHistory(transaction: Transaction) {
  return incomeTypes.has(String(transaction.type).toUpperCase())
}

/** Reconstruct closing valuations backwards from the current balances and recorded ledger.
 * Prices and FX are observed closes, never interpolation between monthly snapshots.
 */
export function buildDailyPortfolioHistory(bundle: PortfolioBundle, histories: Map<string, MarketHistory>, endDate: string): PortfolioSnapshot[] {
  if (bundle.demo) return buildDemoPortfolioHistory(bundle)
  const end = Date.parse(day(endDate))
  const firstRecord = bundle.snapshots.map(p => Date.parse(day(p.date))).filter(Number.isFinite).sort((a,b) => a-b)[0]
  const start = Math.max(end - 365 * DAY, firstRecord ?? end - 365 * DAY)
  if (!Number.isFinite(end) || !bundle.holdings.length) return []
  histories.forEach(h => {
    if (h.splits?.some(s => Date.parse(day(s.date)) >= start && Date.parse(day(s.date)) <= end)) throw new Error(`Daily history for ${h.symbol} needs its stock split reconciled first.`)
  })
  const positions = bundle.holdings.map(p => ({ ...p, quantity: Number(p.quantity) }))
  const positionStates: PositionState[] = positions.map(p => ({
    key: positionKey(p.provider, p.account_name, p.symbol),
    symbol: p.symbol,
    market: p.market || '',
    currency: p.currency,
    quantity: p.quantity,
    costLocal: Math.abs(Number(p.average_cost || 0) * p.quantity),
    costAud: Math.abs(Number(p.cost_aud || 0)),
  }))
  const trades = bundle.transactions.filter(t => Date.parse(day(t.date)) >= start && Date.parse(day(t.date)) <= end)
    .sort((a,b) => b.date.localeCompare(a.date))
  let incomeTotal = bundle.transactions
    .filter(t => Date.parse(day(t.date)) <= end)
    .reduce((sum, t) => sum + transactionIncome(t), 0)
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
      const stateMatches = positionStates.filter(p => p.key === positionKey(t.provider, t.account_name, t.symbol || ''))
      if (stateMatches.length !== 1) throw new Error(`Daily history needs the recorded position and market for ${t.symbol}.`)
      const state = stateMatches[0]
      const quantity = Math.abs(Number(t.quantity || 0))
      const localPrice = Math.abs(Number(t.price || 0))
      const transactionRate = Number(t.fx_rate || 1)
      const audRate = Number.isFinite(transactionRate) && transactionRate > 0 ? transactionRate : 1
      matches[0].quantity += (type === 'BUY' ? -1 : 1) * Math.abs(t.quantity)
      if (matches[0].quantity < -0.000001) throw new Error(`Trade history does not reconcile for ${t.symbol}.`)
      if (type === 'BUY') {
        state.quantity = matches[0].quantity
        state.costLocal = Math.max(0, state.costLocal - localPrice * quantity)
        state.costAud = Math.max(0, state.costAud - (localPrice * quantity + Math.abs(Number(t.fees || 0))) * audRate)
      } else {
        const unitLocal = state.quantity > 0.000001 ? state.costLocal / state.quantity : localPrice
        const unitAud = state.quantity > 0.000001 ? state.costAud / state.quantity : localPrice * audRate
        state.quantity = matches[0].quantity
        state.costLocal += unitLocal * quantity
        state.costAud += unitAud * quantity
      }
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
    incomeTotal -= transactionIncome(t)
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
    let capitalGain = 0
    let currencyGain = 0
    let componentsComplete = true
    positionStates.forEach(state => {
      if (Math.abs(state.quantity) < 0.000001) return
      const price = close(historyKey(state.symbol, state.market), date)
      const exchangeRate = fx(state.currency, date)
      if (!Number.isFinite(state.costLocal) || !Number.isFinite(state.costAud) || state.costLocal <= 0) {
        componentsComplete = false
        return
      }
      capitalGain += (state.quantity * price - state.costLocal) * exchangeRate
      currencyGain += state.costLocal * exchangeRate - state.costAud
    })
    const snapshot: PortfolioSnapshot = {
      date,
      value_aud: round(holdingsValue + cashValue),
      cash_aud: round(cashValue),
      invested_aud: round(holdingsValue),
      income_aud: round(incomeTotal),
      source: 'daily-market-ledger',
    }
    if (componentsComplete) {
      snapshot.capital_gain_aud = round(capitalGain)
      snapshot.currency_gain_aud = round(currencyGain)
      snapshot.total_return_aud = round(capitalGain + currencyGain + incomeTotal)
    }
    output.push(snapshot)
  }
  return output.reverse()
}
