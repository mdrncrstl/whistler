import { describe, expect, it, vi } from 'vitest'
import { loadQuote, normaliseTicker } from '../api/_market-data.mjs'

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
