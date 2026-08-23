import { AlertTriangle, CheckCircle2, CloudUpload, FileSpreadsheet, KeyRound, Mail, RefreshCw, ShieldCheck, Trash2, Unplug, WalletCards } from 'lucide-react'
import { useRef, useState } from 'react'
import { useGoogleLogin } from '@react-oauth/google'
import { usePortfolio } from '../context/PortfolioContext'
import { parseSuperheroFile } from '../lib/superhero'
import type { BrokerConnection, SuperheroReport } from '../types'
import { date, relativeDate } from '../lib/format'
import { Badge, Button, Card, EmptyState, Modal, PageHeader } from '../components/ui'

function providerName(provider: BrokerConnection['provider']) {
  if (provider === 'ibkr') return 'Interactive Brokers'
  if (provider === 'google_gmail') return 'Superhero Gmail'
  return 'Superhero'
}

export function Connections() {
  const { bundle, demo, action, connectIbkr, syncIbkr, importSuperhero, connectGmail, syncGmail, disconnect, setNotice } = usePortfolio()
  const [ibkrOpen, setIbkrOpen] = useState(false)
  const [label, setLabel] = useState('IBKR Main')
  const [token, setToken] = useState('')
  const [queryId, setQueryId] = useState('')
  const [report, setReport] = useState<SuperheroReport | null>(null)
  const [fileName, setFileName] = useState('')
  const [disconnecting, setDisconnecting] = useState<BrokerConnection | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)
  const ibkr = bundle.connections.find((item) => item.provider === 'ibkr')
  const superhero = bundle.connections.find((item) => item.provider === 'superhero')
  const gmail = bundle.connections.find((item) => item.provider === 'google_gmail')

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
      setIbkrOpen(false); setToken(''); setQueryId('')
    } catch { /* surfaced by context */ }
  }

  const submitReport = async () => {
    if (!report) return
    try { await importSuperhero(report); setReport(null); setFileName(''); if (fileInput.current) fileInput.current.value = '' } catch { /* surfaced by context */ }
  }

  const connectionCard = (connection: BrokerConnection | undefined, provider: BrokerConnection['provider'], description: string, actions: React.ReactNode) => (
    <Card className="connection-card">
      <div className="connection-icon">{provider === 'ibkr' ? <KeyRound /> : provider === 'google_gmail' ? <Mail /> : <FileSpreadsheet />}</div>
      <div className="connection-body">
        <div className="connection-title"><div><h2>{providerName(provider)}</h2><p>{description}</p></div>{connection ? <Badge tone={connection.status === 'connected' ? 'success' : connection.status === 'error' ? 'error' : 'warning'}>{connection.status}</Badge> : <Badge>Not connected</Badge>}</div>
        {connection && <div className="connection-meta"><span><strong>{connection.label}</strong> · {relativeDate(connection.last_synced_at)}</span>{connection.last_error && <span className="connection-error"><AlertTriangle size={14} />{connection.last_error}</span>}</div>}
        <div className="connection-actions">{actions}{connection && !demo && <Button variant="ghost" icon={Trash2} onClick={() => setDisconnecting(connection)}>Disconnect</Button>}</div>
      </div>
    </Card>
  )

  return (
    <>
      <PageHeader title="Connections" description="Read-only broker data and optional Superhero document automation." />
      {demo && <div className="demo-banner"><ShieldCheck size={18} /><span>The demo shows connection states but never accepts or sends private broker credentials. Sign in to connect real accounts.</span></div>}
      <div className="connections-grid">
        {connectionCard(ibkr, 'ibkr', 'Automatic Activity Flex sync for positions, cash and complete account activity.', <>{ibkr ? <Button icon={RefreshCw} busy={action === `sync-${ibkr.id}`} disabled={demo} onClick={() => syncIbkr(ibkr.id)}>Sync IBKR now</Button> : <Button variant="primary" icon={KeyRound} disabled={demo} onClick={() => setIbkrOpen(true)}>Connect IBKR</Button>}<span className="read-only-label"><ShieldCheck size={14} /> Flex Web Service v3 · read only</span></>)}
        {connectionCard(superhero, 'superhero', 'Upload a Full Portfolio Report, Transaction Statement, Valuation CSV or contract-note PDF.', <Button variant={superhero ? 'secondary' : 'primary'} icon={CloudUpload} onClick={() => fileInput.current?.click()}>{superhero ? 'Import another report' : 'Choose Superhero report'}</Button>)}
        {connectionCard(gmail, 'google_gmail', 'Optional separate Gmail read-only authorisation for narrow Superhero contract-note searches.', <>{gmail ? <Button icon={RefreshCw} busy={action === `sync-${gmail.id}`} disabled={demo} onClick={() => syncGmail(gmail.id)}>Scan Gmail now</Button> : <Button icon={Mail} disabled={demo} onClick={() => gmailLogin()}>Connect Gmail read-only</Button>}<span className="read-only-label"><ShieldCheck size={14} /> Requested scope: gmail.readonly</span></>)}
      </div>

      <input ref={fileInput} className="visually-hidden" type="file" accept=".csv,text/csv,.pdf,application/pdf" onChange={(event) => selectFile(event.target.files?.[0])} />
      {(fileName || report) && <Card className="import-review"><div className="import-file"><FileSpreadsheet size={22} /><span><strong>{fileName}</strong><small>Parsed locally in your browser; the raw file is not retained.</small></span></div>{report && <><div className="import-counts"><span><strong>{report.holdings.length}</strong> holdings</span><span><strong>{report.transactions.length}</strong> transactions</span><span><strong>{report.cash.length}</strong> cash rows</span></div>{report.warnings.length > 0 && <div className="import-warnings"><AlertTriangle size={16} /><span>{report.warnings.slice(0, 3).join(' ')}</span></div>}<div className="connection-actions"><Button variant="primary" icon={CloudUpload} busy={action === 'import-superhero'} disabled={demo || (!report.holdings.length && !report.transactions.length && !report.cash.length)} onClick={submitReport}>{demo ? 'Sign in to import' : 'Import parsed rows'}</Button><Button variant="ghost" onClick={() => { setReport(null); setFileName(''); if (fileInput.current) fileInput.current.value = '' }}>Cancel</Button></div></>}</Card>}

      <Card className="sync-history"><div className="card-title-row"><div><span className="section-label">ACTIVITY</span><h2>Recent sync runs</h2></div></div>{bundle.syncRuns.length ? <div className="sync-list">{bundle.syncRuns.map((run) => <div key={run.id}><span className={`sync-status ${run.status}`}>{run.status === 'success' ? <CheckCircle2 size={16} /> : run.status === 'error' ? <AlertTriangle size={16} /> : <RefreshCw size={16} />}</span><span><strong>{run.message || `${providerName(run.provider)} sync`}</strong><small>{date(run.started_at, { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })} · {run.imported_count} rows processed</small></span><Badge tone={run.status === 'success' ? 'success' : run.status === 'error' ? 'error' : 'warning'}>{run.status}</Badge></div>)}</div> : <EmptyState icon={WalletCards} title="No sync history yet" description="Completed broker syncs and report imports will appear here." />}</Card>

      <Modal open={ibkrOpen} title="Connect Interactive Brokers" description="Use an Activity Flex Query with read-only reporting access." onClose={() => setIbkrOpen(false)}>
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
