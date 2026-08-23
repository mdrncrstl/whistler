import Papa from 'papaparse'
import type { SuperheroReport, SuperheroTransactionInput } from '../types'

const cleanHeader = (value: unknown) => String(value ?? '')
  .trim()
  .toLowerCase()
  .replace(/[()]/g, '')
  .replace(/[\s/.-]+/g, '_')
  .replace(/[^a-z0-9_]/g, '')

const numeric = (value: unknown) => {
  const text = String(value ?? '').trim().replaceAll(',', '').replace(/[A-Z$]/gi, '').replace(/^\((.*)\)$/, '-$1')
  const result = Number(text)
  return Number.isFinite(result) ? result : 0
}

const text = (row: Record<string, string>, names: string[]) => {
  for (const name of names) if (row[name] != null && String(row[name]).trim()) return String(row[name]).trim()
  return ''
}

const value = (row: Record<string, string>, names: string[]) => numeric(text(row, names))

const hash = (...parts: unknown[]) => {
  const input = parts.map((part) => String(part ?? '')).join('|')
  let output = 2166136261
  for (let index = 0; index < input.length; index += 1) output = Math.imul(output ^ input.charCodeAt(index), 16777619)
  return (output >>> 0).toString(16).padStart(8, '0')
}

const transactionType = (input: string) => {
  const type = input.toUpperCase()
  if (type.includes('BUY')) return 'BUY'
  if (type.includes('SELL')) return 'SELL'
  if (type.includes('DIV') || type.includes('DISTRIBUTION')) return 'DIVIDEND'
  if (type.includes('INTEREST')) return 'INTEREST'
  if (type.includes('DEPOSIT')) return 'DEPOSIT'
  if (type.includes('WITHDRAW')) return 'WITHDRAWAL'
  if (type.includes('FEE') || type.includes('BROKERAGE')) return 'FEE'
  return type ? 'OTHER' : ''
}

function modeFor(headers: string[]) {
  const set = new Set(headers)
  if ([...set].some((item) => ['transaction_date', 'trade_date', 'date'].includes(item)) && [...set].some((item) => ['transaction_type', 'type', 'activity'].includes(item))) return 'transactions'
  if ([...set].some((item) => ['symbol', 'ticker', 'code', 'security_code'].includes(item)) && [...set].some((item) => ['quantity', 'units', 'shares'].includes(item))) return 'holdings'
  if (set.has('currency') && [...set].some((item) => ['balance', 'cash_balance', 'available_cash'].includes(item))) return 'cash'
  return null
}

function record(headers: string[], cells: string[]) {
  return Object.fromEntries(headers.map((header, index) => [header, cells[index] ?? '']))
}

export function parseSuperheroCsv(csv: string, filename = 'superhero-report.csv'): SuperheroReport {
  const parsed = Papa.parse<string[]>(csv, { skipEmptyLines: 'greedy' })
  const rows = (parsed.data || []).filter((row) => row.some((cell) => String(cell).trim()))
  const report: SuperheroReport = { filename, holdings: [], transactions: [], cash: [], warnings: [] }
  let headers: string[] = []
  let mode: ReturnType<typeof modeFor> = null

  rows.forEach((cells, rowIndex) => {
    if (cells.filter((cell) => String(cell).trim()).length === 1) {
      headers = []
      mode = null
      return
    }
    const candidate = cells.map(cleanHeader)
    const candidateMode = modeFor(candidate)
    if (candidateMode) {
      headers = candidate
      mode = candidateMode
      return
    }
    if (!mode || !headers.length) return
    const row = record(headers, cells)
    if (mode === 'holdings') {
      const symbol = text(row, ['symbol', 'ticker', 'code', 'security_code']).toUpperCase()
      const quantity = value(row, ['quantity', 'units', 'shares'])
      const currentPrice = value(row, ['current_price', 'last_price', 'price', 'market_price'])
      const currentValue = value(row, ['market_value', 'current_value', 'value', 'total_value'])
      if (!symbol || !quantity) return
      report.holdings.push({
        account_name: text(row, ['account_name', 'account']) || 'Superhero',
        symbol,
        name: text(row, ['security_name', 'name', 'description']) || symbol,
        market: text(row, ['market', 'exchange']) || 'ASX',
        currency: text(row, ['currency']) || 'AUD',
        asset_class: text(row, ['asset_class', 'asset_type']) || 'AU shares',
        sector: text(row, ['sector']) || undefined,
        quantity,
        average_cost: value(row, ['average_cost', 'avg_cost', 'cost_price']),
        current_price: currentPrice,
        value: currentValue || quantity * currentPrice,
        cost: value(row, ['cost_base', 'cost_basis', 'total_cost']),
        fx_rate: value(row, ['fx_rate']) || 1,
        raw: row,
      })
      return
    }
    if (mode === 'cash') {
      const currency = text(row, ['currency']).toUpperCase() || 'AUD'
      const balance = value(row, ['balance', 'cash_balance', 'available_cash'])
      if (!balance && !currency) return
      report.cash.push({ account_name: text(row, ['account_name', 'account']) || 'Superhero', currency, balance, fx_rate: value(row, ['fx_rate']) || 1 })
      return
    }
    const date = text(row, ['transaction_date', 'trade_date', 'date'])
    const rawType = text(row, ['transaction_type', 'type', 'activity'])
    const type = transactionType(rawType)
    if (!date || !type) return
    const symbol = text(row, ['symbol', 'ticker', 'code', 'security_code']).toUpperCase()
    const quantity = Math.abs(value(row, ['quantity', 'units', 'shares']))
    const price = Math.abs(value(row, ['price', 'trade_price', 'unit_price']))
    const suppliedAmount = value(row, ['amount', 'net_amount', 'total', 'value'])
    const amount = suppliedAmount || quantity * price * (type === 'BUY' ? -1 : 1)
    report.transactions.push({
      provider_external_id: text(row, ['transaction_id', 'trade_id', 'reference']) || `csv-${hash(filename, rowIndex, date, type, symbol, quantity, amount)}`,
      account_name: text(row, ['account_name', 'account']) || 'Superhero',
      date,
      type,
      symbol,
      description: text(row, ['description', 'details']) || `${type} ${symbol}`.trim(),
      quantity,
      price,
      currency: text(row, ['currency']) || 'AUD',
      amount,
      fees: Math.abs(value(row, ['brokerage', 'fees', 'commission'])),
      fx_rate: value(row, ['fx_rate']) || 1,
      raw: row,
    })
  })

  if (!report.holdings.length && !report.transactions.length && !report.cash.length) {
    report.warnings.push('No supported Superhero holdings, transaction or cash table was found.')
  }
  if (parsed.errors.length) report.warnings.push(...parsed.errors.slice(0, 5).map((error) => `CSV row ${error.row ?? '?'}: ${error.message}`))
  report.transactions = [...new Map(report.transactions.map((item) => [item.provider_external_id, item])).values()]
  return report
}

function firstMatch(input: string, patterns: RegExp[]) {
  for (const pattern of patterns) {
    const match = input.match(pattern)
    if (match?.[1]) return match[1].trim()
  }
  return ''
}

export function parseContractNoteText(input: string, filename = 'contract-note.pdf'): SuperheroReport {
  const clean = input.replace(/\s+/g, ' ').trim()
  const rawType = firstMatch(clean, [/\b(BUY|SELL)\b/i, /transaction\s+type\s*:?\s*(buy|sell)/i])
  const type = transactionType(rawType)
  const symbol = firstMatch(clean, [/(?:ASX\s*code|security\s*code|symbol)\s*:?\s*([A-Z0-9.]{2,12})/i]).toUpperCase()
  const quantity = numeric(firstMatch(clean, [/(?:quantity|units|shares)\s*:?\s*([\d,]+(?:\.\d+)?)/i]))
  const price = numeric(firstMatch(clean, [/(?:price|price\s+per\s+unit)\s*:?\s*(?:A\$|\$)?\s*([\d,]+(?:\.\d+)?)/i]))
  const total = numeric(firstMatch(clean, [/(?:net\s+consideration|settlement\s+amount|total)\s*:?\s*(?:A\$|\$)?\s*([\d,]+(?:\.\d+)?)/i]))
  const fees = numeric(firstMatch(clean, [/(?:brokerage|commission|fees?)\s*:?\s*(?:A\$|\$)?\s*([\d,]+(?:\.\d+)?)/i]))
  const tradeDate = firstMatch(clean, [/(?:trade\s+date|transaction\s+date|date)\s*:?\s*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})/i])
  const transaction: SuperheroTransactionInput | null = type && symbol && quantity && tradeDate ? {
    provider_external_id: `pdf-${hash(filename, tradeDate, type, symbol, quantity, total)}`,
    account_name: 'Superhero',
    date: tradeDate,
    type,
    symbol,
    description: `${type === 'BUY' ? 'Bought' : 'Sold'} ${symbol} via Superhero`,
    quantity,
    price,
    currency: 'AUD',
    amount: (total || quantity * price) * (type === 'BUY' ? -1 : 1),
    fees,
    fx_rate: 1,
    raw: { source: 'contract_note_pdf', filename },
  } : null
  return {
    filename,
    holdings: [],
    cash: [],
    transactions: transaction ? [transaction] : [],
    warnings: transaction ? [] : ['The PDF text did not contain a supported Superhero BUY or SELL contract note.'],
  }
}

export async function parseSuperheroFile(file: File): Promise<SuperheroReport> {
  if (file.size > 15 * 1024 * 1024) throw new Error('Choose a report smaller than 15 MB.')
  if (file.name.toLowerCase().endsWith('.csv') || file.type.includes('csv')) return parseSuperheroCsv(await file.text(), file.name)
  if (file.name.toLowerCase().endsWith('.pdf') || file.type === 'application/pdf') {
    const pdfjs = await import('pdfjs-dist')
    const workerUrl = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default
    pdfjs.GlobalWorkerOptions.workerSrc = workerUrl
    const document = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise
    const pages: string[] = []
    for (let pageNumber = 1; pageNumber <= Math.min(document.numPages, 25); pageNumber += 1) {
      const page = await document.getPage(pageNumber)
      const content = await page.getTextContent()
      pages.push(content.items.map((item) => 'str' in item ? item.str : '').join(' '))
    }
    return parseContractNoteText(pages.join('\n'), file.name)
  }
  throw new Error('MASTERDECK accepts Superhero CSV reports and contract-note PDFs.')
}
