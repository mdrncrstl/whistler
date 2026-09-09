import { cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { PointerChartEnhancer } from '../src/components/PointerChartSurface'

describe('pointer chart enhancer', () => {
  afterEach(cleanup)

  it('records the raw pointer position and clears it when the pointer leaves', () => {
    const { container } = render(<><div className="report-chart" /><PointerChartEnhancer /></>)
    const chart = container.querySelector('.report-chart') as HTMLElement
    Object.defineProperty(chart, 'getBoundingClientRect', {
      configurable: true,
      value: () => ({ left: 100, top: 50, width: 400, height: 200, right: 500, bottom: 250, x: 100, y: 50, toJSON: () => ({}) }),
    })

    const move = new Event('pointermove', { bubbles: true })
    Object.defineProperties(move, { clientX: { value: 455 }, clientY: { value: 150 } })
    chart.dispatchEvent(move)

    expect(chart.style.getPropertyValue('--chart-pointer-x')).toBe('355px')
    expect(chart.style.getPropertyValue('--chart-pointer-y')).toBe('100px')
    expect(chart).toHaveAttribute('data-chart-pointer-visible', 'true')
    expect(chart).toHaveAttribute('data-chart-pointer-side', 'left')

    chart.dispatchEvent(new Event('pointerleave'))
    expect(chart).toHaveAttribute('data-chart-pointer-visible', 'false')
    expect(chart).not.toHaveAttribute('data-chart-pointer-side')
  })
})
