import { describe, expect, it } from 'vitest'
import { buildDailyPortfolioHistory, historyKey } from '../src/lib/dailyPortfolioHistory'
import { demoBundle } from '../src/data/demo'
import type { MarketHistory } from '../src/lib/marketDataApi'

function fixture() {
  const bundle = structuredClone(demoBundle)
  bundle.holdings = [{ ...bundle.holdings[0], symbol: 'TEST', currency: 'AUD', quantity: 12 }]
  bundle.cash = [{ provider: 'ibkr', account_name: 'IBKR Main', currency: 'AUD', balance: 780, fx_rate: 1, value_aud: 780 }]
  bundle.transactions = [{ ...bundle.transactions[0], symbol: 'TEST', date: '2026-09-02', quantity: 2, price: 110, amount: -220, fees: 0, currency: 'AUD' }]
  bundle.snapshots = [{ date: '2026-09-01', value_aud: 2000, invested_aud: 1000, cash_aud: 1000 }]
  const h: MarketHistory = { symbol: 'TEST', currency: 'AUD', exchange: 'NASDAQ', source: 'test', generatedAt: '2026-09-03', points: [{ date: '2026-09-01', price: 100 }, { date: '2026-09-02', price: 110 }, { date: '2026-09-03', price: 120 }] }
  return { bundle, histories: new Map([[historyKey('TEST','NASDAQ'), h]]) }
}

describe('daily portfolio valuations', () => {
  it('uses actual daily closes and reverses a purchase without treating the purchase as a gain', () => {
    const { bundle, histories } = fixture()
    const rows = buildDailyPortfolioHistory(bundle, histories, '2026-09-03')
    expect(rows.map(p => p.value_aud)).toEqual([2000, 2100, 2220])
    expect(rows.map(p => p.cash_aud)).toEqual([1000, 780, 780])
    expect((rows[1].value_aud / rows[0].value_aud - 1) * 100).toBeCloseTo(5)
  })
  it('reverses sale proceeds and fees, restoring the prior quantity', () => {
    const { bundle, histories } = fixture()
    bundle.holdings[0].quantity = 8
    Object.assign(bundle.transactions[0], { type: 'SELL', amount: 220, fees: 2 })
    bundle.cash[0].balance = 1218
    expect(buildDailyPortfolioHistory(bundle, histories, '2026-09-03').map(p => p.value_aud)).toEqual([2000, 2098, 2178])
  })
  it('values foreign positions and cash with historical FX, not the current FX rate', () => {
    const { bundle, histories } = fixture()
    bundle.transactions = []
    bundle.holdings[0].currency = 'USD'
    histories.get(historyKey('TEST','NASDAQ'))!.currency = 'USD'
    histories.set(historyKey('USDAUD=X','FX'), { ...histories.values().next().value!, points: [{ date: '2026-09-01', price: 1.5 }, { date: '2026-09-02', price: 1.6 }, { date: '2026-09-03', price: 1.7 }] })
    expect(buildDailyPortfolioHistory(bundle, histories, '2026-09-03').map(p => p.value_aud)).toEqual([2580, 2892, 3228])
  })
  it('carries the last close over weekends but rejects unavailable or stale history', () => {
    const { bundle, histories } = fixture()
    const rows = buildDailyPortfolioHistory(bundle, histories, '2026-09-05')
    expect(rows.at(-1)?.value_aud).toBe(2220)
    expect(() => buildDailyPortfolioHistory(bundle, histories, '2026-09-15')).toThrow('Daily history is missing')
    expect(() => buildDailyPortfolioHistory(bundle, new Map(), '2026-09-03')).toThrow()
  })
  it('rejects inconsistent quantities rather than fabricating the missing position', () => {
    const { bundle, histories } = fixture()
    bundle.transactions[0].quantity = 20
    expect(() => buildDailyPortfolioHistory(bundle, histories, '2026-09-03')).toThrow('does not reconcile')
  })
  it('reverses dividends and deposits from cash on the correct date', () => {
    const { bundle, histories } = fixture()
    bundle.holdings[0].quantity = 10
    bundle.cash[0].balance = 1600
    bundle.transactions = [
      { ...bundle.transactions[0], type: 'DIVIDEND', amount: 100, quantity: 0 },
      { ...bundle.transactions[0], type: 'DEPOSIT', symbol: null, amount: 500, quantity: 0 },
    ]
    const rows = buildDailyPortfolioHistory(bundle, histories, '2026-09-03')
    expect(rows.map(p => p.cash_aud)).toEqual([1000, 1600, 1600])
    expect(rows.map(p => p.value_aud)).toEqual([2000, 2700, 2800])
  })
  it('does not blend split-adjusted prices with unreconciled historical quantities', () => {
    const { bundle, histories } = fixture()
    histories.get(historyKey('TEST','NASDAQ'))!.splits = [{ date: '2026-09-02', numerator: 2, denominator: 1 }]
    expect(() => buildDailyPortfolioHistory(bundle, histories, '2026-09-03')).toThrow('stock split reconciled')
  })
})
