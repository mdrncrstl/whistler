import { buildMarketHistoryPoints, loadMarketChart, normaliseCurrency, normaliseTicker } from './_market-data.mjs'

const CACHE_TTL_MS = 60 * 60 * 1000
const historyCache = new Map()

function sendJson(response, status, body, cache = false) {
  response.statusCode = status
  response.setHeader('Content-Type', 'application/json; charset=utf-8')
  response.setHeader('Cache-Control', cache ? 'public, s-maxage=3600, stale-while-revalidate=21600' : 'no-store')
  response.end(JSON.stringify(body))
}

async function loadHistory(symbol, market) {
  const ticker = normaliseTicker(symbol, market)
  if (!ticker) throw Object.assign(new Error('Provide a market symbol.'), { statusCode: 400 })
  const cached = historyCache.get(ticker)
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) return cached.payload

  const period2 = Math.floor(Date.now() / 1000)
  const period1 = period2 - 3653 * 24 * 60 * 60
  const chart = await loadMarketChart(ticker, `period1=${period1}&period2=${period2}&interval=1d&events=div%2Csplits&includeAdjustedClose=true`)
  if (!chart?.timestamp?.length) throw new Error(`No daily market history is available for ${ticker}.`)
  const rawCurrency = chart.meta?.currency || ''
  const points = buildMarketHistoryPoints(chart, rawCurrency)
  const splits = Object.values(chart.events?.splits || {}).map(split => ({ date: new Date(split.date * 1000).toISOString(), numerator: Number(split.numerator), denominator: Number(split.denominator) }))
  const payload = { symbol: ticker, currency: normaliseCurrency(rawCurrency), exchange: chart.meta?.fullExchangeName || chart.meta?.exchangeName || market || '', source: 'Just now', generatedAt: new Date().toISOString(), points, splits }
  historyCache.set(ticker, { fetchedAt: Date.now(), payload })
  return payload
}

export default async function handler(request, response) {
  if (request.method !== 'GET') return sendJson(response, 405, { error: 'Method not allowed.' })
  try {
    const requestUrl = new URL(request.url, 'http://localhost')
    const symbol = requestUrl.searchParams.get('symbol') || ''
    const market = requestUrl.searchParams.get('market') || ''
    return sendJson(response, 200, await loadHistory(symbol, market), true)
  } catch (error) {
    return sendJson(response, Number(error?.statusCode) || 502, { error: error instanceof Error ? error.message : 'Unable to load market history.' })
  }
}
