const SEC_TICKERS_URL = 'https://www.sec.gov/files/company_tickers_exchange.json'
const SEC_SUBMISSIONS_URL = 'https://data.sec.gov/submissions'
const SEC_ARCHIVES_URL = 'https://www.sec.gov/Archives/edgar/data'
const CACHE_TTL_MS = 6 * 60 * 60 * 1000
const MAX_RELATIONSHIPS = 24

let catalogCache = null
const networkCache = new Map()

const relationshipSignals = {
  supplier: /\b(supplier|suppliers|vendor|vendors|component|components|foundry|fabricat(?:e|ed|ion)|manufactur(?:e|ed|er|ers|ing))\b/i,
  customer: /\b(customer|customers|client|clients|distributor|distributors|retailer|retailers|reseller|resellers)\b/i,
  competitor: /\b(compete|competes|competing|competition|competitor|competitors)\b/i,
  partner: /\b(partner|partners|partnership|collaborat(?:e|ed|ion)|alliance|joint venture|agreement with|integrat(?:e|ed|ion)|licens(?:e|ed|es|ing)|licensing arrangement)\b/i,
}

const suffixPattern = /\b(incorporated|inc|corporation|corp|company|co|limited|ltd|plc|holdings?|group|sa|se|nv|ag|llc|lp|the)\b/g

function secHeaders() {
  return {
    Accept: 'application/json, text/html;q=0.9, */*;q=0.8',
    'User-Agent': process.env.SEC_USER_AGENT || 'Masterdeck/1.0 contact@masterdeck.app',
  }
}

function sendJson(response, status, body, cache = false) {
  response.statusCode = status
  response.setHeader('Content-Type', 'application/json; charset=utf-8')
  response.setHeader('Cache-Control', cache ? 'public, s-maxage=21600, stale-while-revalidate=86400' : 'no-store')
  response.end(JSON.stringify(body))
}

async function fetchSec(url) {
  const response = await fetch(url, { headers: secHeaders() })
  if (!response.ok) throw new Error(`SEC request failed (${response.status})`)
  return response
}

function normaliseText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function companyAlias(name) {
  const clean = normaliseText(name).replace(suffixPattern, ' ').replace(/\s+/g, ' ').trim()
  return clean.length >= 3 ? clean : normaliseText(name)
}

function companyId(company) {
  return company.ticker ? company.ticker.toLowerCase() : `cik-${company.cik}`
}

function toCompany(company, details = {}) {
  return {
    id: companyId(company),
    name: details.name || company.name,
    ticker: company.ticker,
    country: details.country || 'United States',
    market: company.exchange || 'SEC reporting issuer',
    sector: details.sector || 'Public company',
    description: details.description || `${company.name} is an SEC-reporting public issuer.`,
    cik: String(company.cik).padStart(10, '0'),
  }
}

async function getCatalog() {
  if (catalogCache && Date.now() - catalogCache.fetchedAt < CACHE_TTL_MS) return catalogCache.companies
  const payload = await (await fetchSec(SEC_TICKERS_URL)).json()
  const companies = payload.data.map(([cik, name, ticker, exchange]) => ({ cik, name, ticker, exchange }))
  catalogCache = { fetchedAt: Date.now(), companies }
  return companies
}

function searchCatalog(companies, query) {
  const needle = normaliseText(query)
  if (!needle) return []
  return companies
    .map((company) => {
      const ticker = normaliseText(company.ticker)
      const name = normaliseText(company.name)
      const score = ticker === needle ? 0 : name === needle ? 1 : ticker.startsWith(needle) ? 2 : name.startsWith(needle) ? 3 : name.includes(needle) ? 4 : 99
      return { company, score }
    })
    .filter((entry) => entry.score < 99)
    .sort((a, b) => a.score - b.score || a.company.name.localeCompare(b.company.name))
    .slice(0, 12)
    .map(({ company }) => toCompany(company))
}

function latestAnnualFiling(submissions) {
  const recent = submissions.filings?.recent
  if (!recent) return null
  const accepted = new Set(['10-K', '10-K/A', '20-F', '20-F/A', '40-F', '40-F/A'])
  for (let index = 0; index < recent.form.length; index += 1) {
    if (!accepted.has(recent.form[index])) continue
    const accession = recent.accessionNumber[index]
    const primaryDocument = recent.primaryDocument[index]
    if (!accession || !primaryDocument) continue
    return {
      form: recent.form[index],
      filedAt: recent.filingDate[index],
      accession,
      primaryDocument,
    }
  }
  return null
}

function decodeHtml(value) {
  return value
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&amp;|&#38;/gi, '&')
    .replace(/&quot;|&#34;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, decimal) => String.fromCodePoint(Number(decimal)))
}

function filingChunks(html) {
  const text = decodeHtml(html)
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, '. ')
    .replace(/[\t\r]+/g, ' ')
    .replace(/\s+/g, ' ')
  return text
    .split(/(?<=[.!?;])\s+(?=[A-Z0-9])/)
    .map((chunk) => chunk.trim())
    .filter((chunk) => chunk.length >= 45 && chunk.length <= 1800 && Object.values(relationshipSignals).some((signal) => signal.test(chunk)))
}

function relationType(chunk) {
  for (const [type, signal] of Object.entries(relationshipSignals)) {
    if (signal.test(chunk)) return type
  }
  return null
}

function legalOrganisations(chunk) {
  const pattern = /\b([A-Z][A-Za-z0-9&.'-]*(?:\s+[A-Z][A-Za-z0-9&.'-]*){0,5}\s+(?:Inc\.?|Incorporated|Corporation|Corp\.?|Company|Co\.?|Ltd\.?|Limited|LLC|L\.L\.C\.|plc|PLC|Group|Holdings?))\b/g
  return [...chunk.matchAll(pattern)].map((match) => match[1].replace(/[.,;:]$/, '').trim())
}

function buildAliasIndex(companies, issuer) {
  const index = new Map()
  for (const company of companies) {
    if (company.cik === issuer.cik) continue
    const legalName = normaliseText(company.name)
    const strippedName = companyAlias(company.name)
    const tokens = strippedName.split(' ').filter((token) => token.length >= 3)
    const anchor = tokens.sort((a, b) => b.length - a.length)[0]
    if (!anchor) continue
    const aliases = new Set([legalName])
    if (strippedName.split(' ').length >= 2) aliases.add(strippedName)
    const entry = { company, aliases: [...aliases].filter((value) => value.length >= 5) }
    const bucket = index.get(anchor) || []
    bucket.push(entry)
    index.set(anchor, bucket)
  }
  return index
}

function extractRelationships(html, companies, issuer, filing) {
  const chunks = filingChunks(html)
  const aliasIndex = buildAliasIndex(companies, issuer)
  const matches = new Map()

  for (const chunk of chunks) {
    const type = relationType(chunk)
    if (!type) continue
    const normalisedChunk = ` ${normaliseText(chunk)} `
    const candidateTokens = new Set(normalisedChunk.trim().split(' ').filter((token) => token.length >= 3))
    const candidates = new Map()
    for (const token of candidateTokens) {
      for (const candidate of aliasIndex.get(token) || []) candidates.set(candidate.company.cik, candidate)
    }
    for (const { company, aliases } of candidates.values()) {
      if (!aliases.some((alias) => normalisedChunk.includes(` ${alias} `))) continue
      const key = `${type}:${company.cik}`
      const existing = matches.get(key)
      if (existing) {
        existing.mentions += 1
      } else {
        matches.set(key, { company, type, mentions: 1 })
      }
    }
    for (const organisation of legalOrganisations(chunk)) {
      const normalised = normaliseText(organisation)
      if (!normalised || normalised === normaliseText(issuer.name) || /^(the )?company$/.test(normalised)) continue
      const catalogCompany = companies.find((company) => normaliseText(company.name) === normalised)
      const company = catalogCompany || { cik: `named-${normalised.replace(/\s+/g, '-')}`, name: organisation, ticker: '', exchange: 'Named in filing' }
      const key = `${type}:${company.cik}`
      const existing = matches.get(key)
      if (existing) existing.mentions += 1
      else matches.set(key, { company, type, mentions: 1 })
    }
  }

  return [...matches.values()]
    .sort((a, b) => b.mentions - a.mentions || a.company.name.localeCompare(b.company.name))
    .slice(0, MAX_RELATIONSHIPS)
    .map(({ company, type, mentions }) => ({
      id: `sec-${issuer.ticker.toLowerCase()}-${type}-${companyId(company)}`,
      from: companyId(issuer),
      to: companyId(company),
      type,
      note: `${company.name} is named in ${type} context in ${issuer.name}'s latest ${filing.form} filing.`,
      confidence: mentions > 1 ? 'High' : 'Moderate',
      source: `${filing.form} filed ${filing.filedAt}`,
      sourceKind: 'live-sec',
      sourceUrl: filing.url,
      updated: filing.filedAt,
      relatedCompany: toCompany(company),
    }))
}

function issuerDetails(submissions) {
  const address = submissions.addresses?.business || submissions.addresses?.mailing || {}
  const country = address.countryDescription || address.country || 'United States'
  const sector = submissions.sicDescription || 'Public company'
  return {
    name: submissions.name,
    country,
    sector,
    description: `${submissions.name} · ${sector}. Live relationship context is derived from its latest annual SEC filing.`,
  }
}

async function buildNetwork(ticker, companies) {
  const issuer = companies.find((company) => company.ticker.toUpperCase() === ticker)
  if (!issuer) {
    const error = new Error(`No SEC-reporting issuer was found for ${ticker}.`)
    error.statusCode = 404
    throw error
  }

  const cached = networkCache.get(ticker)
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) return cached.payload

  const cik = String(issuer.cik).padStart(10, '0')
  const submissions = await (await fetchSec(`${SEC_SUBMISSIONS_URL}/CIK${cik}.json`)).json()
  const latest = latestAnnualFiling(submissions)
  if (!latest) {
    const error = new Error(`No recent annual filing is available for ${ticker}.`)
    error.statusCode = 404
    throw error
  }

  const accession = latest.accession.replace(/-/g, '')
  const filingUrl = `${SEC_ARCHIVES_URL}/${Number(issuer.cik)}/${accession}/${latest.primaryDocument}`
  const html = await (await fetchSec(filingUrl)).text()
  const filing = { ...latest, url: filingUrl }
  const extracted = extractRelationships(html, companies, issuer, filing)
  const relatedCompanies = [...new Map(extracted.map((relationship) => [relationship.relatedCompany.id, relationship.relatedCompany])).values()]
  const relationships = extracted.map(({ relatedCompany: _relatedCompany, ...relationship }) => relationship)
  const company = toCompany(issuer, issuerDetails(submissions))
  const payload = {
    company,
    companies: [company, ...relatedCompanies],
    relationships,
    filing,
    coverage: 'live-sec-filing',
    generatedAt: new Date().toISOString(),
  }
  networkCache.set(ticker, { fetchedAt: Date.now(), payload })
  return payload
}

export default async function handler(request, response) {
  if (request.method !== 'GET') return sendJson(response, 405, { error: 'Method not allowed.' })
  try {
    const requestUrl = new URL(request.url, 'http://localhost')
    const query = (requestUrl.searchParams.get('q') || '').trim()
    const ticker = (requestUrl.searchParams.get('ticker') || '').trim().toUpperCase()
    const companies = await getCatalog()

    if (query) return sendJson(response, 200, { companies: searchCatalog(companies, query), coverage: 'sec-issuer-catalog' }, true)
    if (!ticker) return sendJson(response, 400, { error: 'Provide a ticker or search query.' })
    return sendJson(response, 200, await buildNetwork(ticker, companies), true)
  } catch (error) {
    const status = Number(error?.statusCode) || 502
    return sendJson(response, status, { error: error instanceof Error ? error.message : 'Unable to load SEC relationship data.' })
  }
}
