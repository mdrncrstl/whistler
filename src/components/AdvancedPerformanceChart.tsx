/* eslint-disable react-refresh/only-export-components -- chart calculation helpers are exported for deterministic large-dataset tests */
import {
  AreaSeries,
  ColorType,
  CrosshairMode,
  LineSeries,
  createChart,
  type IChartApi,
  type ISeriesApi,
  type SeriesType,
  type Time,
  type UTCTimestamp,
} from 'lightweight-charts'
import { CalendarDays, Crosshair, Minus, Plus, RotateCcw, Scale, SlidersHorizontal } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { date, money } from '../lib/format'

export type PerformanceRangePreset = '1D' | '5D' | '1M' | '3M' | '6M' | 'YTD' | '1Y' | '3Y' | '5Y' | 'MAX' | 'CUSTOM'
export type PerformanceMode = 'Amount' | 'Percent'
export type PerformanceChartStyle = 'Area' | 'Line'
export type PerformanceMetric = 'Return' | 'Price'

export interface AdvancedPerformancePoint {
  date: string
  holdingAmount: number
  benchmarkAmount: number
  price?: number
}

export interface PerformancePeriod {
  preset: PerformanceRangePreset
  start?: string
  end?: string
}

export interface MeasurementResult {
  startDate: string
  endDate: string
  startValue: number
  endValue: number
  changePercent: number
  days: number
  annualisedPercent: number | null
}

interface AdvancedPerformanceChartProps {
  points: AdvancedPerformancePoint[]
  symbol: string
  benchmarkLabel?: string
  mode: PerformanceMode
  onModeChange: (mode: PerformanceMode) => void
  period: PerformancePeriod
  onPeriodChange: (period: PerformancePeriod) => void
  priceCurrency?: string
}

interface DisplayPoint {
  date: string
  timestamp: number
  holding: number
  benchmark: number
  holdingAmount: number
  price: number
}

const presets: PerformanceRangePreset[] = ['1D', '5D', '1M', '3M', '6M', 'YTD', '1Y', '3Y', '5Y', 'MAX']
const DAY_MS = 86_400_000

function isoDay(value: string) {
  return value.slice(0, 10)
}

function dateTime(value: string) {
  const parsed = new Date(value).getTime()
  return Number.isFinite(parsed) ? parsed : 0
}

function cutoffForPreset(preset: PerformanceRangePreset, latest: string) {
  const end = new Date(latest)
  if (preset === 'YTD') return Date.UTC(end.getUTCFullYear(), 0, 1)
  const days: Partial<Record<PerformanceRangePreset, number>> = {
    '1D': 1,
    '5D': 5,
    '1M': 31,
    '3M': 93,
    '6M': 183,
    '1Y': 365,
    '3Y': 365 * 3,
    '5Y': 365 * 5,
  }
  const duration = days[preset]
  return duration ? end.getTime() - duration * DAY_MS : null
}

export function filterPerformancePoints(points: AdvancedPerformancePoint[], period: PerformancePeriod) {
  const sorted = [...points].sort((a, b) => dateTime(a.date) - dateTime(b.date))
  if (sorted.length < 2) return sorted
  const latest = sorted.at(-1)?.date ?? sorted[0].date
  const start = period.preset === 'CUSTOM' && period.start ? dateTime(period.start) : cutoffForPreset(period.preset, latest)
  const end = period.preset === 'CUSTOM' && period.end ? dateTime(period.end) + DAY_MS - 1 : null
  if (start === null && end === null) return sorted
  const filtered = sorted.filter((point) => {
    const time = dateTime(point.date)
    return (start === null || time >= start) && (end === null || time <= end)
  })
  return filtered.length >= 2 ? filtered : sorted.slice(-2)
}

export function calculateMeasurement(start: AdvancedPerformancePoint, end: AdvancedPerformancePoint): MeasurementResult {
  const ordered = dateTime(start.date) <= dateTime(end.date) ? [start, end] : [end, start]
  const startPoint = ordered[0]
  const endPoint = ordered[1]
  const startValue = startPoint.holdingAmount
  const endValue = endPoint.holdingAmount
  const changePercent = startValue ? ((endValue / startValue) - 1) * 100 : 0
  const days = Math.max(1, Math.round((dateTime(endPoint.date) - dateTime(startPoint.date)) / DAY_MS))
  const growth = 1 + changePercent / 100
  const annualisedPercent = growth > 0 ? (Math.pow(growth, 365 / days) - 1) * 100 : null
  return {
    startDate: startPoint.date,
    endDate: endPoint.date,
    startValue,
    endValue,
    changePercent,
    days,
    annualisedPercent,
  }
}

export function downsamplePerformancePoints(points: AdvancedPerformancePoint[], limit = 160) {
  if (points.length <= limit) return points
  const sampled: AdvancedPerformancePoint[] = []
  const step = (points.length - 1) / (limit - 1)
  for (let index = 0; index < limit; index += 1) sampled.push(points[Math.round(index * step)])
  return sampled
}

function timeLabel(value: Time | undefined) {
  if (typeof value === 'number') return new Date(value * 1000).toISOString()
  if (typeof value === 'string') return value
  if (value) return `${value.year}-${String(value.month).padStart(2, '0')}-${String(value.day).padStart(2, '0')}`
  return ''
}

function nearestPoint(points: DisplayPoint[], timestamp: number) {
  let low = 0
  let high = points.length - 1
  while (low < high) {
    const middle = Math.floor((low + high) / 2)
    if (points[middle].timestamp < timestamp) low = middle + 1
    else high = middle
  }
  if (low === 0) return points[0]
  const previous = points[low - 1]
  const current = points[low]
  return timestamp - previous.timestamp <= current.timestamp - timestamp ? previous : current
}

function signedPercent(value: number) {
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`
}

function displayValue(value: number, mode: PerformanceMode, metric: PerformanceMetric, currency: string) {
  return metric === 'Price' ? money(value, currency, 2) : mode === 'Percent' ? `${value.toFixed(2)}%` : money(value, 'AUD', 2)
}

function zoomChart(chart: IChartApi | null, factor: number) {
  const range = chart?.timeScale().getVisibleLogicalRange()
  if (!chart || !range) return
  const centre = (range.from + range.to) / 2
  const half = Math.max(2, ((range.to - range.from) / 2) * factor)
  chart.timeScale().setVisibleLogicalRange({ from: centre - half, to: centre + half })
}

export function AdvancedPerformanceChart({
  points,
  symbol,
  benchmarkLabel = 'Portfolio benchmark',
  mode,
  onModeChange,
  period,
  onPeriodChange,
  priceCurrency = 'AUD',
}: AdvancedPerformanceChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const primarySeriesRef = useRef<ISeriesApi<SeriesType> | null>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)
  const tooltipDateRef = useRef<HTMLSpanElement>(null)
  const tooltipPrimaryRef = useRef<HTMLSpanElement>(null)
  const tooltipBenchmarkRef = useRef<HTMLSpanElement>(null)
  const measureLayerRef = useRef<HTMLDivElement>(null)
  const measureBoxRef = useRef<HTMLDivElement>(null)
  const measureReadoutRef = useRef<HTMLDivElement>(null)
  const measureStartRef = useRef<DisplayPoint | null>(null)
  const measureFrameRef = useRef<number | null>(null)
  const [chartStyle, setChartStyle] = useState<PerformanceChartStyle>('Area')
  const [chartMetric, setChartMetric] = useState<PerformanceMetric>('Return')
  const [compare, setCompare] = useState(true)
  const [measureActive, setMeasureActive] = useState(false)
  const [measurement, setMeasurement] = useState<MeasurementResult | null>(null)
  const [customOpen, setCustomOpen] = useState(false)
  const [customStart, setCustomStart] = useState(period.start ?? isoDay(points[0]?.date ?? ''))
  const [customEnd, setCustomEnd] = useState(period.end ?? isoDay(points.at(-1)?.date ?? ''))
  const [navigatorDraft, setNavigatorDraft] = useState<{ start: number; end: number } | null>(null)

  const sortedPoints = useMemo(() => [...points].sort((a, b) => dateTime(a.date) - dateTime(b.date)), [points])
  const visiblePoints = useMemo(() => filterPerformancePoints(sortedPoints, period), [period, sortedPoints])
  // Keep pointer interaction and rendering responsive on long histories without changing the source data.
  // The first and last points are always retained, so the selected range still has an honest endpoint.
  const chartPoints = useMemo(() => downsamplePerformancePoints(visiblePoints, 1400), [visiblePoints])
  const displayPoints = useMemo<DisplayPoint[]>(() => {
    const first = chartPoints[0]
    const holdingBase = first?.holdingAmount || 1
    const benchmarkBase = first?.benchmarkAmount || 1
    return chartPoints.map((point) => ({
      date: point.date,
      timestamp: Math.floor(dateTime(point.date) / 1000),
      holding: chartMetric === 'Price' ? (point.price ?? point.holdingAmount) : mode === 'Percent' ? ((point.holdingAmount / holdingBase) - 1) * 100 : point.holdingAmount,
      benchmark: mode === 'Percent' ? ((point.benchmarkAmount / benchmarkBase) - 1) * 100 : point.benchmarkAmount,
      holdingAmount: chartMetric === 'Price' ? (point.price ?? point.holdingAmount) : point.holdingAmount,
      price: point.price ?? point.holdingAmount,
    }))
  }, [chartMetric, chartPoints, mode])

  const latest = displayPoints.at(-1)
  const benchmarkLatest = latest?.benchmark ?? 0
  const primaryLatest = latest?.holding ?? 0
  const rawReturn = visiblePoints.length > 1 ? calculateMeasurement(
    { ...visiblePoints[0], holdingAmount: chartMetric === 'Price' ? (visiblePoints[0].price ?? visiblePoints[0].holdingAmount) : visiblePoints[0].holdingAmount },
    { ...visiblePoints.at(-1)!, holdingAmount: chartMetric === 'Price' ? (visiblePoints.at(-1)!.price ?? visiblePoints.at(-1)!.holdingAmount) : visiblePoints.at(-1)!.holdingAmount },
  ).changePercent : 0

  const navigatorBounds = useMemo(() => {
    if (!sortedPoints.length) return { start: 0, end: 1 }
    const firstVisible = visiblePoints[0]?.date
    const lastVisible = visiblePoints.at(-1)?.date
    const startIndex = Math.max(0, sortedPoints.findIndex((point) => point.date === firstVisible))
    const locatedEnd = sortedPoints.findIndex((point) => point.date === lastVisible)
    return { start: startIndex, end: Math.max(startIndex + 1, locatedEnd < 0 ? sortedPoints.length - 1 : locatedEnd) }
  }, [sortedPoints, visiblePoints])
  const navigatorStart = navigatorDraft?.start ?? navigatorBounds.start
  const navigatorEnd = navigatorDraft?.end ?? navigatorBounds.end

  useEffect(() => {
    const container = chartContainerRef.current
    if (!container || container.clientWidth === 0 || typeof ResizeObserver === 'undefined' || displayPoints.length < 2) return
    const computedStyle = getComputedStyle(container)
    const chartText = computedStyle.getPropertyValue('--muted-2').trim() || '#82908c'
    const chartGrid = computedStyle.getPropertyValue('--line').trim() || '#e6ece9'
    // lightweight-charts needs resolved colours, so read the same chart tokens the
    // Recharts surfaces use instead of keeping a second set of hexes here.
    const chartSeries = computedStyle.getPropertyValue('--chart-1').trim() || '#0f9d63'
    const chartSeriesSoft = computedStyle.getPropertyValue('--chart-benchmark').trim() || '#90b6a7'
    const chartCrosshair = computedStyle.getPropertyValue('--muted-2').trim() || '#71817a'
    const chartLabelBg = computedStyle.getPropertyValue('--text').trim() || '#12251f'

    const chart = createChart(container, {
      width: container.clientWidth,
      height: container.clientHeight,
      autoSize: false,
      layout: { background: { type: ColorType.Solid, color: 'transparent' }, textColor: chartText, fontFamily: 'Inter, sans-serif', fontSize: 11, attributionLogo: false },
      grid: {
        vertLines: { color: chartGrid, visible: false },
        horzLines: { color: chartGrid, visible: true },
      },
      rightPriceScale: { borderVisible: false, scaleMargins: { top: 0.12, bottom: 0.12 }, minimumWidth: 64 },
      leftPriceScale: { visible: false },
      timeScale: { borderColor: chartGrid, timeVisible: false, secondsVisible: false, rightOffset: 1, minBarSpacing: 0.08, fixLeftEdge: true, fixRightEdge: true },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: chartCrosshair, width: 1, style: 3, labelBackgroundColor: chartLabelBg },
        horzLine: { color: chartCrosshair, width: 1, style: 3, labelBackgroundColor: chartLabelBg },
      },
      handleScroll: { mouseWheel: true, pressedMouseMove: true, horzTouchDrag: true, vertTouchDrag: false },
      handleScale: { axisPressedMouseMove: true, mouseWheel: true, pinch: true },
      kineticScroll: { mouse: true, touch: true },
    })
    chartRef.current = chart

    const commonOptions = {
      lineColor: chartSeries,
      lineWidth: 2 as const,
      priceLineVisible: false,
      lastValueVisible: true,
      crosshairMarkerVisible: true,
      crosshairMarkerRadius: 4,
      priceFormat: chartMetric === 'Price' || mode === 'Amount' ? { type: 'price' as const, precision: 2, minMove: 0.01 } : { type: 'custom' as const, formatter: (value: number) => `${value.toFixed(2)}%`, minMove: 0.01 },
    }
    const primarySeries = chartStyle === 'Area'
      ? chart.addSeries(AreaSeries, { ...commonOptions, topColor: `color-mix(in srgb, ${chartSeries} 20%, transparent)`, bottomColor: 'transparent' })
      : chart.addSeries(LineSeries, { ...commonOptions, color: chartSeries })
    primarySeries.setData(displayPoints.map((point) => ({ time: point.timestamp as UTCTimestamp, value: point.holding })))
    primarySeriesRef.current = primarySeries as ISeriesApi<SeriesType>

    let benchmarkSeries: ISeriesApi<'Line'> | null = null
    if (compare && chartMetric === 'Return') {
      benchmarkSeries = chart.addSeries(LineSeries, {
        color: chartSeriesSoft,
        lineWidth: 2,
        lineStyle: 2,
        priceLineVisible: false,
        lastValueVisible: true,
        crosshairMarkerVisible: true,
        crosshairMarkerRadius: 3,
        priceFormat: mode === 'Percent' ? { type: 'custom', formatter: (value: number) => `${value.toFixed(2)}%`, minMove: 0.01 } : { type: 'price', precision: 2, minMove: 0.01 },
      })
      benchmarkSeries.setData(displayPoints.map((point) => ({ time: point.timestamp as UTCTimestamp, value: point.benchmark })))
    }

    chart.subscribeCrosshairMove((parameter) => {
      const tooltip = tooltipRef.current
      if (!tooltip || !parameter.point || !parameter.time || parameter.point.x < 0 || parameter.point.y < 0) {
        if (tooltip) tooltip.hidden = true
        return
      }
      const primaryData = parameter.seriesData.get(primarySeries)
      const benchmarkData = benchmarkSeries ? parameter.seriesData.get(benchmarkSeries) : undefined
      if (!primaryData || !('value' in primaryData)) { tooltip.hidden = true; return }
      tooltip.hidden = false
      if (tooltipDateRef.current) tooltipDateRef.current.textContent = date(timeLabel(parameter.time), { day: '2-digit', month: 'short', year: 'numeric' })
      if (tooltipPrimaryRef.current) tooltipPrimaryRef.current.textContent = displayValue(Number(primaryData.value), mode, chartMetric, priceCurrency)
      if (tooltipBenchmarkRef.current) tooltipBenchmarkRef.current.textContent = benchmarkData && 'value' in benchmarkData ? displayValue(Number(benchmarkData.value), mode, chartMetric, priceCurrency) : 'Hidden'
      const pointerX = Math.min(Math.max(0, parameter.point.x), container.clientWidth)
      const pointerY = Math.min(Math.max(0, parameter.point.y), container.clientHeight)
      const gap = 14
      const tooltipWidth = tooltip.offsetWidth || 174
      const tooltipHeight = tooltip.offsetHeight || 60
      const placeLeft = pointerX + gap + tooltipWidth > container.clientWidth
      const left = placeLeft
        ? Math.max(8, pointerX - gap - tooltipWidth)
        : Math.min(pointerX + gap, Math.max(8, container.clientWidth - tooltipWidth - 8))
      const top = Math.max(8, Math.min(pointerY - tooltipHeight / 2, Math.max(8, container.clientHeight - tooltipHeight - 8)))
      tooltip.dataset.side = placeLeft ? 'left' : 'right'
      tooltip.style.transform = `translate(${left}px, ${top}px)`
    })

    const resizeObserver = new ResizeObserver(([entry]) => {
      const width = Math.floor(entry.contentRect.width)
      const height = Math.floor(entry.contentRect.height)
      if (width > 0 && height > 0) chart.resize(width, height)
    })
    resizeObserver.observe(container)
    const themeObserver = new MutationObserver(() => {
      const nextStyle = getComputedStyle(container)
      const nextText = nextStyle.getPropertyValue('--muted-2').trim() || '#82908c'
      const nextGrid = nextStyle.getPropertyValue('--line').trim() || '#e6ece9'
      chart.applyOptions({ layout: { textColor: nextText }, grid: { vertLines: { color: nextGrid, visible: false }, horzLines: { color: nextGrid, visible: true } }, timeScale: { borderColor: nextGrid } })
    })
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    chart.timeScale().fitContent()

    return () => {
      resizeObserver.disconnect()
      themeObserver.disconnect()
      chartRef.current = null
      primarySeriesRef.current = null
      chart.remove()
    }
  }, [chartMetric, chartStyle, compare, displayPoints, mode, priceCurrency])

  const pointAtCoordinate = useCallback((clientX: number) => {
    const layer = measureLayerRef.current
    const chart = chartRef.current
    if (!layer || !chart || !displayPoints.length) return null
    const rect = layer.getBoundingClientRect()
    const coordinate = Math.min(Math.max(0, clientX - rect.left), rect.width)
    const chartTime = chart.timeScale().coordinateToTime(coordinate)
    if (!chartTime) return coordinate < rect.width / 2 ? displayPoints[0] : displayPoints.at(-1) ?? null
    const timestamp = typeof chartTime === 'number' ? chartTime : Math.floor(dateTime(timeLabel(chartTime)) / 1000)
    return nearestPoint(displayPoints, timestamp)
  }, [displayPoints])

  const updateMeasureVisual = useCallback((start: DisplayPoint, end: DisplayPoint, startX: number, endX: number) => {
    const box = measureBoxRef.current
    const readout = measureReadoutRef.current
    const layer = measureLayerRef.current
    if (!box || !readout || !layer) return
    const left = Math.min(startX, endX)
    const width = Math.max(2, Math.abs(endX - startX))
    box.style.transform = `translateX(${left}px)`
    box.style.width = `${width}px`
    box.hidden = false
    const result = calculateMeasurement(
      { date: start.date, holdingAmount: start.holdingAmount, benchmarkAmount: 0 },
      { date: end.date, holdingAmount: end.holdingAmount, benchmarkAmount: 0 },
    )
    readout.textContent = `${signedPercent(result.changePercent)} · ${result.days} days${result.annualisedPercent === null ? '' : ` · ${signedPercent(result.annualisedPercent)} annualised`}`
    readout.classList.toggle('negative', result.changePercent < 0)
    readout.style.transform = `translateX(${Math.min(Math.max(8, left + width / 2 - 92), Math.max(8, layer.clientWidth - 202))}px)`
    readout.hidden = false
  }, [])

  const startMeasurement = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!measureActive) return
    const layer = measureLayerRef.current
    const start = pointAtCoordinate(event.clientX)
    if (!layer || !start) return
    layer.setPointerCapture(event.pointerId)
    measureStartRef.current = start
    const rect = layer.getBoundingClientRect()
    const x = Math.min(Math.max(0, event.clientX - rect.left), rect.width)
    updateMeasureVisual(start, start, x, x)
  }

  const moveMeasurement = (event: ReactPointerEvent<HTMLDivElement>) => {
    const start = measureStartRef.current
    const layer = measureLayerRef.current
    if (!start || !layer) return
    if (measureFrameRef.current !== null) cancelAnimationFrame(measureFrameRef.current)
    const clientX = event.clientX
    measureFrameRef.current = requestAnimationFrame(() => {
      const end = pointAtCoordinate(clientX)
      if (!end) return
      const rect = layer.getBoundingClientRect()
      const startTime = start.timestamp as UTCTimestamp
      const startX = chartRef.current?.timeScale().timeToCoordinate(startTime) ?? 0
      const endX = Math.min(Math.max(0, clientX - rect.left), rect.width)
      updateMeasureVisual(start, end, startX, endX)
    })
  }

  const finishMeasurement = (event: ReactPointerEvent<HTMLDivElement>) => {
    const start = measureStartRef.current
    const end = pointAtCoordinate(event.clientX)
    if (!start || !end) return
    setMeasurement(calculateMeasurement(
      { date: start.date, holdingAmount: start.holdingAmount, benchmarkAmount: 0 },
      { date: end.date, holdingAmount: end.holdingAmount, benchmarkAmount: 0 },
    ))
    measureStartRef.current = null
  }

  const applyCustomRange = () => {
    if (!customStart || !customEnd) return
    const [start, end] = dateTime(customStart) <= dateTime(customEnd) ? [customStart, customEnd] : [customEnd, customStart]
    onPeriodChange({ preset: 'CUSTOM', start, end })
    setCustomOpen(false)
    setMeasurement(null)
  }

  const commitNavigator = () => {
    if (!sortedPoints.length) return
    const start = Math.min(navigatorStart, navigatorEnd - 1)
    const end = Math.max(navigatorEnd, start + 1)
    onPeriodChange({ preset: 'CUSTOM', start: isoDay(sortedPoints[start].date), end: isoDay(sortedPoints[end].date) })
    setNavigatorDraft(null)
    setMeasurement(null)
  }

  const toggleCustomRange = () => {
    if (!customOpen) {
      setCustomStart(period.start ?? isoDay(visiblePoints[0]?.date ?? sortedPoints[0]?.date ?? ''))
      setCustomEnd(period.end ?? isoDay(visiblePoints.at(-1)?.date ?? sortedPoints.at(-1)?.date ?? ''))
    }
    setCustomOpen((value) => !value)
  }

  const navigatorPoints = useMemo(() => downsamplePerformancePoints(sortedPoints), [sortedPoints])
  const navigatorPath = useMemo(() => {
    if (navigatorPoints.length < 2) return ''
    const values = navigatorPoints.map((point) => chartMetric === 'Price' ? (point.price ?? point.holdingAmount) : point.holdingAmount)
    const min = Math.min(...values)
    const max = Math.max(...values)
    const range = max - min || 1
    return navigatorPoints.map((point, index) => {
      const x = index / (navigatorPoints.length - 1) * 100
      const value = chartMetric === 'Price' ? (point.price ?? point.holdingAmount) : point.holdingAmount
      const y = 27 - ((value - min) / range) * 22
      return `${index ? 'L' : 'M'}${x.toFixed(2)},${y.toFixed(2)}`
    }).join(' ')
  }, [chartMetric, navigatorPoints])

  if (points.length < 2) return <div className="advanced-chart-empty">More price history is required to build the interactive chart.</div>

  return <section className="advanced-performance-module" aria-label={`${symbol} interactive performance chart`}>
    <div className="advanced-chart-summary">
      <div>
        <span>{symbol} {chartMetric === 'Price' ? 'price' : 'return'}</span>
        <strong className={rawReturn >= 0 ? 'positive' : 'negative'}>{signedPercent(rawReturn)}</strong>
        <small>{date(visiblePoints[0].date, { day: '2-digit', month: 'short', year: 'numeric' })} – {date(visiblePoints.at(-1)!.date, { day: '2-digit', month: 'short', year: 'numeric' })}</small>
      </div>
      <div className="advanced-chart-latest" aria-label="Latest chart values">
        <span><i className="primary"/>{symbol}<strong>{displayValue(primaryLatest, mode, chartMetric, priceCurrency)}</strong></span>
        {compare && chartMetric === 'Return' && <span><i className="benchmark"/>{benchmarkLabel}<strong>{displayValue(benchmarkLatest, mode, chartMetric, priceCurrency)}</strong></span>}
      </div>
    </div>

    <div className="advanced-chart-toolbar">
      <div className="advanced-range-presets" role="group" aria-label="Performance time range">
        {presets.map((preset) => <button key={preset} type="button" className={period.preset === preset ? 'active' : ''} aria-pressed={period.preset === preset} onClick={() => { onPeriodChange({ preset }); setMeasurement(null); setCustomOpen(false) }}>{preset}</button>)}
        <button type="button" className={period.preset === 'CUSTOM' ? 'active' : ''} aria-expanded={customOpen} onClick={toggleCustomRange}><CalendarDays size={13}/>Custom</button>
      </div>
      <div className="advanced-chart-actions">
        <div className="advanced-segmented advanced-metric-toggle" role="group" aria-label="Chart metric"><button type="button" className={chartMetric === 'Return' ? 'active' : ''} aria-pressed={chartMetric === 'Return'} onClick={() => { setChartMetric('Return'); setMeasurement(null) }}>Return</button><button type="button" className={chartMetric === 'Price' ? 'active' : ''} aria-pressed={chartMetric === 'Price'} onClick={() => { setChartMetric('Price'); setMeasurement(null) }}>Price</button></div>
        {chartMetric === 'Return' && <div className="advanced-segmented" role="group" aria-label="Chart value mode"><button type="button" className={mode === 'Amount' ? 'active' : ''} onClick={() => onModeChange('Amount')}>Amount</button><button type="button" className={mode === 'Percent' ? 'active' : ''} onClick={() => onModeChange('Percent')}>Percent</button></div>}
        {chartMetric === 'Return' && <button type="button" className={compare ? 'active' : ''} aria-pressed={compare} onClick={() => setCompare((value) => !value)}><Scale size={14}/>Compare</button>}
        <button type="button" className={measureActive ? 'active' : ''} aria-pressed={measureActive} onClick={() => { setMeasureActive((value) => !value); setMeasurement(null) }}><Crosshair size={14}/>Measure</button>
        <button type="button" aria-label="Change chart style" title="Change chart style" onClick={() => setChartStyle((value) => value === 'Area' ? 'Line' : 'Area')}><SlidersHorizontal size={14}/>{chartStyle}</button>
        <span className="advanced-zoom-controls"><button type="button" aria-label="Zoom in" title="Zoom in" onClick={() => zoomChart(chartRef.current, .72)}><Plus size={14}/></button><button type="button" aria-label="Zoom out" title="Zoom out" onClick={() => zoomChart(chartRef.current, 1.38)}><Minus size={14}/></button><button type="button" aria-label="Reset chart zoom" title="Reset zoom" onClick={() => chartRef.current?.timeScale().fitContent()}><RotateCcw size={14}/></button></span>
      </div>
    </div>

    {customOpen && <div className="advanced-custom-range" role="group" aria-label="Custom chart date range"><label>From<input type="date" value={customStart} min={isoDay(sortedPoints[0].date)} max={customEnd || isoDay(sortedPoints.at(-1)!.date)} onChange={(event) => setCustomStart(event.target.value)}/></label><label>To<input type="date" value={customEnd} min={customStart || isoDay(sortedPoints[0].date)} max={isoDay(sortedPoints.at(-1)!.date)} onChange={(event) => setCustomEnd(event.target.value)}/></label><button type="button" onClick={applyCustomRange}>Apply range</button></div>}

    <div className={`advanced-chart-stage ${measureActive ? 'is-measuring' : ''}`}>
      <div ref={chartContainerRef} className="advanced-chart-canvas"/>
      <div ref={tooltipRef} className="advanced-chart-tooltip" hidden><span ref={tooltipDateRef}/><b><i className="primary"/>{symbol}<strong ref={tooltipPrimaryRef}/></b>{compare && chartMetric === 'Return' && <b><i className="benchmark"/>{benchmarkLabel}<strong ref={tooltipBenchmarkRef}/></b>}</div>
      <div ref={measureLayerRef} className="advanced-measure-layer" onPointerDown={startMeasurement} onPointerMove={moveMeasurement} onPointerUp={finishMeasurement} onPointerCancel={() => { measureStartRef.current = null }}>
        <div ref={measureBoxRef} className="advanced-measure-box" hidden/>
        <div ref={measureReadoutRef} className="advanced-measure-readout" hidden/>
      </div>
    </div>

    <div className="advanced-navigator" aria-label="Chart range navigator">
      <svg viewBox="0 0 100 30" preserveAspectRatio="none" aria-hidden="true"><path d={navigatorPath}/></svg>
      <div className="advanced-navigator-window" style={{ left: `${navigatorStart / Math.max(1, sortedPoints.length - 1) * 100}%`, right: `${100 - navigatorEnd / Math.max(1, sortedPoints.length - 1) * 100}%` }}/>
      <input type="range" aria-label="Navigator start date" min={0} max={Math.max(1, sortedPoints.length - 2)} value={Math.min(navigatorStart, sortedPoints.length - 2)} onChange={(event) => setNavigatorDraft({ start: Math.min(Number(event.target.value), navigatorEnd - 1), end: navigatorEnd })} onPointerUp={commitNavigator} onKeyUp={commitNavigator}/>
      <input type="range" aria-label="Navigator end date" min={1} max={Math.max(1, sortedPoints.length - 1)} value={Math.max(1, navigatorEnd)} onChange={(event) => setNavigatorDraft({ start: navigatorStart, end: Math.max(Number(event.target.value), navigatorStart + 1) })} onPointerUp={commitNavigator} onKeyUp={commitNavigator}/>
    </div>

    <div className="advanced-chart-footer">
      {measurement ? <div className={`advanced-measure-summary ${measurement.changePercent < 0 ? 'negative' : ''}`} aria-live="polite"><Crosshair size={14}/><strong>{signedPercent(measurement.changePercent)}</strong><span>{date(measurement.startDate, { day: '2-digit', month: 'short', year: 'numeric' })} to {date(measurement.endDate, { day: '2-digit', month: 'short', year: 'numeric' })}</span><span>{measurement.days} days</span>{measurement.annualisedPercent !== null && <span>{signedPercent(measurement.annualisedPercent)} annualised</span>}<button type="button" onClick={() => setMeasurement(null)}>Clear</button></div> : <p>{measureActive ? `Drag across the chart to measure ${chartMetric === 'Price' ? 'price change' : 'return'} between any two dates.` : 'Scroll to zoom · drag to pan · select Measure to compare any two dates.'}</p>}
    </div>
  </section>
}
