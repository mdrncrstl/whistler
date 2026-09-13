import { describe, expect, it, vi } from 'vitest'
import { buildMarketHistoryPoints, loadQuote, normaliseTicker } from '../api/_market-data.mjs'

describe('market symbol normalisation', () => {
  it('maps common global exchanges without corrupting US or pre-qualified symbols', () => {
    expect(normaliseTicker('BHP', 'ASX')).toBe('BHP.AX')
    expect(normaliseTicker('AAPL', 'NASDAQ')).toBe('AAPL')
    expect(normaliseTicker('SHOP', 'TSX')).toBe('SHOP.TO')
    expect(normaliseTicker('7203', 'JPX')).toBe('7203.T')
    expect(normaliseTicker('VOD.L', 'LSE')).toBe('VOD.L')
  })
})

describe('quote validation', () => {
  it('uses the current exchange quote and previous close to calculate the daily move', async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify({ chart: { result: [{
      meta: { regularMarketPrice: 319.7, chartPreviousClose: 309.35, regularMarketTime: 1787947201, currency: 'USD', fullExchangeName: 'NasdaqGS' },
      timestamp: [1787860800, 1787947200],
      indicators: { quote: [{ close: [309.35, 319.7] }] },
    }] } }), { status: 200 }))
    const quote = await loadQuote({ requestId: 'AAPL:NASDAQ:0', symbol: 'AAPL', market: 'NASDAQ', currency: 'USD' }, fetcher)
    expect(quote.price).toBe(319.7)
    expect(quote.previousClose).toBe(309.35)
    expect(quote.change).toBeCloseTo(10.35)
    expect(quote.currency).toBe('USD')
  })
})

describe('OHLC history points', () => {
  it('preserves complete source candles and skips incomplete candle fields', () => {
    const points = buildMarketHistoryPoints({
      timestamp: [1, 2],
      indicators: {
        quote: [{ open: [10, 20], high: [12, 22], low: [9, 19], close: [11, 21], volume: [100, 200] }],
        adjclose: [{ adjclose: [10.5, 20.5] }],
      },
    }, 'USD')
    expect(points[0]).toMatchObject({ price: 11, adjustedPrice: 10.5, open: 10, high: 12, low: 9, close: 11, volume: 100 })
    const incomplete = buildMarketHistoryPoints({ timestamp: [1], indicators: { quote: [{ open: [10], high: [null], low: [9], close: [11] }] } }, 'USD')
    expect(incomplete[0]).toMatchObject({ price: 11 })
    expect(incomplete[0]).not.toHaveProperty('open')
  })
})
