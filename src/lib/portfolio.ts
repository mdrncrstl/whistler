import type { PortfolioBundle, Position, Transaction } from '../types'

export interface PortfolioSummary {
  invested: number
  cash: number
  total: number
  cost: number
  unrealised: number
  returnPct: number
  dayChange: number
  holdingCount: number
  income: number
  currencyGain: number
  capitalGain: number
  currencyGainComplete: boolean
}

/**
 * The AUD gain attributable purely to exchange-rate movement on a holding's cost base.
 *
 * cost_aud was booked at the exchange rate in force when the position was opened, so
 * cost_aud / (average_cost * quantity) recovers that rate. Revaluing the same local-currency
 * cost base at today's rate isolates the currency component of the unrealised gain.
 *
 * Returns null when the cost base or rate is missing, because the split cannot be derived
 * from the recorded data. AUD-denominated holdings correctly return 0.
 */
export function holdingCurrencyGain(item: Position): number | null {
  const costLocal = Number(item.average_cost || 0) * Number(item.quantity || 0)
  const costAud = Number(item.cost_aud || 0)
  const currentRate = Number(item.fx_rate || 0)
  if (!costLocal || !costAud || !currentRate) return null
  const costRate = costAud / costLocal
  if (!Number.isFinite(costRate)) return null
  return costLocal * (currentRate - costRate)
}

/** Capital gain with the currency component removed, when that component is derivable. */
export function holdingCapitalGain(item: Position): number {
  return Number(item.unrealised_gain_aud || 0) - (holdingCurrencyGain(item) || 0)
}

export function summarisePortfolio(bundle: PortfolioBundle): PortfolioSummary {
  const invested = bundle.holdings.reduce((sum, item) => sum + Number(item.value_aud || 0), 0)
  const cash = bundle.cash.reduce((sum, item) => sum + Number(item.value_aud || 0), 0)
  const cost = bundle.holdings.reduce((sum, item) => sum + Number(item.cost_aud || 0), 0)
  const unrealised = bundle.holdings.reduce((sum, item) => sum + Number(item.unrealised_gain_aud || 0), 0)
  const dayChange = bundle.holdings.reduce((sum, item) => sum + Number(item.day_change_aud || 0), 0)
  const income = bundle.transactions
    .filter((item) => ['DIVIDEND', 'DISTRIBUTION', 'INTEREST'].includes(String(item.type).toUpperCase()))
    .reduce((sum, item) => sum + Math.abs(Number(item.amount || 0) * Number(item.fx_rate || 1)), 0)
  const currencyGain = bundle.holdings.reduce((sum, item) => sum + (holdingCurrencyGain(item) || 0), 0)
  const currencyGainComplete = bundle.holdings.every((item) => holdingCurrencyGain(item) !== null)
  return {
    invested,
    cash,
    total: invested + cash,
    cost,
    unrealised,
    returnPct: cost ? (unrealised / cost) * 100 : 0,
    dayChange,
    holdingCount: bundle.holdings.length,
    income,
    currencyGain,
    capitalGain: unrealised - currencyGain,
    currencyGainComplete,
  }
}

export function allocationBy(holdings: Position[], key: 'asset_class' | 'provider' | 'sector') {
  const total = holdings.reduce((sum, item) => sum + Number(item.value_aud || 0), 0)
  const groups = new Map<string, number>()
  holdings.forEach((item) => {
    const label = String(item[key] || 'Other')
    groups.set(label, (groups.get(label) || 0) + Number(item.value_aud || 0))
  })
  return [...groups.entries()]
    .map(([name, value]) => ({ name, value, percentage: total ? (value / total) * 100 : 0 }))
    .sort((a, b) => b.value - a.value)
}

export function incomeTransactions(transactions: Transaction[]) {
  return transactions.filter((item) => ['DIVIDEND', 'DISTRIBUTION', 'INTEREST'].includes(String(item.type).toUpperCase()))
}

export function financialYearFor(dateValue = new Date()) {
  const year = dateValue.getUTCFullYear()
  return dateValue.getUTCMonth() >= 6 ? `${year}/${String(year + 1).slice(-2)}` : `${year - 1}/${String(year).slice(-2)}`
}

export function financialYearBounds(label: string) {
  const startYear = Number(label.split('/')[0])
  return {
    start: new Date(Date.UTC(startYear, 6, 1)),
    end: new Date(Date.UTC(startYear + 1, 5, 30, 23, 59, 59, 999)),
  }
}
