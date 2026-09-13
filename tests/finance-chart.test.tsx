import { beforeAll, describe, expect, it } from 'vitest'
import { fireEvent, render, screen, cleanup } from '@testing-library/react'
import { FinanceChart } from '../src/components/FinanceChart'
import { nearestFinancePoint, normaliseFinancePoints } from '../src/components/financeChartUtils'

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
})
