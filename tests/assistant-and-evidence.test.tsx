import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { demoBundle } from '../src/data/demo'
import { portfolioAnswer } from '../src/lib/portfolioAssistant'
import { companyDisclosures, companyLogoSymbol } from '../src/data/companyDisclosures'
import { PriceSummary } from '../src/components/PriceSummary'
import type { MarketMovement } from '../src/lib/marketDataApi'

describe('deterministic portfolio answers', () => {
  it('routes distinct intents to their calculations and reports', () => {
    expect(portfolioAnswer('Where am I concentrated?', demoBundle).href).toBe('/app/reports/diversification')
    expect(portfolioAnswer('income', demoBundle).text).toContain('recorded income transactions')
    expect(portfolioAnswer('tax', demoBundle).text).toContain('not realised capital gains')
    expect(portfolioAnswer('AAPL', demoBundle).href).toBe('/app/holdings/AAPL')
  })
  it('does not substitute a generic portfolio answer for unsupported questions or periods', () => {
    expect(portfolioAnswer('Explain quantum physics', demoBundle).title).toBe('Try a portfolio question')
    expect(portfolioAnswer('Why did Apple fall?', demoBundle).text).toContain('cannot predict')
    expect(portfolioAnswer('Income last month', demoBundle).title).toBe('Choose a reporting period')
  })
  it('handles an empty workspace without example balances', () => {
    expect(portfolioAnswer('portfolio value', { ...demoBundle, holdings: [], transactions: [], cash: [] }).href).toBe('/app/connections')
  })
})

describe('relationship evidence', () => {
  it('supplements Apple with individually dated primary disclosures', () => {
    expect(companyDisclosures.filter(item => item.from === 'apple').length).toBeGreaterThan(10)
    expect(companyDisclosures.every(item => item.sourceUrl?.startsWith('https://') && item.updated && item.sourceKind === 'company-disclosure')).toBe(true)
  })
  it('gives Google LLC its logo without pretending the subsidiary has a stock listing', () => {
    const google = { name: 'Google LLC' }
    expect(companyLogoSymbol(google)).toBe('GOOGL')
    expect(google).not.toHaveProperty('ticker')
  })
})

describe('price summary', () => {
  const movement: MarketMovement = { symbol: 'AAPL', name: 'Apple', currency: 'USD', exchange: 'NASDAQ', generatedAt: '2026-09-04T16:00:00Z', provider: 'news', source: 'test', sourceNote: '', items: [{ date: '2026-09-04', price: 101, previousPrice: 100, change: 1, changePercent: 1, direction: 'up', headline: 'Apple rises after an earnings beat', description: '', context: '', sources: [{ title: 'Test publisher', url: 'https://example.com/earnings' }] }] }
  it('uses returned news in the paragraph instead of always discarding it', () => {
    const html = renderToStaticMarkup(<PriceSummary movement={movement} loading={false} error={null}/>)
    expect(html).toContain('Apple rises after an earnings beat')
    expect(html).toContain('https://example.com/earnings')
    expect(html).not.toContain('does not establish a specific cause')
  })
  it('keeps a clear no-news state instead of manufacturing a catalyst', () => {
    const html = renderToStaticMarkup(<PriceSummary movement={{ ...movement, items: movement.items.map(item => ({ ...item, sources: [] })) }} loading={false} error={null}/>)
    expect(html).toContain('No matching company report')
    expect(html).not.toContain('earnings beat')
  })

})
