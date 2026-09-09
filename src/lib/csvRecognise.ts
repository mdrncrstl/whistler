import type { CsvSheet, CsvKind } from './csvImport'
import { csvFields } from './csvImport'
import { brokers, type Broker } from './brokers'

/**
 * Work out what a dropped CSV is, so the import does not open with a wall of choices.
 *
 * Three separate questions get answered from the file itself:
 *   1. Is this a list of holdings or a list of trades?  — from which headers are present
 *   2. Which column is which field?                     — from header synonyms
 *   3. Which market and currency?                       — from the data, then the filename
 *
 * Everything returned is a proposal. The confirm screen shows what was matched and lets
 * any part be overridden, because a wrong guess that cannot be corrected is worse than a
 * question.
 */

const normalise = (header: string) => header.toLowerCase().replace(/[^a-z0-9]+/g, '')

/** Header spellings seen across broker exports, best match first. */
const synonyms: Record<string, string[]> = {
  symbol: ['symbol', 'ticker', 'code', 'asxcode', 'securitycode', 'instrument', 'stock', 'asxsymbol', 'security'],
  quantity: ['quantity', 'units', 'shares', 'qty', 'volume', 'unitsheld', 'sharesheld', 'noofshares'],
  average_cost: ['averagecost', 'avgcost', 'averageprice', 'avgprice', 'averagebuyprice', 'costbase', 'unitcost', 'costperunit'],
  current_price: ['currentprice', 'lastprice', 'marketprice', 'price', 'closeprice', 'lasttradedprice', 'marketvalueperunit'],
  transaction_id: ['transactionid', 'tradeid', 'confirmationnumber', 'contractnote', 'reference', 'orderid', 'id', 'tradenumber', 'confirmationno'],
  date: ['date', 'tradedate', 'transactiondate', 'settlementdate', 'executiondate', 'dateexecuted'],
  type: ['type', 'transactiontype', 'tradetype', 'side', 'buysell', 'action', 'ordertype', 'direction'],
  price: ['price', 'unitprice', 'tradeprice', 'priceperunit', 'executionprice', 'averageprice'],
  fees: ['fees', 'brokerage', 'commission', 'fee', 'cost', 'charges', 'brokeragefee', 'totalfees'],
  fx_rate: ['fxrate', 'exchangerate', 'rate', 'fx', 'conversionrate'],
}

/** Columns that only ever appear in a trade ledger. */
const tradeSignals = ['tradedate', 'transactiondate', 'transactiontype', 'tradetype', 'buysell', 'side', 'brokerage', 'commission', 'contractnote', 'tradeid', 'confirmationnumber']
/** Columns that only ever appear in a positions snapshot. */
const holdingSignals = ['averagecost', 'avgcost', 'averagebuyprice', 'costbase', 'unitsheld', 'sharesheld', 'marketvalue', 'currentprice', 'lastprice']

export interface Recognition {
  kind: CsvKind
  mapping: Record<string, string>
  matched: string[]
  missing: string[]
  market: string
  currency: string
  broker: Broker | null
  /** How the broker was identified, for the wording on the confirm screen. */
  brokerSource: 'filename' | 'headers' | null
  confident: boolean
}

function matchColumn(headers: string[], field: string, taken: Set<number>) {
  const wanted = synonyms[field] || [field]
  const normalised = headers.map(normalise)
  for (const candidate of wanted) {
    const exact = normalised.findIndex((header, index) => header === candidate && !taken.has(index))
    if (exact >= 0) return exact
  }
  for (const candidate of wanted) {
    const partial = normalised.findIndex((header, index) => header.includes(candidate) && !taken.has(index))
    if (partial >= 0) return partial
  }
  return -1
}

function detectKind(headers: string[]): CsvKind {
  const normalised = headers.map(normalise)
  const trades = tradeSignals.filter(signal => normalised.some(header => header.includes(signal))).length
  const holdings = holdingSignals.filter(signal => normalised.some(header => header.includes(signal))).length
  return trades > holdings ? 'transactions' : 'holdings'
}

/** ASX tickers arrive as CBA.AX, ASX:CBA or bare three-letter codes; US ones do not. */
function detectMarket(sheet: CsvSheet, symbolIndex: number, fallback: string) {
  if (symbolIndex < 0) return fallback
  const sample = sheet.rows.slice(0, 40).map(row => String(row[symbolIndex] ?? '').toUpperCase())
  if (sample.some(value => /\.AX$|^ASX[:.]/.test(value))) return 'ASX'
  if (sample.some(value => /\.NZ$|^NZX[:.]/.test(value))) return 'NZX'
  if (sample.some(value => /\.L$|^LSE[:.]/.test(value))) return 'LSE'
  return fallback
}

/** A currency column beats a guess; otherwise fall back to the broker or market default. */
function detectCurrency(sheet: CsvSheet, headers: string[], fallback: string) {
  const index = headers.map(normalise).findIndex(header => header === 'currency' || header === 'ccy' || header === 'currencycode')
  if (index < 0) return fallback
  const values = sheet.rows.slice(0, 40).map(row => String(row[index] ?? '').trim().toUpperCase()).filter(value => /^[A-Z]{3}$/.test(value))
  return values[0] || fallback
}

/**
 * Exports are almost always named after the broker that produced them. This is a hint,
 * shown as one, never a claim that the file was parsed as a known format.
 */
function detectBrokerFromFilename(filename: string): Broker | null {
  const haystack = filename.toLowerCase().replace(/[^a-z0-9]+/g, '')
  if (!haystack) return null
  const candidates = brokers
    .filter(broker => broker.id !== 'other')
    .map(broker => ({ broker, key: broker.name.toLowerCase().replace(/[^a-z0-9]+/g, '') }))
    .filter(({ key }) => key.length >= 4 && haystack.includes(key))
    // Prefer the most specific name, so "stakeus" wins over "stake".
    .sort((a, b) => b.key.length - a.key.length)
  return candidates[0]?.broker || null
}

export function recogniseCsv(sheet: CsvSheet, filename: string): Recognition {
  const kind = detectKind(sheet.headers)
  const broker = detectBrokerFromFilename(filename)

  const taken = new Set<number>()
  const mapping: Record<string, string> = {}
  const matched: string[] = []
  const missing: string[] = []
  for (const field of [...csvFields[kind], 'fx_rate']) {
    const index = matchColumn(sheet.headers, field, taken)
    if (index >= 0) {
      taken.add(index)
      mapping[field] = String(index)
      if (field !== 'fx_rate') matched.push(field)
    } else {
      mapping[field] = ''
      if (field !== 'fx_rate') missing.push(field)
    }
  }

  const market = detectMarket(sheet, Number(mapping.symbol || -1), broker?.market || 'ASX')
  const currency = detectCurrency(sheet, sheet.headers, broker?.currency || (market === 'ASX' ? 'AUD' : 'USD'))

  return {
    kind,
    mapping,
    matched,
    missing,
    market,
    currency,
    broker,
    brokerSource: broker ? 'filename' : null,
    confident: missing.length === 0,
  }
}
