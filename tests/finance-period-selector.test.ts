import { describe, expect, it } from 'vitest'
import { FINANCE_PERIODS, filterFinancePoints } from '../src/lib/financePeriods'

const points = Array.from({ length: 500 }, (_, index) => ({
  date: new Date(Date.UTC(2025, 0, 1 + index)).toISOString(),
  value: index,
}))

describe('finance period selector data windows', () => {
  it('keeps the Google Finance period order', () => {
    expect(FINANCE_PERIODS).toEqual(['1D', '5D', '1M', '6M', 'YTD', '1Y', '5Y', 'MAX'])
  })

  it('returns the narrow requested window while keeping two points for a chart', () => {
    expect(filterFinancePoints(points, '1D')).toHaveLength(2)
    expect(filterFinancePoints(points, '5D')).toHaveLength(6)
    expect(filterFinancePoints(points, '1M')).toHaveLength(32)
    expect(filterFinancePoints(points, 'MAX')).toHaveLength(500)
  })
})
