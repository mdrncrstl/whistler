import { describe, expect, it, vi } from 'vitest'
import { researchStock } from '../api/stock-research.mjs'

describe('stock research provider', () => {
  it('prefers an exact listing and preserves missing quote values', async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({quotes:[{symbol:'OTHER',shortname:'Other',quoteType:'EQUITY'}, {symbol:'BHP.AX',shortname:'BHP',quoteType:'EQUITY'}]})))
      .mockResolvedValueOnce(new Response(JSON.stringify({chart:{result:[{meta:{currency:'AUD',regularMarketPrice:62}, timestamp:[1,2], indicators:{quote:[{open:[null,61],high:[null,63],low:[null,60],close:[null,62],volume:[10,25]}]}}]}})))
    const result = await researchStock('BHP.AX', fetcher)
    expect(result.symbol).toBe('BHP.AX')
    expect(result.low).toBeNull()
    expect(result.points).toHaveLength(1)
    expect(result.points[0].price).toBe(62)
    expect(result.points[0].volume).toBe(25)
    expect(result.points[0]).toMatchObject({ open: 61, high: 63, low: 60, close: 62 })
    expect(fetcher.mock.calls[1][0]).toContain('range=1y')
    expect(result.asOf).toBeNull()
  })
  it('returns an empty-search explanation without requesting a chart', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({quotes:[]})))
    expect((await researchStock('unknown', fetcher)).error).toContain('No matching listing')
    expect(fetcher).toHaveBeenCalledTimes(1)
  })
})
