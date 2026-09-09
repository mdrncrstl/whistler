import { describe, expect, it } from 'vitest'
import { demoBundle } from '../src/data/demo'
import { allocationBy, financialYearBounds, financialYearFor, holdingCapitalGain, holdingCurrencyGain, summarisePortfolio } from '../src/lib/portfolio'
import type { Position } from '../src/types'

describe('portfolio calculations', () => {
  it('combines holdings and cash without double counting', () => {
    const summary = summarisePortfolio(demoBundle)
    const invested = demoBundle.holdings.reduce((sum, item) => sum + item.value_aud, 0)
    expect(summary.invested).toBeCloseTo(invested, 2)
    expect(summary.cash).toBe(10999)
    expect(summary.total).toBeCloseTo(invested + 10999, 2)
    expect(summary.unrealised).toBeCloseTo(demoBundle.holdings.reduce((sum, item) => sum + item.unrealised_gain_aud, 0), 2)
    expect(summary.income).toBeGreaterThan(400)
  })

  it('builds allocation percentages that sum to 100', () => {
    const allocation = allocationBy(demoBundle.holdings, 'asset_class')
    expect(allocation[0].value).toBeGreaterThan(0)
    expect(allocation.reduce((sum, item) => sum + item.percentage, 0)).toBeCloseTo(100, 8)
    expect(allocation.some((item) => item.name === 'US shares')).toBe(true)
  })

  it('uses Australian July-to-June financial years', () => {
    expect(financialYearFor(new Date('2026-06-30T12:00:00Z'))).toBe('2025/26')
    expect(financialYearFor(new Date('2026-07-01T00:00:00Z'))).toBe('2026/27')
    const bounds = financialYearBounds('2025/26')
    expect(bounds.start.toISOString()).toBe('2025-07-01T00:00:00.000Z')
    expect(bounds.end.toISOString()).toBe('2026-06-30T23:59:59.999Z')
  })
})

describe('currency gain decomposition', () => {
  const base: Position = {
    provider: 'ibkr', account_name: 'IBKR Main', symbol: 'TEST', currency: 'USD',
    quantity: 100, average_cost: 10, current_price: 12, fx_rate: 1.5,
    value_aud: 1800, cost_aud: 1000, unrealised_gain_aud: 800, return_pct: 80, day_change_aud: 0,
  }

  it('isolates the exchange-rate movement on the recorded cost base', () => {
    // Cost base of 1,000 local units was booked at 1.00; today's rate is 1.50.
    expect(holdingCurrencyGain(base)).toBeCloseTo(500, 6)
    expect(holdingCapitalGain(base)).toBeCloseTo(300, 6)
    expect(holdingCapitalGain(base) + holdingCurrencyGain(base)!).toBeCloseTo(base.unrealised_gain_aud, 6)
  })

  it('reports no currency gain for AUD holdings', () => {
    const aud: Position = { ...base, currency: 'AUD', fx_rate: 1, cost_aud: 1000, value_aud: 1200, unrealised_gain_aud: 200 }
    expect(holdingCurrencyGain(aud)).toBeCloseTo(0, 6)
    expect(holdingCapitalGain(aud)).toBeCloseTo(200, 6)
  })

  it('returns null rather than guessing when the cost base is missing', () => {
    expect(holdingCurrencyGain({ ...base, cost_aud: 0 })).toBeNull()
    expect(holdingCurrencyGain({ ...base, average_cost: 0 })).toBeNull()
    expect(holdingCurrencyGain({ ...base, fx_rate: 0 })).toBeNull()
  })

  it('keeps capital, currency and income adding up to total return in the summary', () => {
    const summary = summarisePortfolio(demoBundle)
    expect(summary.capitalGain + summary.currencyGain).toBeCloseTo(summary.unrealised, 6)
    expect(summary.currencyGainComplete).toBe(true)
  })
})

describe('percentage formatting', () => {
  it('signs a change and leaves a share unsigned', async () => {
    const { percent, share } = await import('../src/lib/format')
    expect(percent(33.92)).toBe('+33.92%')
    expect(percent(-2.5)).toBe('-2.50%')
    // A weighting or a concentration is not a gain and must not read as one.
    expect(share(21.65)).toBe('21.65%')
    expect(share(100)).toBe('100.00%')
  })
})

describe('broker directory', () => {
  it('only claims a live connection where one exists', async () => {
    const { brokers, methodLabel } = await import('../src/lib/brokers')
    const synced = brokers.filter(broker => broker.method === 'sync')
    // Anything marked 'sync' is presented to users as an automatic read-only connection.
    // Adding a broker here without building the connection would be a false claim.
    expect(synced.map(broker => broker.id)).toEqual(['ibkr'])
    expect(brokers.every(broker => methodLabel[broker.method])).toBe(true)
    expect(new Set(brokers.map(broker => broker.id)).size).toBe(brokers.length)
    expect(brokers.every(broker => broker.market && broker.currency)).toBe(true)
  })

  it('keeps a catch-all entry so an unlisted broker is still reachable', async () => {
    const { brokers } = await import('../src/lib/brokers')
    expect(brokers.some(broker => broker.id === 'other' && broker.method === 'csv')).toBe(true)
  })
})
