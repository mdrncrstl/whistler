import { describe, expect, it } from 'vitest'
import { demoBundle } from '../src/data/demo'
import { allocationBy, financialYearBounds, financialYearFor, summarisePortfolio } from '../src/lib/portfolio'

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
