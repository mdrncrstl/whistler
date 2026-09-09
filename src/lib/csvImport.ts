import Papa from 'papaparse'
import { parseSuperheroCsv } from './superhero'

export const csvFields = {
  holdings: ['symbol', 'quantity', 'average_cost', 'current_price'],
  transactions: ['transaction_id', 'date', 'type', 'symbol', 'quantity', 'price', 'fees'],
} as const
export type CsvKind = keyof typeof csvFields
export type CsvSheet = { headers: string[]; rows: string[][] }
export function readCsvSheet(csv: string): CsvSheet {
  const result = Papa.parse<string[]>(csv, { skipEmptyLines: 'greedy' })
  if (result.errors.length) throw new Error('This CSV could not be read. Export it again using comma-separated values.')
  const [headers, ...rows] = result.data
  if (!headers?.length || !rows.length) throw new Error('Include a header row and at least one investment row.')
  if (rows.length > 10000) throw new Error('Import up to 10,000 rows at a time.')
  return { headers: headers.map(x => x.trim()), rows }
}
export function mapCsvReport(sheet: CsvSheet, kind: CsvKind, mapping: Record<string, string>, account: string, currency: string, market: string, filename: string) {
  if (!account.trim()) throw new Error('Name the account these records belong to.')
  if (!market.trim()) throw new Error('Enter the exchange these records belong to.')
  if (!/^[A-Z]{3}$/.test(currency)) throw new Error('Choose a three-letter currency code.')
  const fields: readonly string[] = currency === 'AUD' ? csvFields[kind] : [...csvFields[kind], 'fx_rate']
  if (fields.some(f => mapping[f] === undefined || mapping[f] === '')) throw new Error('Match every required column.')
  if (new Set(fields.map(f => mapping[f])).size !== fields.length) throw new Error('Use a different column for each field.')
  const ids = new Set<string>()
  const rows = sheet.rows.map((row, index) => {
    const mapped = Object.fromEntries(fields.map(f => [f, String(row[Number(mapping[f])] ?? '').trim()]))
    const fail = (message: string): never => { throw new Error(`Row ${index + 2}: ${message}`) }
    if (!mapped.symbol) fail('a ticker is required.')
    mapped.symbol = mapped.symbol.toUpperCase()
    if (kind === 'holdings') {
      if (ids.has(mapped.symbol)) fail('combine each ticker into one opening holding per account.')
      ids.add(mapped.symbol)
    }
    for (const f of [...(kind === 'holdings' ? ['quantity', 'average_cost', 'current_price'] : ['quantity', 'price', 'fees']), ...(currency === 'AUD' ? [] : ['fx_rate'])]) {
      const input = mapped[f].replace(/[$£€\s]/g, '')
      if (!/^(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d+)?$/.test(input)) fail(`${f.replaceAll('_', ' ')} must use a decimal point, with optional thousands commas.`)
      const cleaned = input.replaceAll(',', '')
      if (!cleaned || !Number.isFinite(Number(cleaned)) || Number(cleaned) < 0 || (['quantity', 'fx_rate'].includes(f) && Number(cleaned) === 0)) fail(`${f.replaceAll('_', ' ')} must be a valid ${f === 'quantity' ? 'positive' : 'non-negative'} number.`)
      mapped[f] = cleaned
    }
    if (kind === 'transactions') {
      if (!mapped.transaction_id || ids.has(mapped.transaction_id)) fail('use a unique broker transaction ID for each trade.')
      ids.add(mapped.transaction_id)
      mapped.transaction_id = `csv:${encodeURIComponent(account.trim())}:${mapped.transaction_id}`
      mapped.type = mapped.type.toUpperCase()
      if (!['BUY', 'SELL'].includes(mapped.type)) fail('this trade import accepts BUY and SELL rows. Separate other activity before uploading.')
      if (!/^\d{4}-\d{2}-\d{2}$/.test(mapped.date) || !Number.isFinite(Date.parse(mapped.date)) || new Date(mapped.date).toISOString().slice(0, 10) !== mapped.date) fail('use a valid YYYY-MM-DD trade date.')
    }
    return { ...mapped, account_name: account.trim(), currency, market }
  })
  const report = parseSuperheroCsv(Papa.unparse(rows), filename)
  if (kind === 'holdings') report.warnings.push('Opening balances provide a current portfolio view. Import your complete trade history for historical performance and tax calculations.')

  return report
}
