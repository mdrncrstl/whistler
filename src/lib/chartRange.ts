import { useCallback, useEffect, useMemo, useState } from 'react'

export interface RangeSeriesPoint { label: string; value: number }

export interface ChartRangeSummary {
  fromLabel: string
  toLabel: string
  fromValue: number
  toValue: number
  change: number
  changePercent: number | null
  points: number
}

function order(series: RangeSeriesPoint[], a: string, b: string) {
  const ai = series.findIndex(point => point.label === a)
  const bi = series.findIndex(point => point.label === b)
  return ai <= bi ? { from: a, to: b } : { from: b, to: a }
}

/**
 * Press and drag across a chart to measure a span, the way Google Finance does.
 *
 * Recharts hands the category under the pointer to the chart-level mouse handlers, so the
 * selection is stored as two category labels rather than pixel coordinates. That keeps it
 * correct when the chart resizes and it survives a re-render of the series.
 */
export function useChartRange(series: RangeSeriesPoint[]) {
  const [anchor, setAnchor] = useState<string | null>(null)
  const [cursor, setCursor] = useState<string | null>(null)
  const [locked, setLocked] = useState<{ from: string; to: string } | null>(null)

  const clear = useCallback(() => { setAnchor(null); setCursor(null); setLocked(null) }, [])

  // Reset during render when the plotted series changes, rather than in an effect:
  // a selection measured on the old series would point at labels that no longer exist.
  const [seenSeries, setSeenSeries] = useState(series)
  if (seenSeries !== series) {
    setSeenSeries(series)
    setAnchor(null)
    setCursor(null)
    setLocked(null)
  }

  useEffect(() => {
    if (!locked && !anchor) return
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') clear() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [locked, anchor, clear])

  // A pointer release outside the plot still ends the drag.
  useEffect(() => {
    if (!anchor) return
    const stop = () => {
      if (cursor && cursor !== anchor) setLocked(order(series, anchor, cursor))
      setAnchor(null)
      setCursor(null)
    }
    window.addEventListener('pointerup', stop)
    return () => window.removeEventListener('pointerup', stop)
  }, [anchor, cursor, series])

  const active = useMemo(() => {
    if (anchor && cursor && anchor !== cursor) return order(series, anchor, cursor)
    return locked
  }, [anchor, cursor, locked, series])

  const summary = useMemo<ChartRangeSummary | null>(() => {
    if (!active) return null
    const fromIndex = series.findIndex(point => point.label === active.from)
    const toIndex = series.findIndex(point => point.label === active.to)
    if (fromIndex < 0 || toIndex < 0) return null
    const fromValue = series[fromIndex].value
    const toValue = series[toIndex].value
    const change = toValue - fromValue
    return {
      fromLabel: active.from,
      toLabel: active.to,
      fromValue,
      toValue,
      change,
      // A zero base cannot produce a percentage; say so rather than printing Infinity.
      changePercent: fromValue === 0 ? null : (change / Math.abs(fromValue)) * 100,
      points: Math.abs(toIndex - fromIndex) + 1,
    }
  }, [active, series])

  const chartProps = {
    onMouseDown: (state: { activeLabel?: string | number } | null) => {
      const label = state?.activeLabel
      if (label === undefined || label === null) return
      setLocked(null)
      setAnchor(String(label))
      setCursor(String(label))
    },
    onMouseMove: (state: { activeLabel?: string | number } | null) => {
      const label = state?.activeLabel
      if (!anchor || label === undefined || label === null) return
      setCursor(String(label))
    },
    onMouseUp: () => {
      if (anchor && cursor && anchor !== cursor) setLocked(order(series, anchor, cursor))
      setAnchor(null)
      setCursor(null)
    },
  }

  return { active, summary, chartProps, dragging: Boolean(anchor), clear }
}
