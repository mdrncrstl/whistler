import { AlertTriangle, Building2, ChevronDown, CheckCircle2, CloudUpload, FileSpreadsheet, KeyRound, Mail, RefreshCw, Search, ShieldCheck, Trash2, Unplug, WalletCards } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useGoogleLogin } from '@react-oauth/google'
import { useSearchParams } from 'react-router-dom'
import { usePortfolio } from '../context/PortfolioContext'
import { parseSuperheroFile } from '../lib/superhero'
import type { BrokerConnection, SuperheroReport } from '../types'
import { CsvImportMapper } from '../components/CsvImportMapper'
import { brokers, methodDetail, methodLabel, type Broker } from '../lib/brokers'
import { readCsvSheet, type CsvSheet } from '../lib/csvImport'
import { date, relativeDate } from '../lib/format'
import { Badge, Button, Card, EmptyState, Modal, PageHeader } from '../components/ui'

function providerName(provider: BrokerConnection['provider']) {
  if (provider === 'ibkr') return 'Direct read-only sync'
  if (provider === 'google_gmail') return 'Superhero Gmail'
  return 'Statement imports'
}

export function Connections() {
  const { bundle, demo, action, connectIbkr, syncIbkr, importSuperhero, connectGmail, syncGmail, disconnect, setNotice } = usePortfolio()
  const [searchParams, setSearchParams] = useSearchParams()
  const requestedSetup = searchParams.get('setup')
  const [ibkrOpen, setIbkrOpen] = useState(() => requestedSetup === 'ibkr' && !demo)
  const [label, setLabel] = useState('IBKR Main')
  const [token, setToken] = useState('')
  const [queryId, setQueryId] = useState('')
  const [report, setReport] = useState<SuperheroReport | null>(null)
  const [fileName, setFileName] = useState('')
  const [disconnecting, setDisconnecting] = useState<BrokerConnection | null>(null)
  const [catalogQuery, setCatalogQuery] = useState('')
  const [csvSheet, setCsvSheet] = useState<CsvSheet | null>(null)
  const [importSource, setImportSource] = useState('CSV')
  const [importBroker, setImportBroker] = useState<Broker | null>(null)
  const [catalogOpen, setCatalogOpen] = useState(false)
  const genericFileInput = useRef<HTMLInputElement>(null)
  const fileInput = useRef<HTMLInputElement>(null)
  const ibkr = bundle.connections.find((item) => item.provider === 'ibkr')
  const superhero = bundle.connections.find((item) => item.provider === 'superhero')
  const gmail = bundle.connections.find((item) => item.provider === 'google_gmail')
  const ibkrReference = ibkr?.config?.mode === 'reference-portfolio'
  const superheroReference = superhero?.config?.mode === 'reference-portfolio'
  // One shared broker list backs this catalogue and the marketing integrations page, so
  // the two can never disagree about what is actually supported.
  const catalog = useMemo(() => {
    const query = catalogQuery.trim().toLowerCase()
    if (!query) return brokers
    return brokers.filter((broker) => `${broker.name} ${broker.region} ${methodLabel[broker.method]} ${broker.market}`.toLowerCase().includes(query))
  }, [catalogQuery])

  useEffect(() => {
    if (requestedSetup === 'import') {
      window.requestAnimationFrame(() => {
        const target = document.querySelector<HTMLElement>('[data-setup-provider="csv"]')
        if (typeof target?.scrollIntoView === 'function') target.scrollIntoView({ behavior: 'smooth', block: 'center' })
        target?.querySelector<HTMLButtonElement>('button')?.focus()
      })
    }
  }, [requestedSetup])

  const closeIbkrSetup = () => {
    setIbkrOpen(false)
    if (!requestedSetup) return
    const next = new URLSearchParams(searchParams)
    next.delete('setup')
    setSearchParams(next, { replace: true })
  }

  const gmailLogin = useGoogleLogin({
    scope: 'openid email profile https://www.googleapis.com/auth/gmail.readonly',
    prompt: 'consent',
    onSuccess: async (response) => {
      try { await connectGmail(response.access_token) } catch { /* surfaced by context */ }
    },
    onError: () => setNotice({ tone: 'error', message: 'Google did not complete the Gmail authorisation.' }),
  })

  const selectFile = async (file?: File) => {
    if (!file) return
    setFileName(file.name)
    setReport(null)
    try {
      const parsed = await parseSuperheroFile(file)
      setReport(parsed)
      if (!parsed.holdings.length && !parsed.transactions.length && !parsed.cash.length) setNotice({ tone: 'error', message: parsed.warnings[0] || 'No supported rows were found.' })
    } catch (error) {
      setNotice({ tone: 'error', message: error instanceof Error ? error.message : 'The report could not be read.' })
    }
  }

  const saveIbkr = async (event: React.FormEvent) => {
    event.preventDefault()
    try {
      await connectIbkr({ label, token, queryId })
      closeIbkrSetup(); setToken(''); setQueryId('')
    } catch { /* surfaced by context */ }
  }

  const submitReport = async () => {
    if (!report) return
    try { await importSuperhero(report); setReport(null); setFileName(''); if (fileInput.current) fileInput.current.value = '' } catch { /* surfaced by context */ }
  }

  const connectionCard = (connection: BrokerConnection | undefined, provider: BrokerConnection['provider'], description: string, actions: React.ReactNode) => (
    <div className={`connection-slot ${requestedSetup === (provider === 'ibkr' ? 'ibkr' : provider === 'superhero' ? 'import' : '') ? 'requested' : ''}`} data-setup-provider={provider}>
    <Card className="connection-card">
      <div className="connection-icon">{provider === 'ibkr' ? <KeyRound /> : provider === 'google_gmail' ? <Mail /> : <FileSpreadsheet />}</div>
      <div className="connection-body">
        <div className="connection-title"><div><h2>{providerName(provider)}</h2><p>{description}</p></div>{connection?.config?.mode === 'reference-portfolio' ? <Badge>Reference portfolio</Badge> : connection ? <Badge tone={connection.status === 'connected' ? 'success' : connection.status === 'error' ? 'error' : 'warning'}>{connection.status}</Badge> : <Badge>Not connected</Badge>}</div>
        {connection && <div className="connection-meta"><span><strong>{connection.label}</strong> · {relativeDate(connection.last_synced_at)}</span>{connection.last_error && <span className="connection-error"><AlertTriangle size={14} />{connection.last_error}</span>}</div>}
        <div className="connection-actions">{actions}{connection && !demo && <Button variant="ghost" icon={Trash2} onClick={() => setDisconnecting(connection)}>Disconnect</Button>}</div>
      </div>
    </Card>
    </div>
  )

  return (
    <>
      <PageHeader title="Connections" description="Bring every portfolio in through a read-only sync, a CSV export, or a supported PDF statement. Review the records before anything is saved." />
      {!bundle.holdings.length && <section className="connection-onboarding" aria-label="Portfolio setup progress"><div><strong>Add your first holdings</strong><p>Choose one of the import paths below, then review the holdings Masterdeck finds. You can keep up to ten portfolios in one workspace, with Australian CGT records ready for tax time.</p></div><ol><li className="active"><span>1</span>Choose a source</li><li><span>2</span>Review and import</li></ol></section>}
      {demo && <div className="demo-banner"><ShieldCheck size={18} /><span>The demo shows connection states but never accepts or sends private broker credentials. Sign in to connect real accounts.</span></div>}
      <section className="csv-help" data-setup-provider="csv">
        <span className="section-label">FILE IMPORTS</span>
        <h2>Bring in a statement from any broker</h2>
        <p>Use a CSV export or a supported PDF statement. Masterdeck identifies holdings, trades, columns, exchange and currency, then gives you a review step before anything is saved.</p>
        <div className="csv-help-actions"><Button variant="primary" icon={CloudUpload} onClick={() => { setImportSource('CSV'); setImportBroker(null); genericFileInput.current?.click() }}>Choose CSV file</Button><Button variant="secondary" icon={FileSpreadsheet} onClick={() => { setImportSource('PDF'); setImportBroker(null); fileInput.current?.click() }}>Choose PDF statement</Button><a className="button" href="/templates/masterdeck-holdings.csv" download>Holdings template</a><a className="button" href="/templates/masterdeck-trades.csv" download>Trades template</a></div>
      </section>
      <div className="connections-grid">
        {connectionCard(ibkr, 'ibkr', 'Optional direct sync for positions, cash and account activity where a supported feed is available.', <>{ibkrReference ? <Button variant="primary" icon={KeyRound} disabled={demo} onClick={() => setIbkrOpen(true)}>Connect direct sync</Button> : ibkr ? <Button icon={RefreshCw} busy={action === `sync-${ibkr.id}`} disabled={demo} onClick={() => syncIbkr(ibkr.id)}>Sync latest records</Button> : <Button variant="primary" icon={KeyRound} disabled={demo} onClick={() => setIbkrOpen(true)}>Connect direct sync</Button>}<span className="read-only-label"><ShieldCheck size={14} /> {ibkrReference ? 'Saved reference portfolio · no live access' : 'Read-only connection · no trades or money movement'}</span></>)}
        {connectionCard(superhero, 'superhero', 'Upload a Full Portfolio Report, Transaction Statement, Valuation CSV or contract-note PDF.', <Button variant={superhero && !superheroReference ? 'secondary' : 'primary'} icon={CloudUpload} onClick={() => fileInput.current?.click()}>{superheroReference ? 'Replace with a broker report' : superhero ? 'Import another report' : 'Choose Superhero report'}</Button>)}
        {connectionCard(gmail, 'google_gmail', 'Optional separate Gmail read-only authorisation for narrow Superhero contract-note searches.', <>{gmail ? <Button icon={RefreshCw} busy={action === `sync-${gmail.id}`} disabled={demo} onClick={() => syncGmail(gmail.id)}>Scan Gmail now</Button> : <Button icon={Mail} disabled={demo} onClick={() => gmailLogin()}>Connect Gmail read-only</Button>}<span className="read-only-label"><ShieldCheck size={14} /> Requested scope: gmail.readonly</span></>)}
      </div>

      <button type="button" className={`catalog-disclosure ${catalogOpen ? 'is-open' : ''}`} aria-expanded={catalogOpen} onClick={()=>setCatalogOpen(!catalogOpen)}><span><strong>Browse supported brokers</strong><small>Start with a named guide if you want one. A compatible CSV export works even when your broker is not listed.</small></span><ChevronDown size={18} aria-hidden="true"/></button>{catalogOpen && <><div className="catalog-heading"><div><h2>Find a broker or exchange</h2><p>Choose a named import guide, use the direct read-only sync where available, or upload a CSV from any broker and map its columns once.</p></div><label className="catalog-search"><Search size={15}/><input aria-label="Find a broker or exchange" value={catalogQuery} onChange={event=>setCatalogQuery(event.target.value)} placeholder="Find a broker or exchange…"/></label></div>
      <div className="integration-catalog">{catalog.map((broker)=><Card className={`catalog-card method-${broker.method}`} key={broker.id}><span className="catalog-icon">{broker.method==='sync'?<KeyRound/>:broker.method==='parser'?<Building2/>:<FileSpreadsheet/>}</span><div><h3>{broker.name}</h3><p><span className="catalog-method">{methodLabel[broker.method]}</span> · {broker.region} · {broker.market}</p><small>{broker.note || methodDetail[broker.method]}</small></div>{broker.method==='sync'?<Button variant="ghost" icon={KeyRound} disabled={demo} onClick={()=>setIbkrOpen(true)}>Connect</Button>:broker.method==='parser'?<Button variant="ghost" icon={CloudUpload} onClick={()=>fileInput.current?.click()}>Upload</Button>:<Button variant="ghost" icon={CloudUpload} onClick={()=>{setImportSource(broker.id==='other'?'CSV':broker.name);setImportBroker(broker);genericFileInput.current?.click()}}>Choose CSV</Button>}</Card>)}</div>
      {!catalog.length && <EmptyState icon={Search} title="Your broker does not need to be listed" description="Export a CSV from any broker, match its columns once, then review the records before they are saved."/>}</>}
      <input ref={genericFileInput} className="visually-hidden" type="file" accept=".csv,text/csv" onChange={async event => { const file = event.target.files?.[0]; if (!file) return; try { if(file.size > 10_000_000) throw new Error('Choose a CSV smaller than 10 MB.'); setFileName(file.name);setReport(null);setCsvSheet(readCsvSheet(await file.text())) } catch(e){ setNotice({tone:'error',message:e instanceof Error ? e.message : 'Could not read CSV.'}) } finally { if(genericFileInput.current) genericFileInput.current.value='' } }}/>
      {csvSheet && <CsvImportMapper sheet={csvSheet} filename={fileName} source={importSource} defaultCurrency={importBroker?.currency || 'AUD'} defaultMarket={importBroker?.market || 'ASX'} onClose={()=>{setCsvSheet(null);setFileName('')}} onReview={parsed=>{setReport(parsed);setCsvSheet(null)}}/>}

      <input ref={fileInput} className="visually-hidden" type="file" accept=".csv,text/csv,.pdf,application/pdf" onChange={(event) => selectFile(event.target.files?.[0])} />
      {(fileName || report) && <Card className="import-review"><div className="import-file"><FileSpreadsheet size={22} /><span><strong>{fileName}</strong><small>Parsed locally in your browser; the raw file is not retained.</small></span></div>{report && <><div className="import-counts"><span><strong>{report.holdings.length}</strong> holdings</span><span><strong>{report.transactions.length}</strong> transactions</span><span><strong>{report.cash.length}</strong> cash rows</span></div>{report.warnings.length > 0 && <div className="import-warnings"><AlertTriangle size={16} /><span>{report.warnings.slice(0, 3).join(' ')}</span></div>}<div className="connection-actions"><Button variant="primary" icon={CloudUpload} busy={action === 'import-superhero'} disabled={demo || (!report.holdings.length && !report.transactions.length && !report.cash.length)} onClick={submitReport}>{demo ? 'Sign in to import' : 'Import parsed rows'}</Button><Button variant="ghost" onClick={() => { setReport(null); setFileName(''); if (fileInput.current) fileInput.current.value = '' }}>Cancel</Button></div></>}</Card>}

      <Card className="sync-history"><div className="card-title-row"><div><span className="section-label">ACTIVITY</span><h2>Recent sync runs</h2></div></div>{bundle.syncRuns.length ? <div className="sync-list">{bundle.syncRuns.map((run) => <div key={run.id}><span className={`sync-status ${run.status}`}>{run.status === 'success' ? <CheckCircle2 size={16} /> : run.status === 'error' ? <AlertTriangle size={16} /> : <RefreshCw size={16} />}</span><span><strong>{run.message || `${providerName(run.provider)} sync`}</strong><small>{date(run.started_at, { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })} · {run.imported_count} rows processed</small></span><Badge tone={run.status === 'success' ? 'success' : run.status === 'error' ? 'error' : 'warning'}>{run.status}</Badge></div>)}</div> : <EmptyState icon={WalletCards} title="No sync history yet" description="Completed broker syncs and report imports will appear here." />}</Card>

      <Modal open={ibkrOpen} title="Connect a direct read-only sync" description="The current direct feed uses an Interactive Brokers Activity Flex Query with reporting-only access." onClose={closeIbkrSetup}>
        <form className="form-stack" onSubmit={saveIbkr}>
          <label><span>Account label</span><input value={label} onChange={(event) => setLabel(event.target.value)} maxLength={80} required /></label>
          <label><span>Flex Web Service token</span><input value={token} onChange={(event) => setToken(event.target.value)} type="password" autoComplete="off" inputMode="numeric" placeholder="Private Flex token" required /></label>
          <label><span>Activity Flex Query ID</span><input value={queryId} onChange={(event) => setQueryId(event.target.value)} autoComplete="off" inputMode="numeric" placeholder="Numeric Query ID" required /></label>
          <div className="secure-callout"><ShieldCheck size={17} /><span>Your token is sent only to the MASTERDECK Edge Function, encrypted before storage, and cannot place trades.</span></div>
          <div className="modal-actions"><Button type="button" variant="ghost" onClick={() => setIbkrOpen(false)}>Cancel</Button><Button type="submit" variant="primary" icon={KeyRound} busy={action === 'connect-ibkr'}>Verify and connect</Button></div>
        </form>
      </Modal>

      <Modal open={Boolean(disconnecting)} title={`Disconnect ${disconnecting ? providerName(disconnecting.provider) : 'account'}?`} description="This removes the connection and its imported portfolio data from MASTERDECK." onClose={() => setDisconnecting(null)}>
        <div className="disconnect-warning"><Unplug size={24} /><p>This cannot be undone from the app. You can reconnect or re-import later, but historical rows may need to be fetched again.</p></div>
        <div className="modal-actions"><Button variant="ghost" onClick={() => setDisconnecting(null)}>Keep connection</Button><Button variant="danger" icon={Trash2} busy={action === `disconnect-${disconnecting?.id}`} onClick={async () => { if (!disconnecting) return; try { await disconnect(disconnecting.id); setDisconnecting(null) } catch { /* surfaced */ } }}>Disconnect and remove data</Button></div>
      </Modal>
    </>
  )
}
