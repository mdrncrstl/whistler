import { describe, expect, it } from 'vitest'
import { FINANCE_PERIODS, filterFinancePoints } from '../src/lib/financePeriods'

const points = Array.from({ length: 500 }, (_, index) => ({
  date: new Date(Date.UTC(2025, 0, 1 + index)).toISOString(),
  value: index,
}))

describe('finance period selector data windows', () => {
  it('keeps the Google Finance period order', () => {
    expect(FINANCE_PERIODS).toEqual(['1D', '5D', '1W', '1M', '6M', 'YTD', '1Y', '5Y', 'MAX'])
  })

  it('returns the narrow requested window while keeping two points for a chart', () => {
    expect(filterFinancePoints(points, '1D')).toHaveLength(2)
    expect(filterFinancePoints(points, '5D')).toHaveLength(6)
    expect(filterFinancePoints(points, '1W')).toHaveLength(8)
    expect(filterFinancePoints(points, '1M')).toHaveLength(32)
    expect(filterFinancePoints(points, 'MAX')).toHaveLength(500)
  })

  it('keeps every intraday observation for the latest 1D session', () => {
    const intraday = [
      { date: '2026-02-26T23:00:00.000Z', value: 98 },
      { date: '2026-02-27T00:00:00.000Z', value: 100 },
      { date: '2026-02-27T01:00:00.000Z', value: 101 },
      { date: '2026-02-27T02:00:00.000Z', value: 99 },
      { date: '2026-02-27T03:00:00.000Z', value: 102 },
    ]
    expect(filterFinancePoints(intraday, '1D').map((point) => point.date)).toEqual([
      '2026-02-27T00:00:00.000Z',
      '2026-02-27T01:00:00.000Z',
      '2026-02-27T02:00:00.000Z',
      '2026-02-27T03:00:00.000Z',
    ])
  })
})
