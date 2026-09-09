import { describe, expect, it } from 'vitest'
import { demoBundle } from '../src/data/demo'
import { applyMarketSnapshot } from '../src/lib/repricePortfolio'
import type { MarketSnapshot } from '../src/lib/marketDataApi'
describe('portfolio repricing', () => {
  it('updates prices, FX, values, gains, returns, day moves and the latest snapshot together', () => {
    const snapshot: MarketSnapshot = {
      generatedAt: '2026-08-29T07:00:00.000Z', baseCurrency: 'AUD', source: 'Just now', failures: [],
      quotes: [
        { requestId: 'AAPL:NASDAQ:0', requestedSymbol: 'AAPL', ticker: 'AAPL', name: 'Apple Inc.', exchange: 'NasdaqGS', currency: 'USD', price: 319.7, previousClose: 309.35, change: 10.35, changePercent: 3.35, asOf: '2026-08-28T20:00:01.000Z', marketState: 'closed', ageMinutes: 10, source: 'Just now' },
        { requestId: 'BHP:ASX:1', requestedSymbol: 'BHP', ticker: 'BHP.AX', name: 'BHP Group', exchange: 'ASX', currency: 'AUD', price: 67.3, previousClose: 65.16, change: 2.14, changePercent: 3.28, asOf: '2026-08-28T06:14:05.000Z', marketState: 'closed', ageMinutes: 20, source: 'Just now' },
      ],
      fx: { AUD: { currency: 'AUD', rate: 1, asOf: '2026-08-29T07:00:00.000Z', source: 'Base currency' }, USD: { currency: 'USD', rate: 1.3958, asOf: '2026-08-29T06:50:00.000Z', source: 'Just now' } },
    }
    const result = applyMarketSnapshot(structuredClone(demoBundle), snapshot)
    const apple = result.bundle.holdings.find((holding) => holding.symbol === 'AAPL')!
    const bhp = result.bundle.holdings.find((holding) => holding.symbol === 'BHP')!
    expect(apple.current_price).toBe(319.7)
    expect(apple.fx_rate).toBe(1.3958)
    expect(apple.value_aud).toBeCloseTo(35698.98, 1)
    expect(apple.day_change_aud).toBeCloseTo(1155.72, 1)
    expect(bhp.current_price).toBe(67.3)
    expect(bhp.value_aud).toBe(13796.5)
    expect(result.bundle.snapshots.at(-1)?.date).toBe('2026-08-29')
    expect(result.updated).toBe(2)
  })
})
