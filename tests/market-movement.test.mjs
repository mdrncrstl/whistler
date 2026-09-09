import { describe, expect, it } from 'vitest'
import { buildDailyMovement, matchNewsToSessions, parseNewsFeed, relevantCompanyNews } from '../api/market-movement.mjs'

describe('daily market movement', () => {
  it('builds the latest fourteen trading-session facts from daily closes', () => {
    const chart = {
      meta: { currency: 'USD', longName: 'Apple Inc.', fullExchangeName: 'Nasdaq' },
      timestamp: Array.from({ length: 16 }, (_, index) => 1_700_000_000 + index * 86_400),
      indicators: { quote: [{ close: Array.from({ length: 16 }, (_, index) => 100 + index) }] },
    }
    const movement = buildDailyMovement(chart, 'AAPL', 'NASDAQ')
    expect(movement.symbol).toBe('AAPL')
    expect(movement.name).toBe('Apple Inc.')
    expect(movement.items).toHaveLength(14)
    expect(movement.items[0]).toMatchObject({ price: 102, previousPrice: 101, direction: 'up' })
    expect(movement.items.at(-1)).toMatchObject({ price: 115, previousPrice: 114 })
    expect(movement.items.at(-1)?.changePercent).toBeCloseTo(.877, 2)
  })

  it('parses public RSS items, strips markup, decodes entities, and unwraps Bing links', () => {
    const xml = `<?xml version="1.0"?><rss><channel><item><title><![CDATA[Apple &amp; suppliers]]></title><link>https://www.bing.com/news/apiclick.aspx?url=https%3A%2F%2Fexample.com%2Fstory</link><pubDate>Fri, 28 Aug 2026 08:00:00 GMT</pubDate><description><![CDATA[<p>Reported context &amp; detail.</p>]]></description><source>Example News</source></item><item><title>Ignore missing date</title><link>https://example.com/ignore</link></item></channel></rss>`
    expect(parseNewsFeed(xml)).toEqual([{
      date: '2026-08-28',
      title: 'Apple & suppliers',
      description: 'Reported context & detail.',
      url: 'https://example.com/story',
      source: 'Example News',
      publishedAt: '2026-08-28T08:00:00.000Z',
    }])
  })

  it('matches the nearest dated reports to sessions without reusing a report', () => {
    const sessions = [{ date: '2026-08-27' }, { date: '2026-08-28' }]
    const articles = [
      { date: '2026-08-28', title: 'Exact report', description: 'The exact dated report.', url: 'https://example.com/exact', source: 'Example', publishedAt: '2026-08-28T09:00:00.000Z' },
      { date: '2026-08-26', title: 'Earlier report', description: 'The earlier dated report.', url: 'https://example.com/earlier', source: 'Example', publishedAt: '2026-08-26T09:00:00.000Z' },
    ]
    expect(matchNewsToSessions(articles, sessions)).toEqual([
      { date: '2026-08-27', headline: 'Earlier report', description: 'The earlier dated report.', sources: [{ title: 'Example', url: 'https://example.com/earlier' }] },
      { date: '2026-08-28', headline: 'Exact report', description: 'The exact dated report.', sources: [{ title: 'Example', url: 'https://example.com/exact' }] },
    ])
  })
})

it('does not assign later reports to earlier trading sessions', () => {
    expect(matchNewsToSessions([{ date: '2026-09-05', title: 'Future report', url: 'https://example.com/future', publishedAt: '2026-09-05T12:00:00Z' }], [{ date: '2026-09-04' }])).toEqual([])
  })

it('rejects unrelated and automated news before matching sessions', () => {
  const articles = [
    { title: 'Apple announces its next iPhone launch' },
    { title: 'Self-driving next task: potholes', description: 'Tesla rises' },
    { title: 'Apple Inc AAPL Holding History' },
    { title: 'Google announces new search features' },
  ]
  expect(relevantCompanyNews(articles, 'AAPL', 'Apple Inc.')).toEqual([articles[0]])
  expect(relevantCompanyNews(articles, 'GOOGL', 'Alphabet Inc.')).toEqual([articles[3]])
})
