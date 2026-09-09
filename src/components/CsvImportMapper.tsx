import { useMemo, useState } from 'react'
import { Check, ChevronDown, FileSpreadsheet, Sparkles } from 'lucide-react'
import { csvFields, mapCsvReport, type CsvKind, type CsvSheet } from '../lib/csvImport'
import { recogniseCsv } from '../lib/csvRecognise'
import type { SuperheroReport } from '../types'
import { Button, Modal } from './ui'

const label = (field: string) => field.replaceAll('_', ' ')

export function CsvImportMapper({ sheet, filename, source, defaultCurrency, defaultMarket, onClose, onReview }: {
  sheet: CsvSheet
  filename: string
  source: string
  defaultCurrency?: string
  defaultMarket?: string
  onClose: () => void
  onReview: (report: SuperheroReport) => void
}) {
  // Everything below opens pre-filled from the file. The column grid is collapsed unless
  // recognition came up short, so a normal export is one confirmation rather than a form.
  const recognised = useMemo(() => recogniseCsv(sheet, filename), [sheet, filename])
  const [kind, setKind] = useState<CsvKind>(recognised.kind)
  const [account, setAccount] = useState(source && source !== 'CSV' ? source : recognised.broker?.name || '')
  const [currency, setCurrency] = useState(defaultCurrency || recognised.currency)
  const [market, setMarket] = useState(defaultMarket || recognised.market)
  const [mapping, setMapping] = useState<Record<string, string>>(recognised.mapping)
  const [showColumns, setShowColumns] = useState(!recognised.confident)
  const [error, setError] = useState('')

  const required = [...csvFields[kind], ...(currency === 'AUD' ? [] : ['fx_rate'])]
  const unmatched = required.filter(field => !mapping[field])

  return (
    <Modal
      open
      title={recognised.confident ? 'Check what we found' : 'Match the remaining columns'}
      description={`${filename} · ${sheet.rows.length} rows. Your file stays in your browser until you confirm the import.`}
      onClose={onClose}
    >
      <div className="csv-recognised" role="status">
        <span className="csv-recognised-icon">{recognised.confident ? <Sparkles size={17} /> : <FileSpreadsheet size={17} />}</span>
        <div>
          <strong>
            {recognised.broker
              ? `Looks like a ${recognised.broker.name} ${kind === 'transactions' ? 'trade export' : 'holdings export'}`
              : `Read as ${kind === 'transactions' ? 'buy and sell trades' : 'opening holdings'}`}
          </strong>
          <p>
            {recognised.matched.length} of {csvFields[kind].length} columns matched automatically
            {` · ${market} · ${currency}`}
            {recognised.broker ? ' · matched on the file name, change anything below' : ''}
          </p>
        </div>
      </div>

      <div className="csv-mapping-grid csv-mapping-basics">
        <label>Import type
          <select value={kind} onChange={event => { setKind(event.target.value as CsvKind); setError('') }}>
            <option value="holdings">Opening holdings</option>
            <option value="transactions">Buy / sell trades</option>
          </select>
        </label>
        <label>Account name<input value={account} placeholder="e.g. My Stake account" onChange={event => setAccount(event.target.value)} /></label>
        <label>Currency
          <select value={currency} onChange={event => setCurrency(event.target.value)}>
            {['AUD', 'USD', 'NZD', 'GBP', 'EUR', 'CAD', 'HKD', 'JPY', 'SGD', 'CHF'].map(code => <option key={code}>{code}</option>)}
          </select>
        </label>
        <label>Exchange<input value={market} onChange={event => setMarket(event.target.value.toUpperCase())} /></label>
      </div>

      <button type="button" className={`csv-columns-toggle ${showColumns ? 'is-open' : ''}`} aria-expanded={showColumns} onClick={() => setShowColumns(!showColumns)}>
        <span>{unmatched.length ? `${unmatched.length} column${unmatched.length === 1 ? '' : 's'} still to match` : 'All columns matched'}</span>
        {!unmatched.length && <Check size={15} className="csv-columns-tick" />}
        <ChevronDown size={16} aria-hidden="true" />
      </button>

      {showColumns && (
        <div className="csv-mapping-grid">
          {required.map(field => (
            <label key={field} className={mapping[field] ? '' : 'is-unmatched'}>
              {label(field)}
              <select value={mapping[field] || ''} onChange={event => setMapping({ ...mapping, [field]: event.target.value })}>
                <option value="">Choose a column</option>
                {sheet.headers.map((header, index) => <option key={index} value={index}>{header} — {sheet.rows[0]?.[index]}</option>)}
              </select>
            </label>
          ))}
        </div>
      )}

      <p>Use one currency and exchange per file. For foreign currency, match the AUD conversion rate for each row. Opening holdings do not reconstruct past trades. Trade imports require ISO dates (YYYY-MM-DD) and unique transaction IDs.</p>
      {error && <p role="alert" className="connection-error">{error}</p>}
      <div className="csv-help-actions">
        <Button variant="primary" onClick={() => {
          try { onReview(mapCsvReport(sheet, kind, mapping, account, currency, market, filename)) }
          catch (e) { setShowColumns(true); setError(e instanceof Error ? e.message : 'Check your CSV columns.') }
        }}>Review import</Button>
        <Button onClick={onClose}>Cancel</Button>
      </div>
    </Modal>
  )
}
