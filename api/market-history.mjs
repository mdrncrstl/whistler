import { buildMarketHistoryPoints, loadMarketChart, normaliseCurrency, normaliseTicker } from './_market-data.mjs'

const CACHE_TTL_MS = 60 * 60 * 1000
const historyCache = new Map()
const COMMON_QUERY = 'events=div%2Csplits&includePrePost=false&includeAdjustedClose=true'
const PERIOD_QUERIES = {
  '1D': { query: `range=5d&interval=5m&${COMMON_QUERY}`, interval: '5m' },
  '5D': { query: `range=10d&interval=15m&${COMMON_QUERY}`, interval: '15m' },
  '1W': { query: `range=10d&interval=15m&${COMMON_QUERY}`, interval: '15m' },
  '1M': { query: `range=3mo&interval=1h&${COMMON_QUERY}`, interval: '1h' },
  '6M': { query: `range=1y&interval=1d&${COMMON_QUERY}`, interval: '1d' },
  YTD: { query: `range=1y&interval=1d&${COMMON_QUERY}`, interval: '1d' },
  '1Y': { query: `range=2y&interval=1d&${COMMON_QUERY}`, interval: '1d' },
  '5Y': { query: `range=10y&interval=1d&${COMMON_QUERY}`, interval: '1d' },
}

export function historyQueryForPeriod(period = 'MAX') {
  const key = String(period).toUpperCase()
  return PERIOD_QUERIES[key] || { query: `period1=${Math.floor(Date.now() / 1000) - 3653 * 24 * 60 * 60}&period2=${Math.floor(Date.now() / 1000)}&interval=1d&${COMMON_QUERY}`, interval: '1d' }
}

function sendJson(response, status, body, cache = false) {
  response.statusCode = status
  response.setHeader('Content-Type', 'application/json; charset=utf-8')
  response.setHeader('Cache-Control', cache ? 'public, s-maxage=3600, stale-while-revalidate=21600' : 'no-store')
  response.end(JSON.stringify(body))
}

async function loadHistory(symbol, market, period = 'MAX') {
  const ticker = normaliseTicker(symbol, market)
  if (!ticker) throw Object.assign(new Error('Provide a market symbol.'), { statusCode: 400 })
  const key = String(period).toUpperCase()
  const cacheKey = `${ticker}|${key}`
  const cached = historyCache.get(cacheKey)
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) return cached.payload

  const request = historyQueryForPeriod(key)
  const chart = await loadMarketChart(ticker, request.query)
  if (!chart?.timestamp?.length) throw new Error(`No ${request.interval} market history is available for ${ticker}.`)
  const rawCurrency = chart.meta?.currency || ''
  const points = buildMarketHistoryPoints(chart, rawCurrency)
  const splits = Object.values(chart.events?.splits || {}).map(split => ({ date: new Date(split.date * 1000).toISOString(), numerator: Number(split.numerator), denominator: Number(split.denominator) }))
  const payload = { symbol: ticker, currency: normaliseCurrency(rawCurrency), exchange: chart.meta?.fullExchangeName || chart.meta?.exchangeName || market || '', source: 'Just now', generatedAt: new Date().toISOString(), period: key, interval: request.interval, points, splits }
  historyCache.set(cacheKey, { fetchedAt: Date.now(), payload })
  return payload
}

export default async function handler(request, response) {
  if (request.method !== 'GET') return sendJson(response, 405, { error: 'Method not allowed.' })
  try {
    const requestUrl = new URL(request.url, 'http://localhost')
    const symbol = requestUrl.searchParams.get('symbol') || ''
    const market = requestUrl.searchParams.get('market') || ''
    const period = requestUrl.searchParams.get('period') || 'MAX'
    return sendJson(response, 200, await loadHistory(symbol, market, period), true)
  } catch (error) {
    return sendJson(response, Number(error?.statusCode) || 502, { error: error instanceof Error ? error.message : 'Unable to load market history.' })
  }
}
