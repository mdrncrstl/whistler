import { useEffect } from 'react'

const chartSelector = [
  '.main-chart',
  '.ai-stock-plot',
  '.portfolio-main-chart',
  '.income-chart',
  '.report-chart',
  '.donut-chart',
  '.advanced-chart-stage',
  '.holding-chart-surface',
].join(',')

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max)

/**
 * Recharts and Lightweight Charts each calculate the nearest datum themselves,
 * but their built-in tooltip wrappers can ease or snap to that datum. This small
 * document-level bridge only writes pointer coordinates to CSS, so every chart's
 * existing content stays intact while its detail card follows the real pointer.
 */
export function PointerChartEnhancer() {
  useEffect(() => {
    const listeners = new Map<HTMLElement, { move: (event: PointerEvent) => void; leave: () => void }>()

    const attach = (element: Element) => {
      if (!(element instanceof HTMLElement) || listeners.has(element)) return

      const move = (event: PointerEvent) => {
        const bounds = element.getBoundingClientRect()
        if (!bounds.width || !bounds.height) return
        const x = clamp(event.clientX - bounds.left, 0, bounds.width)
        const tooltip = element.querySelector<HTMLElement>('.recharts-tooltip-wrapper')
        const height = tooltip?.offsetHeight || 80
        const width = tooltip?.offsetWidth || 210
        const y = clamp(event.clientY - bounds.top, height / 2, Math.max(height / 2, bounds.height - height / 2))
        element.style.setProperty('--chart-pointer-x', `${x}px`)
        element.style.setProperty('--chart-pointer-y', `${y}px`)
        element.dataset.chartPointerVisible = 'true'
        element.dataset.chartPointerSide = x + width + 14 > bounds.width ? 'left' : 'right'
      }
      const leave = () => {
        element.dataset.chartPointerVisible = 'false'
        delete element.dataset.chartPointerSide
      }

      element.addEventListener('pointermove', move)
      element.addEventListener('pointerleave', leave)
      element.addEventListener('pointercancel', leave)
      listeners.set(element, { move, leave })
    }

    const scan = () => {
      document.querySelectorAll(chartSelector).forEach(attach)
      listeners.forEach(({ move, leave }, element) => {
        if (element.isConnected) return
        element.removeEventListener('pointermove', move)
        element.removeEventListener('pointerleave', leave)
        element.removeEventListener('pointercancel', leave)
        listeners.delete(element)
      })
    }
    scan()
    const observer = new MutationObserver(scan)
    observer.observe(document.body, { childList: true, subtree: true })

    return () => {
      observer.disconnect()
      listeners.forEach(({ move, leave }, element) => {
        element.removeEventListener('pointermove', move)
        element.removeEventListener('pointerleave', leave)
        element.removeEventListener('pointercancel', leave)
      })
    }
  }, [])

  return null
}
