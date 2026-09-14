import { beforeAll, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, cleanup } from '@testing-library/react'
import { FinanceChart } from '../src/components/FinanceChart'
import { nearestFinancePoint, normaliseFinancePoints } from '../src/components/financeChartUtils'
import { FinanceProToolbar } from '../src/components/FinanceProToolbar'

beforeAll(() => { globalThis.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} } })
const format = (v: number) => v.toFixed(2)
describe('Finance chart comparisons', () => {
  it('keeps daily dates selectable even when input arrives out of order', () => {
    const points = normaliseFinancePoints([
      { date: '2026-02-27', value: 82 },
      { date: '2026-02-26T13:30:00Z', value: 80 },
      { date: '2026-02-26T13:30:00Z', value: 80.28 },
    ])
    expect(points.map(point => point.date)).toEqual(['2026-02-26T13:30:00.000Z', '2026-02-27T00:00:00.000Z'])
    expect(points[0].value).toBe(80.28)
    expect(nearestFinancePoint(points.map(point => Date.parse(point.date)), Date.parse('2026-02-26T14:00:00Z'))).toBe(0)
  })

  it('uses underlying values in percent view, and clears with Escape', () => {
    render(<FinanceChart points={[{date:'2026-01-01',value:0,measurementValue:100},{date:'2026-02-01',value:20,measurementValue:120}]} formatValue={format}/>)
    const chart = screen.getByRole('img')
    fireEvent.keyDown(chart,{key:'ArrowRight',shiftKey:true})
    expect(screen.getByRole('status').textContent).toContain('20.00 (20.00%)')
    fireEvent.keyDown(chart,{key:'Escape'})
    expect(screen.queryByRole('status')).toBeNull()
    cleanup()
  })

  it('clears a pointer comparison when the drag is released', () => {
    render(<FinanceChart points={[
      { date: '2026-01-01', value: 100 },
      { date: '2026-02-01', value: 120 },
      { date: '2026-03-01', value: 140 },
    ]} formatValue={format}/>)
    const chart = screen.getByRole('img') as unknown as SVGElement
    const plot = chart.parentElement
    Object.defineProperty(chart, 'getBoundingClientRect', {
      configurable: true,
      value: () => ({ left: 0, top: 0, width: 800, height: 310, right: 800, bottom: 310 }),
    })
    chart.setPointerCapture = vi.fn()
    chart.hasPointerCapture = vi.fn(() => true)
    chart.releasePointerCapture = vi.fn()

    fireEvent.pointerDown(chart, { button: 0, pointerId: 1, clientX: 100, clientY: 150 })
    fireEvent.pointerMove(chart, { pointerId: 1, clientX: 650, clientY: 150 })
    expect(plot).toHaveAttribute('data-range', 'true')
    expect(screen.getByRole('status')).toBeInTheDocument()

    fireEvent.pointerUp(chart, { button: 0, pointerId: 1, clientX: 650, clientY: 150 })
    expect(plot).toHaveAttribute('data-range', 'false')
    expect(screen.queryByRole('status')).toBeNull()
    expect(chart.releasePointerCapture).toHaveBeenCalledWith(1)
    cleanup()
  })
  it('handles losses, missing history and a zero baseline without Infinity', () => {
    const {rerender} = render(<FinanceChart points={[]} formatValue={format}/>)
    expect(screen.getByText(/Not enough/)).toBeTruthy()
    rerender(<FinanceChart points={[{date:'2026-01-01',value:100},{date:'2026-02-01',value:70}]} formatValue={format}/>)
    fireEvent.keyDown(screen.getByRole('img'),{key:'ArrowRight',shiftKey:true})
    expect(screen.getByRole('status').textContent).toContain('-30.00 (-30.00%)')
    rerender(<FinanceChart points={[{date:'2026-01-01',value:0},{date:'2026-02-01',value:70}]} formatValue={format}/>)
    fireEvent.keyDown(screen.getByRole('img'),{key:'ArrowRight',shiftKey:true})
    expect(screen.getByRole('status').textContent).not.toMatch(/Infinity|NaN/)
    cleanup()
  })

  it('renders provider OHLC values as candlesticks', () => {
    render(<FinanceChart candles points={[
      { date: '2026-01-01', value: 101, open: 100, high: 104, low: 98, close: 101 },
      { date: '2026-01-02', value: 99, open: 101, high: 103, low: 97, close: 99 },
    ]} formatValue={format}/>)
    const plot = screen.getByRole('img').parentElement
    expect(plot).toHaveAttribute('data-chart-type', 'candles')
    expect(plot?.querySelectorAll('.finance-candle-wick')).toHaveLength(2)
    expect(plot?.querySelectorAll('.finance-candle-body')).toHaveLength(2)
    cleanup()
  })

  it('exposes the Google Finance chart type, comparison and indicator controls', () => {
    const onStyle = vi.fn()
    const onComparison = vi.fn()
    const onIndicators = vi.fn()
    render(<FinanceProToolbar chartStyle="area" onChartStyleChange={onStyle} comparisonOptions={[{ id: 'AMZN', label: 'AMZN', detail: 'Amazon.com Inc · NASDAQ (US)' }]} comparison="none" onComparisonChange={onComparison} indicators={[]} onIndicatorsChange={onIndicators} candleAvailable={false}/>)

    fireEvent.click(screen.getByRole('button', { name: /Area/ }))
    expect(screen.getByRole('menuitemradio', { name: /Line/ })).toBeInTheDocument()
    expect(screen.getByRole('menuitemradio', { name: /Candle/ })).toBeDisabled()
    fireEvent.click(screen.getByRole('menuitemradio', { name: /Line/ }))
    expect(onStyle).toHaveBeenCalledWith('line')

    fireEvent.click(screen.getByRole('button', { name: /Compare/ }))
    fireEvent.click(screen.getByRole('menuitemradio', { name: /AMZN/ }))
    expect(onComparison).toHaveBeenCalledWith('AMZN')

    fireEvent.click(screen.getByRole('button', { name: /Indicators/ }))
    fireEvent.click(screen.getByRole('menuitemcheckbox', { name: 'Moving average' }))
    expect(onIndicators).toHaveBeenCalledWith(['sma'])
    cleanup()
  })

  it('renders selected moving average, envelope and MACD series', () => {
    const points = Array.from({ length: 30 }, (_, index) => ({ date: `2026-01-${String(index + 1).padStart(2, '0')}`, value: 100 + index + Math.sin(index) }))
    render(<FinanceChart points={points} chartStyle="area" indicators={['sma', 'envelope', 'macd']} formatValue={format}/>)
    const plot = screen.getByRole('img').parentElement
    expect(plot).toHaveAttribute('data-chart-style', 'area')
    expect(plot).toHaveAttribute('data-indicators', 'sma,envelope,macd')
    expect(plot?.querySelectorAll('.finance-indicator-sma')).toHaveLength(1)
    expect(plot?.querySelectorAll('.finance-indicator-envelope')).toHaveLength(2)
    expect(plot?.querySelectorAll('.finance-indicator-line')).toHaveLength(5)
    expect(plot?.querySelector('.finance-indicator-title')).toHaveTextContent('MACD')
    cleanup()
  })
})
