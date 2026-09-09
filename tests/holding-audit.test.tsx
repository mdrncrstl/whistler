import { describe, expect, it } from 'vitest'
import { isFund } from '../src/lib/assetType'
import { PriceSummary } from '../src/components/PriceSummary'
import { render, screen, cleanup } from '@testing-library/react'
import type { MarketMovement } from '../src/lib/marketDataApi'

describe('holding audit regressions', () => {
  it('recognises ETFs by classification, name and supported ticker', () => {
    expect(isFund({ symbol: 'VAS' })).toBe(true)
    expect(isFund({ symbol: 'XYZ', asset_class: 'ETF' })).toBe(true)
    expect(isFund({ symbol: 'XYZ', name: 'Global Index Fund' })).toBe(true)
    expect(isFund({ symbol: 'AAPL', name: 'Apple Inc.', asset_class: 'Equity' })).toBe(false)
  })
  it('summarises the full observed period instead of showing daily cards', () => {
    const item = { previousPrice: 100, price: 110, date: '2026-09-01', change: 10, changePercent: 10, direction: 'up' as const, headline: '', description: '', context: '', sources: [] }
    const movement: MarketMovement = { symbol: 'VAS', name: 'Vanguard', currency: 'AUD', exchange: 'ASX', generatedAt: '2026-09-02', provider: 'market-data', source: 'Market data', sourceNote: '', items: [{ ...item, date: '2026-09-02', previousPrice: 110, price: 120 }, item] }
    render(<PriceSummary movement={movement} loading={false} error={null}/>)
    expect(screen.getByLabelText('Price summary')).toHaveTextContent('rose 20.00%')
    expect(screen.getByLabelText('Price summary')).toHaveTextContent('No matching company report')
    cleanup()
  })
})
