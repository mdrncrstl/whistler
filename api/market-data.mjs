import { cleanSymbol, loadFxRate, loadQuote, mapConcurrent, normaliseCurrency } from './_market-data.mjs'

const MAX_SYMBOLS = 40

function sendJson(response, status, body, cache = false) {
  response.statusCode = status
  response.setHeader('Content-Type', 'application/json; charset=utf-8')
  response.setHeader('Cache-Control', cache ? 'public, max-age=15, s-maxage=60, stale-while-revalidate=300' : 'no-store')
  response.end(JSON.stringify(body))
}

function parseRequests(url) {
  return url.searchParams.getAll('symbol').slice(0, MAX_SYMBOLS).map((value, index) => {
    const [symbol = '', market = '', currency = ''] = value.split('|').map((item) => decodeURIComponent(item))
    return { requestId: `${cleanSymbol(symbol)}:${cleanSymbol(market)}:${index}`, symbol, market, currency: normaliseCurrency(currency) }
  }).filter((item) => item.symbol)
}

export default async function handler(request, response) {
  if (request.method !== 'GET') return sendJson(response, 405, { error: 'Method not allowed.' })
  try {
    const requestUrl = new URL(request.url, 'http://localhost')
    const requests = parseRequests(requestUrl)
    if (!requests.length) return sendJson(response, 400, { error: 'Provide at least one symbol.' })

    const quoteResults = await mapConcurrent(requests, 6, async (item) => {
      try { return { ok: true, quote: await loadQuote(item) } }
      catch (error) { return { ok: false, failure: { requestId: item.requestId, symbol: cleanSymbol(item.symbol), market: cleanSymbol(item.market), error: error instanceof Error ? error.message : 'Quote unavailable.' } } }
    })
    const quotes = quoteResults.filter((item) => item.ok).map((item) => item.quote)
    const failures = quoteResults.filter((item) => !item.ok).map((item) => item.failure)
    const currencies = [...new Set(requests.map((item) => normaliseCurrency(item.currency)).filter((item) => item && item !== 'AUD'))]
    const fxResults = await mapConcurrent(currencies, 4, async (currency) => {
      try { return await loadFxRate(currency, 'AUD') }
      catch { return { currency, rate: null, asOf: null, source: 'Unavailable' } }
    })
    const fx = Object.fromEntries([{ currency: 'AUD', rate: 1, asOf: new Date().toISOString(), source: 'Base currency' }, ...fxResults].map((item) => [item.currency, item]))

    return sendJson(response, quotes.length ? 200 : 502, {
      generatedAt: new Date().toISOString(),
      baseCurrency: 'AUD',
      source: 'Just now',
      quotes,
      fx,
      failures,
    }, quotes.length > 0)
  } catch (error) {
    return sendJson(response, 502, { error: error instanceof Error ? error.message : 'Unable to load market data.' })
  }
}
