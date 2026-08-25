import { Bot, Copy, Inbox, Mail, Mic, Plus, Search, Send, Tags, Trash2 } from 'lucide-react'
import { useMemo, useState, type FormEvent } from 'react'
import { Badge, Button, Card, EmptyState, IconButton, PageHeader, Select } from '../components/ui'
import { usePortfolio } from '../context/PortfolioContext'
import { allocationBy, summarisePortfolio } from '../lib/portfolio'
import { money, percent } from '../lib/format'

type Message = { role: 'assistant' | 'user'; text: string }
type Group = { id: number; name: string; description: string; symbols: string[] }

export function Tools() {
  const tool = window.location.pathname.split('/').filter(Boolean).at(-1) || 'assistant'
  if (tool === 'inbox') return <DocumentInbox />
  if (tool === 'groups') return <CustomGroups />
  return <DeckAI />
}

function DeckAI() {
  const { bundle } = usePortfolio()
  const [messages, setMessages] = useState<Message[]>([])
  const [prompt, setPrompt] = useState('')
  const summary = summarisePortfolio(bundle)
  const top = allocationBy(bundle.holdings, 'sector')[0]
  const suggestions = ['What can you do?', 'Show my portfolio performance for all time', 'Where am I concentrated?', 'Summarise my tax position']
  const send = (value = prompt) => {
    const question = value.trim(); if (!question) return
    setMessages((current) => [...current, { role: 'user', text: question }, { role: 'assistant', text: answer(question, summary, top?.name, top?.percentage, bundle.transactions.length) }])
    setPrompt('')
  }
  return <div className="ai-workspace">
    <div className="ai-titlebar"><strong>{messages.length ? 'Portfolio analysis' : 'New chat'}</strong><Button icon={Plus} onClick={() => { setMessages([]); setPrompt('') }}>New chat</Button></div>
    <div className="ai-conversation">
      {!messages.length ? <div className="ai-source-welcome"><span><Bot/></span><p>Hi! How can I help you today?</p><div className="prompt-chips">{suggestions.map((item)=><button key={item} onClick={()=>send(item)}>{item}</button>)}</div></div> : <div className="ai-messages">{messages.map((message,index)=><div className={`ai-message ${message.role}`} key={index}><span>{message.role === 'assistant' ? <Bot size={15}/> : 'You'}</span><p>{message.text}</p></div>)}</div>}
    </div>
    <form className="ai-source-compose" onSubmit={(event)=>{event.preventDefault();send()}}><input value={prompt} onChange={(event)=>setPrompt(event.target.value)} placeholder="Ask me anything…" aria-label="Ask Deck AI"/><IconButton label="Voice input" type="button"><Mic size={16}/></IconButton><button aria-label="Send question" disabled={!prompt.trim()}><Send size={16}/></button></form>
    <p className="ai-disclaimer">Answers are deterministic summaries of the holdings and transactions currently loaded in this workspace; they are not financial or tax advice.</p>
  </div>
}

function answer(question: string, summary: ReturnType<typeof summarisePortfolio>, topName?: string, topPct?: number, transactions = 0) {
  const lower = question.toLowerCase()
  if (lower.includes('what can')) return `I can summarise performance, concentration, income, transactions and tax-report estimates from this workspace. I currently have ${summary.holdingCount} holdings and ${transactions} transactions available.`
  if (lower.includes('concentrat')) return topName ? `${topName} is the largest sector exposure at ${percent(topPct || 0)}. Review the Diversification report for every category and holding weight.` : 'There are no connected holdings to calculate concentration yet.'
  if (lower.includes('tax')) return `The current open-position gain is ${money(summary.unrealised)} and recorded portfolio income is ${money(summary.income)}. Open Tax overview to review data-quality tasks, CGT parcels and myTax fields before relying on an estimate.`
  return `Portfolio value is ${money(summary.total)}. Open-position return is ${money(summary.unrealised)} (${percent(summary.returnPct)}), recorded income is ${money(summary.income)}, and today's loaded movement is ${money(summary.dayChange)}.`
}

function DocumentInbox() {
  const { bundle, setNotice } = usePortfolio()
  const [search, setSearch] = useState('')
  const [scope, setScope] = useState('portfolio')
  const address = `imports+${bundle.profile?.id?.slice(0,8) || 'demo'}@inbox.masterdeck.app`
  const copy = async () => { await navigator.clipboard?.writeText(address); setNotice({ tone: 'success', message: 'Inbox address copied.' }) }
  return <>
    <PageHeader title="Document inbox" description="Forward broker confirmations and statements into a review queue before portfolio data changes." />
    <Card className="inbox-address source-depth"><Mail/><div><span className="section-label">INBOX ADDRESS FOR ALL PORTFOLIOS</span><strong>{address}</strong><p>Use this address only after email ingestion is shown as active in Connections.</p></div><Button icon={Copy} onClick={copy}>Copy</Button></Card>
    <div className="report-toolbar inbox-toolbar"><Select value={scope} onChange={(event)=>setScope(event.target.value)} aria-label="Inbox scope"><option value="portfolio">Current portfolio</option><option value="all">All emails</option></Select><Select defaultValue="25" aria-label="Page size"><option value="25">25 per page</option><option value="50">50 per page</option></Select><label className="report-search"><Search size={14}/><input value={search} onChange={(event)=>setSearch(event.target.value)} placeholder="Search subject, broker, or error…"/></label></div>
    <Card className="inbox-onboarding"><div><span><Inbox/></span><h2>Automate trade imports</h2><p>Forward a broker confirmation to the private address. Parsed records remain in review until you approve an import.</p></div><ol><li><b>1</b><span><strong>Copy your unique email address</strong><small>Each signed-in workspace receives a private alias.</small></span></li><li><b>2</b><span><strong>Forward broker confirmations</strong><small>Contract notes and supported statements can be parsed.</small></span></li><li><b>3</b><span><strong>Review extracted records</strong><small>Nothing changes the portfolio without confirmation.</small></span></li><li><b>4</b><span><strong>Monitor import status</strong><small>Successful and failed documents remain auditable.</small></span></li></ol><div className="supported-brokers"><strong>Supported document formats</strong><span>PDF · CSV · trade confirmation email · dividend statement</span></div></Card>
    <Card><EmptyState icon={Mail} title={search ? `No emails matching “${search}”` : 'Inbox is clear'} description={scope === 'all' ? 'No forwarded documents are available in any portfolio.' : 'Forwarded documents for this portfolio will appear here for review.'}/></Card>
  </>
}

function CustomGroups() {
  const { bundle, setNotice } = usePortfolio()
  const [groups, setGroups] = useState<Group[]>([])
  const [draft, setDraft] = useState('')
  const [selected, setSelected] = useState<string[]>([])
  const available = useMemo(()=>bundle.holdings.map((h)=>h.symbol),[bundle.holdings])
  const create = (event: FormEvent) => { event.preventDefault(); if (!draft.trim()) return; setGroups((items)=>[...items,{id:Date.now(),name:draft.trim(),description:'Custom portfolio segment',symbols:selected}]);setDraft('');setSelected([]);setNotice({tone:'success',message:'Custom group created.'}) }
  return <>
    <PageHeader title="Custom groups" description="Create reusable portfolio slices for reports, filters and comparisons." />
    <Card className="group-builder"><div><span className="section-label">NEW GROUP</span><h2>Organise holdings your way</h2><p>Use groups for sectors, strategies, risk tiers or any reporting lens that matters to you.</p></div><form onSubmit={create}><label>Group name<input value={draft} onChange={(event)=>setDraft(event.target.value)} placeholder="e.g. Income strategy"/></label><fieldset><legend>Holdings</legend>{available.length ? available.map((symbol)=><label key={symbol}><input type="checkbox" checked={selected.includes(symbol)} onChange={(event)=>setSelected((items)=>event.target.checked?[...items,symbol]:items.filter((item)=>item!==symbol))}/><span>{symbol}</span></label>) : <small>Import holdings before assigning them to a group.</small>}</fieldset><Button variant="primary" icon={Plus} disabled={!draft.trim()}>Create group</Button></form></Card>
    {groups.length ? <div className="group-grid">{groups.map((group)=><Card className="group-card" key={group.id}><Tags/><Badge>{group.symbols.length} holdings</Badge><h2>{group.name}</h2><p>{group.symbols.length ? group.symbols.join(' · ') : 'No holdings assigned yet.'}</p><div><Button>Open group</Button><IconButton label={`Delete ${group.name}`} onClick={()=>setGroups((items)=>items.filter((item)=>item.id!==group.id))}><Trash2 size={15}/></IconButton></div></Card>)}</div> : <Card className="groups-empty"><EmptyState icon={Tags} title="Create your first custom group" description="Categorise holdings by sector, risk level, strategy or any other reporting lens." action={<div className="group-examples"><span><strong>Sectors</strong><small>Technology, healthcare, energy</small></span><span><strong>Risk tier</strong><small>Conservative, balanced, aggressive</small></span><span><strong>Strategy</strong><small>Income, growth, speculative</small></span></div>}/></Card>}
  </>
}
