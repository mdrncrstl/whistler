import { beforeAll, describe, expect, it } from 'vitest'
import { fireEvent, render, screen, cleanup } from '@testing-library/react'
import { FinanceChart } from '../src/components/FinanceChart'

beforeAll(() => { globalThis.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} } })
const format = (v: number) => v.toFixed(2)
describe('Finance chart comparisons', () => {
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
})
