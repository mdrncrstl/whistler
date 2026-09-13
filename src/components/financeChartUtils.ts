export type FinancePoint = { date: string; value: number; measurementValue?: number; volume?: number; comparison?: number }

/** Keep the chart's x-axis honest: dates are ordered and duplicate observations are collapsed. */
export function normaliseFinancePoints(points: FinancePoint[]) {
  const byTime = new Map<number, FinancePoint>()
  points.forEach((point) => {
    const time = Date.parse(point.date)
    if (!Number.isFinite(time) || !Number.isFinite(point.value)) return
    byTime.set(time, {
      ...point,
      date: new Date(time).toISOString(),
      value: Number(point.value),
      ...(Number.isFinite(point.measurementValue) ? { measurementValue: Number(point.measurementValue) } : {}),
      ...(Number.isFinite(point.volume) ? { volume: Number(point.volume) } : {}),
      ...(Number.isFinite(point.comparison) ? { comparison: Number(point.comparison) } : {}),
    })
  })
  return [...byTime.values()].sort((a, b) => Date.parse(a.date) - Date.parse(b.date))
}

export function nearestFinancePoint(times: number[], target: number) {
  if (!times.length) return null
  let low = 0
  let high = times.length - 1
  while (low <= high) {
    const middle = Math.floor((low + high) / 2)
    if (times[middle] === target) return middle
    if (times[middle] < target) low = middle + 1
    else high = middle - 1
  }
  if (low >= times.length) return times.length - 1
  if (high < 0) return 0
  return Math.abs(times[low] - target) < Math.abs(times[high] - target) ? low : high
}
