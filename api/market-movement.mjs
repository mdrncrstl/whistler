import { loadMarketChart, normaliseCurrency, normalisePriceUnit, normaliseTicker } from './_market-data.mjs'

const CACHE_TTL_MS = 15 * 60 * 1000
const NEWS_TIMEOUT_MS = 2_500
const NEWS_MAX_CHARS = 750_000
const NO_VERIFIED_CATALYST = 'No verified company-specific catalyst was supplied by the market data feed.'
const movementCache = new Map()

function sendJson(response, status, body, cache = false) {
  response.statusCode = status
  response.setHeader('Content-Type', 'application/json; charset=utf-8')
  response.setHeader('Cache-Control', cache ? 'public, s-maxage=900, stale-while-revalidate=10800' : 'no-store')
  response.end(JSON.stringify(body))
}

function finite(value) {
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

function directionFor(changePercent) {
  if (Math.abs(changePercent) < 0.05) return 'flat'
  return changePercent > 0 ? 'up' : 'down'
}

function marketDescription({ currency, price, changePercent, direction }) {
  const close = `${currency} ${price.toFixed(2)}`
  if (direction === 'flat') return `Closed at ${close}, broadly flat against the prior session.`
  const verb = direction === 'up' ? 'rose' : 'fell'
  return `Closed at ${close}, ${verb} ${Math.abs(changePercent).toFixed(2)}% against the prior session.`
}

function decodeXml(value) {
  return String(value || '')
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&#x([\da-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&ndash;/g, '–')
    .replace(/&mdash;/g, '—')
    .replace(/&rsquo;/g, '’')
    .replace(/&lsquo;/g, '‘')
    .replace(/&ldquo;/g, '“')
    .replace(/&rdquo;/g, '”')
    .replace(/&hellip;/g, '…')
}

function stripMarkup(value) {
  return decodeXml(value)
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function xmlTag(block, tag) {
  const match = String(block || '').match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, 'i'))
  return match ? match[1] : ''
}

function directNewsUrl(value) {
  const candidate = decodeXml(stripMarkup(value)).trim()
  if (!/^https?:\/\//i.test(candidate)) return ''
  try {
    const url = new URL(candidate)
    if (url.hostname === 'www.bing.com' && url.pathname.toLowerCase().includes('/news/apiclick.aspx')) {
      const target = url.searchParams.get('url')
      if (target && /^https?:\/\//i.test(target)) return target
    }
  } catch { /* keep the original URL when the feed provides a usable link */ }
  return candidate
}

function sourceLabel(value, url) {
  const label = stripMarkup(value)
  if (label) return label.slice(0, 80)
  try { return new URL(url).hostname.replace(/^www\./i, '').split('.')[0] || 'Source' }
  catch { return 'Source' }
}

export function parseNewsFeed(xml) {
  return [...String(xml || '').matchAll(/<item\b[^>]*>([\s\S]*?)<\/item>/gi)].flatMap((match) => {
    const block = match[1]
    const title = stripMarkup(xmlTag(block, 'title'))
    const url = directNewsUrl(xmlTag(block, 'link'))
    const published = new Date(stripMarkup(xmlTag(block, 'pubDate')))
    if (!title || !url || Number.isNaN(published.getTime())) return []
    const description = stripMarkup(xmlTag(block, 'description')).slice(0, 420)
    return [{
      date: published.toISOString().slice(0, 10),
      title: title.slice(0, 140),
      description,
      url,
      source: sourceLabel(xmlTag(block, 'source'), url),
      publishedAt: published.toISOString(),
    }]
  })
}

function calendarDate(value) {
  const [year, month, day] = String(value || '').slice(0, 10).split('-').map(Number)
  if (![year, month, day].every(Number.isFinite)) return null
  return Date.UTC(year, month - 1, day)
}

function sessionDistance(first, second) {
  const firstDate = calendarDate(first)
  const secondDate = calendarDate(second)
  if (firstDate === null || secondDate === null) return Infinity
  return Math.abs(firstDate - secondDate) / 86_400_000
}

function cleanNewsText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim()
}

export function matchNewsToSessions(articles, sessions) {
  const usedUrls = new Set()
  const orderedSessions = [...sessions].sort((first, second) => {
    const firstHasExact = articles.some((article) => article.date === first.date)
    const secondHasExact = articles.some((article) => article.date === second.date)
    return Number(secondHasExact) - Number(firstHasExact)
  })
  const matches = new Map()
  orderedSessions.forEach((session) => {
    const candidates = articles
      .map((article) => ({ article, distance: sessionDistance(article.date, session.date) }))
      .filter(({ article, distance }) => distance <= 2 && article.date <= session.date && !usedUrls.has(article.url))
      .sort((first, second) => first.distance - second.distance || second.article.publishedAt.localeCompare(first.article.publishedAt))
    if (!candidates.length) return
    const primary = candidates[0].article
    usedUrls.add(primary.url)
    const context = cleanNewsText(primary.description).toLowerCase() === cleanNewsText(primary.title).toLowerCase()
      ? ''
      : cleanNewsText(primary.description).slice(0, 640)
    matches.set(session.date, {
      date: session.date,
      headline: primary.title,
      description: context,
      sources: [{ title: primary.source, url: primary.url }],
    })
  })
  return sessions.flatMap((session) => matches.has(session.date) ? [matches.get(session.date)] : [])
}

function feedUrls({ ticker, name }) {
  const cleanTicker = ticker.replace(/\.[A-Z]{1,4}$/, '')
  const query = encodeURIComponent(`${name} ${cleanTicker} stock`)
  return [
    `https://feeds.finance.yahoo.com/rss/2.0/headline?s=${encodeURIComponent(ticker)}&region=US&lang=en-US`,
    `https://www.bing.com/news/search?q=${query}&format=rss`,
    `https://news.google.com/rss/search?q=${query}&hl=en-US&gl=US&ceid=US:en`,
  ]
}

async function loadNewsArticles({ ticker, name }) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), NEWS_TIMEOUT_MS)
  try {
    const responses = await Promise.allSettled(feedUrls({ ticker, name }).map(async (url) => {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: { Accept: 'application/rss+xml, application/xml, text/xml;q=0.9', 'User-Agent': 'Masterdeck/1.0' },
      })
      if (!response.ok) throw new Error(`news feed upstream ${response.status}`)
      return parseNewsFeed((await response.text()).slice(0, NEWS_MAX_CHARS))
    }))
    const byTitle = new Map()
    responses.flatMap((result) => result.status === 'fulfilled' ? result.value : []).forEach((article) => {
      const key = article.title.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
      const existing = byTitle.get(key)
      if (!existing || article.description.length > existing.description.length) byTitle.set(key, article)
    })
    return [...byTitle.values()]
  } catch { return [] }
  finally { clearTimeout(timeout) }
}

export function relevantCompanyNews(articles, ticker, name) {
  const symbol = ticker.replace(/\.[A-Z]{1,4}$/, '').toLowerCase()
  const words = String(name || '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(Boolean)
  const company = words.find(word => word.length > 2 && !['the', 'inc', 'corp', 'corporation', 'ltd'].includes(word)) || ''
  const isBroadFundName = /vanguard|ishares|spdr|invesco|fidelity/.test(company)
  const aliases = /^(goog|googl)$/.test(symbol) ? ['google', 'alphabet'] : [company]
  return articles.filter(article => {
    const title = article.title.toLowerCase()
    const tokens = title.replace(/[^a-z0-9]+/g, ' ').split(' ')
    const matches = tokens.includes(symbol) || (!isBroadFundName && aliases.some(alias => alias.length > 2 && tokens.includes(alias)))
    return matches && !/holding history|logs new insider|stock analysis.*(?:buy,? hold|current price action)|\([a-z0-9]{10,}\)/i.test(title)
  })
}

async function loadNewsNarratives({ ticker, name, items }) {
  if (!items.length) return []
  return matchNewsToSessions(relevantCompanyNews(await loadNewsArticles({ ticker, name }), ticker, name), items)
}

export function buildDailyMovement(chart, requestedSymbol, market = '') {
  const ticker = normaliseTicker(requestedSymbol, market)
  const rawCurrency = chart?.meta?.currency || ''
  const currency = normaliseCurrency(rawCurrency)
  const closes = chart?.indicators?.quote?.[0]?.close || []
  const daily = (chart?.timestamp || []).flatMap((timestamp, index) => {
    const price = finite(closes[index])
    if (price === null || price <= 0) return []
    return [{ date: new Date(Number(timestamp) * 1000).toISOString(), price: normalisePriceUnit(price, rawCurrency) }]
  })
  const sessions = daily.slice(-15)
  const items = sessions.slice(1).map((point, index) => {
    const previous = sessions[index]
    const change = point.price - previous.price
    const changePercent = previous.price ? change / previous.price * 100 : 0
    const direction = directionFor(changePercent)
    return {
      date: point.date.slice(0, 10),
      price: point.price,
      previousPrice: previous.price,
      change,
      changePercent,
      direction,
      headline: direction === 'flat' ? 'Quiet session' : direction === 'up' ? 'Higher close' : 'Lower close',
      description: marketDescription({ currency, price: point.price, changePercent, direction }),
      context: NO_VERIFIED_CATALYST,
      sources: [],
    }
  })
  return {
    symbol: ticker,
    name: chart?.meta?.longName || chart?.meta?.shortName || requestedSymbol,
    currency,
    exchange: chart?.meta?.fullExchangeName || chart?.meta?.exchangeName || market || '',
    generatedAt: new Date().toISOString(),
    items,
  }
}

async function loadMovement(symbol, market) {
  const ticker = normaliseTicker(symbol, market)
  if (!ticker) throw Object.assign(new Error('Provide a market symbol.'), { statusCode: 400 })
  const cached = movementCache.get(ticker)
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) return cached.payload
  const period2 = Math.floor(Date.now() / 1000)
  const period1 = period2 - 45 * 24 * 60 * 60
  const chart = await loadMarketChart(ticker, `period1=${period1}&period2=${period2}&interval=1d&events=div%2Csplits&includePrePost=false&includeAdjustedClose=true`)
  const base = buildDailyMovement(chart, symbol, market)
  const narratives = await loadNewsNarratives({ ticker: base.symbol, name: base.name, items: base.items })
  const byDate = new Map(narratives.map((item) => [item.date, item]))
  const items = base.items.map((item) => {
    const narrative = byDate.get(item.date)
    return narrative ? { ...item, headline: narrative.headline, context: narrative.description, sources: narrative.sources } : item
  })
  const hasNews = narratives.length > 0
  const payload = {
    ...base,
    provider: hasNews ? 'news' : 'market-data',
    source: 'Just now',
    sourceNote: hasNews ? 'Dated market context appears when a public report matches the session.' : 'Prices refreshed just now. Context appears only when it can be verified.',
    items,
  }
  movementCache.set(ticker, { fetchedAt: Date.now(), payload })
  return payload
}

export default async function handler(request, response) {
  if (request.method !== 'GET') return sendJson(response, 405, { error: 'Method not allowed.' })
  try {
    const requestUrl = new URL(request.url, 'http://localhost')
    const symbol = requestUrl.searchParams.get('symbol') || ''
    const market = requestUrl.searchParams.get('market') || ''
    return sendJson(response, 200, await loadMovement(symbol, market), true)
  } catch (error) {
    return sendJson(response, Number(error?.statusCode) || 502, { error: error instanceof Error ? error.message : 'Unable to load daily market movement.' })
  }
}
