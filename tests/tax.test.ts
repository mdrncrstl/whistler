import { describe, expect, it } from 'vitest'
import { matchTaxLots, taxSummary } from '../src/lib/tax'
import type { Transaction } from '../src/types'

const tx = (overrides: Partial<Transaction>): Transaction => ({
  provider: 'ibkr',
  provider_external_id: 'id',
  date: '2024-01-01T00:00:00Z',
  type: 'BUY',
  symbol: 'AAA',
  quantity: 10,
  price: 100,
  currency: 'AUD',
  amount: -1000,
  fees: 0,
  fx_rate: 1,
  ...overrides,
})

const activity: Transaction[] = [
  tx({ provider_external_id: 'buy-old', date: '2024-01-01T00:00:00Z', quantity: 10, price: 100, amount: -1000, fees: 10 }),
  tx({ provider_external_id: 'buy-new', date: '2026-02-01T00:00:00Z', quantity: 10, price: 200, amount: -2000 }),
  tx({ provider_external_id: 'sell', date: '2026-08-01T00:00:00Z', type: 'SELL', quantity: 10, price: 250, amount: 2500, fees: 5 }),
]

describe('tax lot matching', () => {
  it('FIFO matches the oldest parcel and applies fees', () => {
    const [match] = matchTaxLots(activity, '2026/27', 'fifo')
    expect(match.boughtAt).toContain('2024-01-01')
    expect(match.costBaseAud).toBeCloseTo(1010, 2)
    expect(match.proceedsAud).toBeCloseTo(2495, 2)
    expect(match.gainAud).toBeCloseTo(1485, 2)
    expect(match.discountEligible).toBe(true)
  })

  it('LIFO and HIFO match the highest, newest parcel', () => {
    for (const method of ['lifo', 'hifo'] as const) {
      const [match] = matchTaxLots(activity, '2026/27', method)
      expect(match.boughtAt).toContain('2026-02-01')
      expect(match.costBaseAud).toBeCloseTo(2000, 2)
      expect(match.gainAud).toBeCloseTo(495, 2)
      expect(match.discountEligible).toBe(false)
    }
  })

  it('filters disposals by Australian financial year and summarises losses', () => {
    expect(matchTaxLots(activity, '2025/26', 'fifo')).toHaveLength(0)
    const summary = taxSummary([
      { sellId: 'a', symbol: 'A', soldAt: '', boughtAt: '', quantity: 1, proceedsAud: 200, costBaseAud: 100, gainAud: 100, discountEligible: true, holdingDays: 500 },
      { sellId: 'b', symbol: 'B', soldAt: '', boughtAt: '', quantity: 1, proceedsAud: 50, costBaseAud: 80, gainAud: -30, discountEligible: false, holdingDays: 20 },
    ])
    expect(summary.gains).toBe(100)
    expect(summary.losses).toBe(30)
    expect(summary.net).toBe(70)
    expect(summary.estimatedDiscountedNet).toBe(20)
  })
})
