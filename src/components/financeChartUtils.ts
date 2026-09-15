export type FinancePoint = { date: string; value: number; measurementValue?: number; volume?: number; comparison?: number; open?: number; high?: number; low?: number; close?: number }

export type FinanceChartStyle = 'line' | 'area' | 'candle' | 'bar'
export type FinanceIndicatorId = 'sma' | 'macd' | 'envelope'

export interface FinanceIndicatorSeries {
  id: string
  indicator: FinanceIndicatorId
  label: string
  colour: string
  values: Array<number | undefined>
  pane: 'main' | 'macd'
  dashed?: boolean
}

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
      ...(Number.isFinite(point.open) ? { open: Number(point.open) } : {}),
      ...(Number.isFinite(point.high) ? { high: Number(point.high) } : {}),
      ...(Number.isFinite(point.low) ? { low: Number(point.low) } : {}),
      ...(Number.isFinite(point.close) ? { close: Number(point.close) } : {}),
    })
  })
  return [...byTime.values()].sort((a, b) => Date.parse(a.date) - Date.parse(b.date))
}

/** Project another positive price series onto the primary series' price scale. */
export function projectFinanceComparison(points: FinancePoint[], comparisonPoints: FinancePoint[]) {
  const primary = normaliseFinancePoints(points)
  const comparison = normaliseFinancePoints(comparisonPoints).filter(point => point.value > 0)
  if (!primary.length || !comparison.length) return primary.map(() => undefined as number | undefined)

  const valueAt = (timestamp: number) => {
    let latest: number | undefined
    for (const point of comparison) {
      if (Date.parse(point.date) > timestamp) break
      latest = point.value
    }
    return latest ?? comparison[0]?.value
  }
  const primaryBase = primary.find(point => point.value > 0)?.value
  const comparisonBase = valueAt(Date.parse(primary[0]?.date || ''))
  if (!primaryBase || !comparisonBase) return primary.map(() => undefined as number | undefined)

  return primary.map(point => {
    const comparisonValue = valueAt(Date.parse(point.date))
    return comparisonValue && comparisonValue > 0 ? comparisonValue / comparisonBase * primaryBase : undefined
  })
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

function movingAverage(values: number[], period: number) {
  return values.map((_, index) => {
    const start = Math.max(0, index - period + 1)
    const window = values.slice(start, index + 1)
    return window.length >= Math.min(period, values.length) ? window.reduce((sum, value) => sum + value, 0) / window.length : undefined
  })
}

function exponentialAverage(values: number[], period: number) {
  const multiplier = 2 / (period + 1)
  let previous = values[0]
  return values.map((value, index) => {
    if (index === 0) return previous
    previous = (value - previous) * multiplier + previous
    return previous
  })
}

/** Calculate the indicators exposed by the Google Finance style pro toolbar. */
export function calculateFinanceIndicators(points: FinancePoint[], selected: FinanceIndicatorId[] = []) {
  const values = points.map(point => point.value)
  const series: FinanceIndicatorSeries[] = []
  if (selected.includes('sma')) {
    series.push({ indicator: 'sma', id: 'sma-5', label: 'Moving average (SMA-5 Price)', colour: '#e37400', values: movingAverage(values, 5), pane: 'main' })
  }
  if (selected.includes('envelope')) {
    const basis = movingAverage(values, 20)
    series.push({ indicator: 'envelope', id: 'envelope-upper', label: 'Moving average envelope upper', colour: '#f29900', values: basis.map(value => value === undefined ? undefined : value * 1.02), pane: 'main', dashed: true })
    series.push({ indicator: 'envelope', id: 'envelope-lower', label: 'Moving average envelope lower', colour: '#f29900', values: basis.map(value => value === undefined ? undefined : value * .98), pane: 'main', dashed: true })
  }
  if (selected.includes('macd')) {
    const fast = exponentialAverage(values, 12)
    const slow = exponentialAverage(values, 26)
    const macd = fast.map((value, index) => value - slow[index])
    const signal = exponentialAverage(macd, 9)
    series.push({ indicator: 'macd', id: 'macd', label: 'MACD', colour: '#3268ee', values: macd, pane: 'macd' })
    series.push({ indicator: 'macd', id: 'macd-signal', label: 'Signal', colour: '#e37400', values: signal, pane: 'macd', dashed: true })
  }
  return series
}
