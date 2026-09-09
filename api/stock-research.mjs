import { loadMarketChart, normaliseCurrency, normalisePriceUnit } from './_market-data.mjs'

export async function researchStock(query, fetcher = fetch) {
  const response = await fetcher(`https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=6&newsCount=0`, { signal: AbortSignal.timeout(7000), headers: { 'User-Agent': 'Mozilla/5.0 Masterdeck/1.0' } })
  if (!response.ok) throw new Error('Stock search is temporarily unavailable. Please retry.')
  const search = await response.json()
  const candidates = (search.quotes || []).filter(item => ['EQUITY', 'ETF', 'MUTUALFUND', 'INDEX'].includes(item.quoteType)).map(item => ({ symbol: item.symbol, name: item.longname || item.shortname || item.symbol, exchange: item.exchDisp || item.exchange, sector: item.sector, industry: item.industry, type: item.quoteType }))
  const match = candidates.find(item => item.symbol.toLowerCase() === query.toLowerCase()) || candidates[0]
  if (!match) return { candidates: [], error: 'No matching listing found. Try its ticker and exchange suffix, such as BHP.AX.' }
  const chart = await loadMarketChart(match.symbol, 'range=3mo&interval=1d', fetcher)
  const meta = chart.meta || {}
  const currency = normaliseCurrency(meta.currency || 'USD')
  const convert = value => Number.isFinite(value) ? normalisePriceUnit(value, meta.currency || 'USD') : null
  const points = (chart.timestamp || []).flatMap((time, index) => {
    const price = convert(chart.indicators?.quote?.[0]?.close?.[index])
    return price === null ? [] : [{ date: new Date(time * 1000).toISOString(), price }]
  })
  return { ...match, candidates, currency, price: convert(meta.regularMarketPrice), high: convert(meta.fiftyTwoWeekHigh), low: convert(meta.fiftyTwoWeekLow), asOf: meta.regularMarketTime ? new Date(meta.regularMarketTime * 1000).toISOString() : null, points, sourceUrl: `https://finance.yahoo.com/quote/${encodeURIComponent(match.symbol)}/` }
}

export default async function handler(request, response) {
  response.setHeader('Content-Type', 'application/json')
  response.setHeader('Cache-Control', 'no-store')
  if (request.method !== 'GET') { response.statusCode = 405; return response.end(JSON.stringify({ error: 'Method not allowed.' })) }
  const query = new URL(request.url, 'http://localhost').searchParams.get('q')?.trim()
  if (!query || query.length > 100) { response.statusCode = 400; return response.end(JSON.stringify({ error: 'Enter a company name or ticker (up to 100 characters).' })) }
  try { response.end(JSON.stringify(await researchStock(query))) }
  catch { response.statusCode = 502; response.end(JSON.stringify({ error: 'Market data is temporarily unavailable. Please try again.' })) }
}
