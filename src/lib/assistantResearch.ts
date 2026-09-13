import type { PortfolioAnswer } from './portfolioAssistant'

export const questionGroups = {
  Portfolio: ['Show my portfolio value', 'Where am I concentrated?', 'How much income have I received?', 'Summarise my tax position', 'Show my biggest winners', 'Show my biggest losers'],
  Exposure: ['Show my currency exposure', 'Show my sector exposure', 'Show my largest positions', 'How much cash do I have?', 'How many holdings do I have?', 'Show my daily movement'],
  Records: ['How much have I paid in fees?', 'Show my transaction history', 'What are unrealised gains?', 'How do I import investments?', 'What can you do?', 'Show my dividend income'],
  Stocks: ['Tell me about Apple', 'Research NVIDIA', 'Look up BHP.AX', 'Research Microsoft', 'Look up VGS.AX', 'Tell me about Tesla'],
}

export function stockQuery(question: string): string | null {
  const clean = question.trim()
  const conversational = clean.match(/^(?:how is|how's)\s+(.+?)\s+(?:doing|performing)[?!]*$/i) || clean.match(/^(.+?)\s+(?:stock price|share price)[?!]*$/i)
  if (conversational && !/^(my|the)\b/i.test(conversational[1])) return conversational[1].slice(0, 100)
  const explicit = clean.match(/^(?:tell me about|research|look up|lookup|stock overview(?: for)?|price (?:of|for)|what is)\s+(.+?)[?!]*$/i)
  if (explicit && !/^(my |the |a |unrealised|capital|portfolio|cash|income|tax)/i.test(explicit[1])) return explicit[1].replace(/\s+(stock|share price)$/i, '').slice(0, 100)
  if (/^\$?[A-Z0-9^][A-Z0-9.^=-]{0,14}$/.test(clean)) return clean.replace(/^\$/, '')
  if (/^[a-z][a-z0-9.& -]{0,60}$/i.test(clean) && clean.split(/\s+/).length <= 4 && !/\b(my|show|how|what|why|explain|portfolio|income|cash|value|tax|fees|dividend|return|gain|help|record|transaction|exposure|buy|sell|recommend|predict)\b/i.test(clean)) return clean
  return null
}

export async function researchAnswer(query: string, signal: AbortSignal): Promise<PortfolioAnswer> {
  const response = await fetch(`/api/stock-research?q=${encodeURIComponent(query)}`, { signal })
  const data = await response.json()
  if (!response.ok || data.error) throw new Error(data.error || 'Stock research is unavailable.')
  const amount = (value: number | null) => value == null ? 'Unavailable' : new Intl.NumberFormat('en-AU', { style: 'currency', currency: data.currency }).format(value)
  const first = data.points?.[0]
  const last = data.points?.at(-1)
  const period = first?.price > 0 && last ? ` Across the available daily history, the price moved ${((last.price / first.price - 1) * 100).toFixed(2)}%. This price change excludes dividends and currency effects.` : ''
  return {
    title: data.name,
    symbol: data.symbol,
    exchange: data.exchange,
    currency: data.currency,
    text: `${data.symbol} · ${data.exchange} · ${data.type === 'ETF' ? 'Exchange-traded fund' : data.type === 'EQUITY' ? 'Listed company' : data.type}. ${[data.sector, data.industry].filter(Boolean).join(' · ')}${data.sector ? '.' : ''} Prices are quoted in ${data.currency}.${period}`,
    metrics: [{ label: 'Latest price', value: amount(data.price) }, { label: '52-week low', value: amount(data.low) }, { label: '52-week high', value: amount(data.high) }],
    points: data.points,
    source: { url: data.sourceUrl, label: 'Yahoo Finance', asOf: data.asOf },
    alternatives: data.candidates.filter((item: { symbol: string }) => item.symbol !== data.symbol).slice(0, 3),
  }
}
