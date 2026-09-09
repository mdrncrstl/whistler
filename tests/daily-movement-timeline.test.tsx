import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { DailyMovementTimeline } from '../src/components/DailyMovementTimeline'
import type { MarketMovement } from '../src/lib/marketDataApi'

const movement: MarketMovement = {
  symbol: 'AAPL',
  name: 'Apple Inc.',
  currency: 'USD',
  exchange: 'NASDAQ',
  generatedAt: '2026-09-05T00:00:00.000Z',
  provider: 'news',
  source: 'Just now',
  sourceNote: 'Dated market context appears when a public report matches the session.',
  items: [{
    date: '2026-09-04T00:00:00.000Z',
    price: 320.41,
    previousPrice: 328.23,
    change: -7.82,
    changePercent: -2.38,
    direction: 'down',
    headline: 'SCHG Owns More Apple Than Tesla, Meta and Palantir Combined.',
    description: 'Closed at USD 320.41, fell 2.38% against the prior session.',
    context: 'SCHG markets itself as a diversified large-cap growth fund.',
    sources: [{ title: '247wallst', url: 'https://example.com/article' }],
  }],
}

describe('DailyMovementTimeline', () => {
  afterEach(cleanup)

  it('keeps the Perplexity-style article context, close line and source link separate', () => {
    render(<DailyMovementTimeline movement={movement} />)

    expect(screen.getByRole('region', { name: 'Recent price movement' })).toBeInTheDocument()
    expect(screen.getByText('Just now')).toBeInTheDocument()
    expect(screen.getByText('1 session')).toBeInTheDocument()
    expect(screen.getByText(movement.items[0].context)).toHaveClass('holding-movement-context')
    expect(screen.getByText(movement.items[0].description)).toHaveClass('holding-movement-price')
    expect(screen.getByRole('link', { name: '247wallst' })).toHaveAttribute('target', '_blank')
  })

  it('uses a close-only row when no verified article context exists', () => {
    render(<DailyMovementTimeline movement={{ ...movement, provider: 'market-data', items: [{ ...movement.items[0], context: 'No verified company-specific catalyst was supplied by the market data feed.', headline: 'Higher close' }] }} />)

    expect(screen.getByText('Higher close')).toBeInTheDocument()
    expect(screen.getByText(movement.items[0].description)).toHaveClass('holding-movement-price-only')
    expect(screen.queryByText(movement.items[0].context)).not.toBeInTheDocument()
  })
})
