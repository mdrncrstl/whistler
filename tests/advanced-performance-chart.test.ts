import { describe, expect, it } from 'vitest'
import {
  calculateMeasurement,
  downsamplePerformancePoints,
  filterPerformancePoints,
  type AdvancedPerformancePoint,
} from '../src/components/AdvancedPerformanceChart'

function point(date: string, holdingAmount: number, benchmarkAmount = holdingAmount): AdvancedPerformancePoint {
  return { date, holdingAmount, benchmarkAmount }
}

describe('advanced performance chart calculations', () => {
  it('filters large histories to presets and exact custom bounds', () => {
    const points = Array.from({ length: 800 }, (_, index) => point(
      new Date(Date.UTC(2024, 0, 1) + index * 86_400_000).toISOString(),
      100 + index,
    ))
    const oneMonth = filterPerformancePoints(points, { preset: '1M' })
    const custom = filterPerformancePoints(points, { preset: 'CUSTOM', start: '2025-01-01', end: '2025-01-10' })
    expect(oneMonth.length).toBeGreaterThanOrEqual(31)
    expect(oneMonth.length).toBeLessThanOrEqual(33)
    expect(custom).toHaveLength(10)
    expect(custom[0].date).toContain('2025-01-01')
    expect(custom.at(-1)?.date).toContain('2025-01-10')
  })

  it('measures return, duration and annualised return in either drag direction', () => {
    const start = point('2025-01-01T00:00:00.000Z', 100)
    const end = point('2025-04-02T00:00:00.000Z', 112.48)
    const forward = calculateMeasurement(start, end)
    const reverse = calculateMeasurement(end, start)
    expect(forward.changePercent).toBeCloseTo(12.48, 5)
    expect(forward.days).toBe(91)
    expect(forward.annualisedPercent).toBeGreaterThan(50)
    expect(reverse).toEqual(forward)
  })

  it('reduces navigator geometry while retaining the first and last points', () => {
    const points = Array.from({ length: 20_000 }, (_, index) => point(
      new Date(Date.UTC(2000, 0, 1) + index * 86_400_000).toISOString(),
      100 + Math.sin(index / 20) * 12,
    ))
    const sampled = downsamplePerformancePoints(points, 160)
    expect(sampled).toHaveLength(160)
    expect(sampled[0]).toBe(points[0])
    expect(sampled.at(-1)).toBe(points.at(-1))
  })
})
