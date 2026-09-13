const REQUEST_TIMEOUT_MS = 5500

const MARKET_SUFFIXES = new Map([
  ['ASX', '.AX'], ['AU', '.AX'], ['LSE', '.L'], ['LON', '.L'], ['TSX', '.TO'], ['TSXV', '.V'],
  ['HKEX', '.HK'], ['HKG', '.HK'], ['NSE', '.NS'], ['BSE', '.BO'], ['JPX', '.T'], ['TSE', '.T'],
  ['SIX', '.SW'], ['SWX', '.SW'], ['XETRA', '.DE'], ['FRA', '.F'], ['EPA', '.PA'], ['PAR', '.PA'],
  ['AMS', '.AS'], ['BRU', '.BR'], ['MIL', '.MI'], ['BIT', '.MI'], ['STO', '.ST'], ['CPH', '.CO'],
  ['HEL', '.HE'], ['OSL', '.OL'], ['WSE', '.WA'], ['BME', '.MC'], ['JSE', '.JO'], ['SGX', '.SI'],
  ['KOSPI', '.KS'], ['KOSDAQ', '.KQ'], ['TWSE', '.TW'], ['TPEX', '.TWO'], ['IDX', '.JK'],
  ['BVMF', '.SA'], ['BMV', '.MX'], ['NZX', '.NZ'], ['SET', '.BK'], ['KLSE', '.KL'], ['IST', '.IS'],
])

const US_MARKETS = new Set(['NASDAQ', 'NAS', 'NMS', 'NYSE', 'NYQ', 'AMEX', 'ASE', 'ARCA', 'PCX', 'US'])

export function cleanSymbol(value) {
  return String(value || '').trim().toUpperCase()
}

export function normaliseCurrency(value) {
  const currency = cleanSymbol(value)
  if (currency === 'GBP' || currency === 'GBX' || currency === 'GBP.') return 'GBP'
  if (currency === 'ILA') return 'ILS'
  return currency
}

export function normaliseTicker(symbol, market) {
  let ticker = cleanSymbol(symbol)
  if (!ticker) return ''
  if (ticker.includes('=') || ticker.startsWith('^') || /\.[A-Z]{1,4}$/.test(ticker)) return ticker
  const marketCode = cleanSymbol(market).replaceAll(' ', '')
  if (US_MARKETS.has(marketCode)) return ticker.replace('.', '-')
  const suffix = MARKET_SUFFIXES.get(marketCode)
  return suffix ? `${ticker}${suffix}` : ticker
}

function finite(value) {
  if (value === null || value === undefined || value === '') return null
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

async function requestChart(host, ticker, query, fetcher) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  try {
    const url = `https://${host}/v8/finance/chart/${encodeURIComponent(ticker)}?${query}`
    const response = await fetcher(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json', 'User-Agent': 'Mozilla/5.0 Masterdeck/1.0' },
    })
    if (!response.ok) throw new Error(`upstream ${response.status}`)
    const payload = await response.json()
    const chart = payload?.chart?.result?.[0]
    if (!chart) throw new Error(payload?.chart?.error?.description || 'empty upstream response')
    return chart
  } finally {
    clearTimeout(timeout)
  }
}

export async function loadMarketChart(ticker, query, fetcher = fetch) {
  let firstError
  for (const host of ['query1.finance.yahoo.com', 'query2.finance.yahoo.com']) {
    try { return await requestChart(host, ticker, query, fetcher) }
    catch (error) { firstError ||= error }
  }
  throw firstError || new Error('Market data provider unavailable.')
}

function lastFinite(values = []) {
  for (let index = values.length - 1; index >= 0; index -= 1) {
    const value = finite(values[index])
    if (value !== null) return { value, index }
  }
  return null
}

function previousFinite(values = [], beforeIndex) {
  for (let index = beforeIndex - 1; index >= 0; index -= 1) {
    const value = finite(values[index])
    if (value !== null) return value
  }
  return null
}

export function normaliseQuoteUnits(price, previousClose, rawCurrency) {
  const inPence = rawCurrency === 'GBp' || rawCurrency === 'GBX'
  return {
    price: inPence ? price / 100 : price,
    previousClose: inPence ? previousClose / 100 : previousClose,
    currency: normaliseCurrency(rawCurrency),
  }
}

export function normalisePriceUnit(price, rawCurrency) {
  const value = Number(price)
  return rawCurrency === 'GBp' || rawCurrency === 'GBX' ? value / 100 : value
}

/** Preserve the provider's complete OHLC observations so charts never invent candle values. */
export function buildMarketHistoryPoints(chart, rawCurrency) {
  const timestamps = Array.isArray(chart?.timestamp) ? chart.timestamp : []
  const quote = chart?.indicators?.quote?.[0] || {}
  const closes = Array.isArray(quote.close) ? quote.close : []
  const opens = Array.isArray(quote.open) ? quote.open : []
  const highs = Array.isArray(quote.high) ? quote.high : []
  const lows = Array.isArray(quote.low) ? quote.low : []
  const volumes = Array.isArray(quote.volume) ? quote.volume : []
  const adjusted = chart?.indicators?.adjclose?.[0]?.adjclose || []

  return timestamps.flatMap((timestamp, index) => {
    const time = finite(timestamp)
    const close = finite(closes[index])
    if (time === null || close === null) return []

    const price = normalisePriceUnit(close, rawCurrency)
    const adjustedClose = finite(adjusted[index])
    const open = finite(opens[index])
    const high = finite(highs[index])
    const low = finite(lows[index])
    const volume = finite(volumes[index])
    const point = {
      date: new Date(time * 1000).toISOString(),
      price,
      adjustedPrice: adjustedClose === null ? price : normalisePriceUnit(adjustedClose, rawCurrency),
    }

    if (open !== null && high !== null && low !== null) {
      Object.assign(point, {
        open: normalisePriceUnit(open, rawCurrency),
        high: normalisePriceUnit(high, rawCurrency),
        low: normalisePriceUnit(low, rawCurrency),
        close: price,
      })
    }
    if (volume !== null) Object.assign(point, { volume })
    return [point]
  })
}

function inferMarketState(meta, asOfSeconds) {
  const now = Math.floor(Date.now() / 1000)
  const regular = meta?.currentTradingPeriod?.regular
  const isOpen = regular && now >= Number(regular.start) && now <= Number(regular.end)
  const ageMinutes = Math.max(0, Math.round((now - asOfSeconds) / 60))
  return { marketState: isOpen ? 'open' : 'closed', ageMinutes }
}

export async function loadQuote(request, fetcher = fetch) {
  const ticker = normaliseTicker(request.symbol, request.market)
  if (!ticker) throw new Error('Missing symbol.')
  const chart = await loadMarketChart(ticker, 'range=5d&interval=1d&events=div%2Csplits&includePrePost=false&includeAdjustedClose=true', fetcher)
  const closes = chart.indicators?.quote?.[0]?.close || []
  const latest = lastFinite(closes)
  const metaPrice = finite(chart.meta?.regularMarketPrice)
  const rawPrice = metaPrice ?? latest?.value
  const rawPrevious = finite(chart.meta?.chartPreviousClose) ?? finite(chart.meta?.previousClose) ?? (latest ? previousFinite(closes, latest.index) : null)
  if (rawPrice === null || rawPrevious === null || rawPrice <= 0 || rawPrevious <= 0) throw new Error(`No valid quote is available for ${ticker}.`)

  const units = normaliseQuoteUnits(rawPrice, rawPrevious, chart.meta?.currency || request.currency)
  const asOfSeconds = finite(chart.meta?.regularMarketTime) ?? finite(chart.timestamp?.[latest?.index ?? -1]) ?? Math.floor(Date.now() / 1000)
  const change = units.price - units.previousClose
  const state = inferMarketState(chart.meta, asOfSeconds)
  return {
    requestId: request.requestId,
    requestedSymbol: cleanSymbol(request.symbol),
    ticker,
    name: chart.meta?.longName || chart.meta?.shortName || cleanSymbol(request.symbol),
    exchange: chart.meta?.fullExchangeName || chart.meta?.exchangeName || request.market || '',
    currency: units.currency,
    price: units.price,
    previousClose: units.previousClose,
    change,
    changePercent: units.previousClose ? change / units.previousClose * 100 : 0,
    asOf: new Date(asOfSeconds * 1000).toISOString(),
    marketState: state.marketState,
    ageMinutes: state.ageMinutes,
    source: 'Just now',
  }
}

export async function loadFxRate(currency, baseCurrency = 'AUD', fetcher = fetch) {
  const from = normaliseCurrency(currency)
  const to = normaliseCurrency(baseCurrency)
  if (!from || from === to) return { currency: from || to, rate: 1, asOf: new Date().toISOString(), source: 'Base currency' }
  const quote = await loadQuote({ requestId: `${from}${to}`, symbol: `${from}${to}=X`, market: 'FX', currency: to }, fetcher)
  return { currency: from, rate: quote.price, asOf: quote.asOf, source: quote.source }
}

export async function mapConcurrent(items, limit, mapper) {
  const results = new Array(items.length)
  let nextIndex = 0
  async function worker() {
    while (nextIndex < items.length) {
      const index = nextIndex
      nextIndex += 1
      results[index] = await mapper(items[index], index)
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker))
  return results
}
