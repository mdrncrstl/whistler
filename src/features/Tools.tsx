import { ArrowUpRight, Plus, Send, Square, Tags, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { Badge, Button, Card, EmptyState, IconButton, PageHeader } from '../components/ui'
import { usePortfolio } from '../context/PortfolioContext'
import { portfolioAnswer, type PortfolioAnswer } from '../lib/portfolioAssistant'
import { BorderBeam } from 'border-beam'
import { ThinkingOrb } from 'thinking-orbs'
import { questionGroups, researchAnswer, stockQuery } from '../lib/assistantResearch'
import { MetalButtonEffect } from '../components/MetalButtonEffect'
import { useReducedMotion } from 'framer-motion'
import { HoldingLogo } from '../components/HoldingLogo'
import { StockResearchChart } from '../components/StockResearchChart'

type Message = { role: 'assistant' | 'user'; text: string; answer?: PortfolioAnswer }
type Group = { id: number; name: string; description: string; symbols: string[] }
export function Tools() {
  const tool = window.location.pathname.split('/').filter(Boolean).at(-1) || 'assistant'
  if (tool === 'inbox') return <Navigate to="/app/connections" replace />
  if (tool === 'groups') return <CustomGroups />
  return <DeckAI />
}

function DeckAI() {
  const { bundle } = usePortfolio()
  const [messages, setMessages] = useState<Message[]>([])
  const [prompt, setPrompt] = useState('')
  const reducedMotion = useReducedMotion()
  const [focused, setFocused] = useState(false)
  const [preparing, setPreparing] = useState(false)
  const [category, setCategory] = useState<keyof typeof questionGroups>('Portfolio')
  const [researching, setResearching] = useState(false)
  const requestRef = useRef<AbortController | null>(null)
  const generation = useRef(0)
  const replyTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const cancelReply = () => {
    generation.current += 1
    requestRef.current?.abort()
    requestRef.current = null
    if (replyTimer.current !== null) clearTimeout(replyTimer.current)
    replyTimer.current = null
    setPreparing(false)
  }
  const conversationRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const conversation = conversationRef.current
    if (!conversation) return
    conversation.scrollTo({
      top: conversation.scrollHeight,
      behavior: reducedMotion ? 'auto' : 'smooth',
    })
  }, [messages, preparing, reducedMotion])
  const suggestions = questionGroups[category]
  const send = (value = prompt) => {
    const question = value.trim(); if (!question || preparing || requestRef.current) return
    const query = stockQuery(question)
    setResearching(!!query)
    const run = ++generation.current
    const controller = new AbortController()
    requestRef.current = controller
    const remote = query ? researchAnswer(query, controller.signal).catch(error => ({ title: 'Stock lookup unavailable', text: error instanceof Error ? error.message : 'Please retry your search.' })) : null
    setMessages((current) => [...current, { role: 'user', text: question }])
    setPreparing(true)
    replyTimer.current = setTimeout(async () => {
      replyTimer.current = null
      const reply = remote ? await remote : portfolioAnswer(question, bundle)
      if (generation.current !== run || controller.signal.aborted) return
      requestRef.current = null
      setMessages((current) => [...current, { role: 'assistant', text: reply.text, answer: reply }])
      setPreparing(false)
    }, 1600)
    setPrompt('')
  }
  useEffect(() => () => {
    requestRef.current?.abort()
    generation.current += 1
    if (replyTimer.current !== null) clearTimeout(replyTimer.current)
  }, [])
  return <div className="ai-workspace ai-engine">
    <h1 className="visually-hidden">Masterdeck AI portfolio assistant</h1>
    <div className="ai-titlebar"><div><strong>Masterdeck AI</strong><small>Portfolio insights & stock research</small></div><Button icon={Plus} onClick={() => { cancelReply(); setMessages([]); setPrompt('') }}>New chat</Button></div>
    <div className="ai-conversation" ref={conversationRef}>
      {!messages.length ? <div className="ai-engine-welcome"><ThinkingOrb state="breathing" size={64} paused={!!reducedMotion} aria-hidden="true"/><span className="section-label">A LITTLE MORE CLARITY</span><h2>Your next question.<br/><em>A clearer answer.</em></h2><p>Explore your investments or look up a company by name or ticker. Start with a question below.</p><div className="ai-question-tabs" aria-label="Question categories">{(Object.keys(questionGroups) as (keyof typeof questionGroups)[]).map(group => <button key={group} aria-pressed={category === group} onClick={() => setCategory(group)}>{group}</button>)}</div><div className="ai-suggestion-grid" key={category}>{suggestions.map((item, index) => <button key={item} onClick={() => send(item)}><small>0{index + 1}</small><span>{item}</span><ArrowUpRight size={17}/></button>)}</div></div> : <div className="ai-messages" role="log" aria-label="Portfolio conversation" aria-live="polite">{messages.map((message,index) => <div className={`ai-message ${message.role}`} key={index}><span className={`ai-message-avatar ${message.role === 'user' ? 'is-user' : ''}`}>{message.role === 'assistant' ? <ThinkingOrb state="shaping" size={20} paused aria-hidden="true"/> : null}</span><article>{message.answer && <div className="ai-answer-heading">{message.answer.symbol && <HoldingLogo symbol={message.answer.symbol} size={34}/>}<h2>{message.answer.title}</h2></div>}<p>{message.text}</p>{message.answer?.metrics && <div className="ai-answer-metrics">{message.answer.metrics.map((metric, i) => <div key={`${metric.label}-${i}`}><small>{metric.label}</small><strong>{metric.value}</strong></div>)}</div>}{message.answer?.points?.length ? <StockResearchChart points={message.answer.points} symbol={message.answer.symbol || message.answer.title} currency={message.answer.currency || 'AUD'}/> : null}{message.answer?.source && <a className="ai-source-link" href={message.answer.source.url} target="_blank" rel="noreferrer">{message.answer.source.label} · {message.answer.source.asOf ? new Date(message.answer.source.asOf).toLocaleString('en-AU') : 'Quote time unavailable'} · May be delayed<ArrowUpRight size={13}/></a>}{!!message.answer?.alternatives?.length && <div className="ai-alternatives"><small>Other matching listings</small>{message.answer.alternatives.map(item => <button key={item.symbol} disabled={preparing} onClick={() => send(`Look up ${item.symbol}`)}>{item.symbol} · {item.name}<ArrowUpRight size={12}/></button>)}</div>}{message.answer?.href && <Link to={message.answer.href}>{message.answer.link}<ArrowUpRight size={14}/></Link>}</article></div>)}<div role="status" className="ai-preparing" aria-live="polite">{preparing && <><ThinkingOrb state={researching ? 'searching' : 'solving'} size={20} paused={!!reducedMotion} aria-hidden="true"/><div><strong>{researching ? 'Looking up that stock' : 'Preparing your answer'}</strong><span>{researching ? 'Checking current market data' : 'Calculating from your portfolio records'}</span></div></>}</div><div className="ai-conversation-end" aria-hidden="true"/></div>}
    </div>
    <div className="ai-composer-area">
      <BorderBeam size="line" colorVariant="ocean" strength={0.35} active={(focused || preparing) && !reducedMotion} theme="light" borderRadius={20} className="ai-composer-beam">
        <form className="ai-source-compose" onFocus={() => setFocused(true)} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false) }} onSubmit={event => { event.preventDefault(); send() }}>
          <input value={prompt} maxLength={1000} onChange={event => setPrompt(event.target.value)} placeholder="Ask about your portfolio or look up a stock…" aria-label="Ask Masterdeck AI"/>
          <div className="ai-compose-actions"><span className="ai-record-label">{preparing ? 'Preparing answer…' : 'Records + market data'}</span><MetalButtonEffect paused={!!reducedMotion || (!focused && !preparing)}>{preparing ? <button className="ai-send" type="button" aria-label="Stop response" onClick={cancelReply}><Square size={14} fill="currentColor"/></button> : <button className="ai-send" type="submit" aria-label="Send question" disabled={!prompt.trim()}><Send size={17}/></button>}</MetalButtonEffect></div>
        </form>
      </BorderBeam>
      <p className="ai-disclaimer">Rules-based research and calculations. Market coverage varies. Not financial or tax advice.</p>
    </div>
  </div>
}

function CustomGroups() {
  const { bundle, setNotice } = usePortfolio()
  const storageKey = `masterdeck-custom-groups-${bundle.profile?.id || 'demo'}`
  const [groups, setGroups] = useState<Group[]>(() => {
    try {
      const saved = window.localStorage.getItem(storageKey)
      return saved ? JSON.parse(saved) as Group[] : []
    } catch { return [] }
  })
  const [draft, setDraft] = useState('')
  const [selected, setSelected] = useState<string[]>([])
  const [openGroupId, setOpenGroupId] = useState<number | null>(null)
  const available = useMemo(()=>bundle.holdings.map((h)=>h.symbol),[bundle.holdings])
  useEffect(() => { window.localStorage.setItem(storageKey, JSON.stringify(groups)) }, [groups, storageKey])
  const create = (event: FormEvent) => { event.preventDefault(); if (!draft.trim()) return; setGroups((items)=>[...items,{id:Date.now(),name:draft.trim(),description:'Custom portfolio segment',symbols:selected}]);setDraft('');setSelected([]);setNotice({tone:'success',message:'Custom group created.'}) }
  return <>
    <PageHeader title="Custom groups" description="Create reusable portfolio slices for reports, filters and comparisons." />
    <Card className="group-builder"><div><span className="section-label">NEW GROUP</span><h2>Organise holdings your way</h2><p>Use groups for sectors, strategies, risk tiers or any reporting lens that matters to you.</p></div><form onSubmit={create}><label>Group name<input value={draft} onChange={(event)=>setDraft(event.target.value)} placeholder="e.g. Income strategy"/></label><fieldset><legend>Holdings</legend>{available.length ? available.map((symbol)=><label key={symbol}><input type="checkbox" checked={selected.includes(symbol)} onChange={(event)=>setSelected((items)=>event.target.checked?[...items,symbol]:items.filter((item)=>item!==symbol))}/><span>{symbol}</span></label>) : <small>Import holdings before assigning them to a group.</small>}</fieldset><Button type="submit" variant="primary" icon={Plus} disabled={!draft.trim()}>Create group</Button></form></Card>
    {groups.length ? <div className="group-grid">{groups.map((group)=>{ const groupHoldings = bundle.holdings.filter((holding) => group.symbols.includes(holding.symbol)); const isOpen = openGroupId === group.id; return <Card className={`group-card ${isOpen ? 'is-open' : ''}`} key={group.id}><Tags/><Badge>{group.symbols.length} holdings</Badge><h2>{group.name}</h2><p>{group.symbols.length ? group.symbols.join(' · ') : 'No holdings assigned yet.'}</p><div><Button type="button" onClick={() => setOpenGroupId(isOpen ? null : group.id)}>{isOpen ? 'Close group' : 'Open group'}</Button><IconButton label={`Delete ${group.name}`} onClick={()=>{ setGroups((items)=>items.filter((item)=>item.id!==group.id)); if (isOpen) setOpenGroupId(null) }}><Trash2 size={15}/></IconButton></div>{isOpen && <div className="group-open-panel" aria-live="polite"><div><strong>{group.name} holdings</strong><small>Use any holding below to open its full detail page.</small></div>{groupHoldings.length ? <div className="group-open-links">{groupHoldings.map((holding)=><Link key={holding.symbol} to={`/app/holdings/${encodeURIComponent(holding.symbol)}`}>{holding.symbol}<ArrowUpRight size={13}/></Link>)}</div> : <span className="group-open-empty">This group has no matching holdings in the current workspace.</span>}</div>}</Card>})}</div> : <Card className="groups-empty"><EmptyState icon={Tags} title="Create your first custom group" description="Categorise holdings by sector, risk level, strategy or any other reporting lens." action={<div className="group-examples"><span><strong>Sectors</strong><small>Technology, healthcare, energy</small></span><span><strong>Risk tier</strong><small>Conservative, balanced, aggressive</small></span><span><strong>Strategy</strong><small>Income, growth, speculative</small></span></div>}/></Card>}
  </>
}
