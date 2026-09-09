import { ArrowUpRight, Mic, Plus, Send, Square, Tags, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { Badge, Button, Card, EmptyState, IconButton, PageHeader } from '../components/ui'
import { usePortfolio } from '../context/PortfolioContext'
import { portfolioAnswer, type PortfolioAnswer } from '../lib/portfolioAssistant'
import { BorderBeam } from 'border-beam'
import { ThinkingOrb } from 'thinking-orbs'
import { Liquid } from 'liquid-gooey'
import { questionGroups, researchAnswer, stockQuery } from '../lib/assistantResearch'
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis } from 'recharts'
import { MetalButtonEffect } from '../components/MetalButtonEffect'
import { useReducedMotion } from 'framer-motion'

type Message = { role: 'assistant' | 'user'; text: string; answer?: PortfolioAnswer }
type Group = { id: number; name: string; description: string; symbols: string[] }
type SpeechRecognitionLike = {
  continuous: boolean
  interimResults: boolean
  lang: string
  start: () => void
  stop: () => void
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null
  onerror: (() => void) | null
  onend: (() => void) | null
}
type SpeechRecognitionConstructor = new () => SpeechRecognitionLike

export function Tools() {
  const tool = window.location.pathname.split('/').filter(Boolean).at(-1) || 'assistant'
  if (tool === 'inbox') return <Navigate to="/app/connections" replace />
  if (tool === 'groups') return <CustomGroups />
  return <DeckAI />
}

function DeckAI() {
  const { bundle, setNotice } = usePortfolio()
  const [messages, setMessages] = useState<Message[]>([])
  const [prompt, setPrompt] = useState('')
  const [listening, setListening] = useState(false)
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null)
  const reducedMotion = useReducedMotion()
  const [focused, setFocused] = useState(false)
  const [quickOpen, setQuickOpen] = useState(false)
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
  const endRef = useRef<HTMLDivElement>(null)
  useEffect(() => { endRef.current?.scrollIntoView?.({ block: 'nearest', behavior: 'instant' }) }, [messages])
  const suggestions = questionGroups[category]
  const send = (value = prompt) => {
    const question = value.trim(); if (!question || preparing || requestRef.current) return
    const query = stockQuery(question)
    setResearching(!!query)
    const run = ++generation.current
    const controller = new AbortController()
    requestRef.current = controller
    const remote = query ? researchAnswer(query, controller.signal).catch(error => ({ title: 'Stock lookup unavailable', text: error instanceof Error ? error.message : 'Please retry your search.' })) : null
    recognitionRef.current?.stop()
    setListening(false)
    setQuickOpen(false)
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
    recognitionRef.current?.stop()
    if (replyTimer.current !== null) clearTimeout(replyTimer.current)
  }, [])
  const toggleVoice = () => {
    if (listening) {
      recognitionRef.current?.stop()
      setListening(false)
      return
    }
    const speechWindow = window as Window & { SpeechRecognition?: SpeechRecognitionConstructor; webkitSpeechRecognition?: SpeechRecognitionConstructor }
    const Recognition = speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition
    if (!Recognition) {
      setNotice({ tone: 'info', message: 'Voice input is not supported in this browser. Type your question instead.' })
      return
    }
    const recognition = new Recognition()
    recognition.lang = 'en-AU'
    recognition.continuous = false
    recognition.interimResults = true
    recognition.onresult = (event) => setPrompt(Array.from(event.results).map((result) => result[0]?.transcript || '').join(''))
    recognition.onerror = () => { setListening(false); setNotice({ tone: 'error', message: 'Voice input stopped. Please try again or type your question.' }) }
    recognition.onend = () => { setListening(false); recognitionRef.current = null }
    recognitionRef.current = recognition
    setListening(true)
    try { recognition.start() } catch { setListening(false); recognitionRef.current = null; setNotice({ tone: 'error', message: 'Microphone could not start. Type your question or retry voice input.' }) }
  }
  return <div className="ai-workspace ai-engine">
    <h1 className="visually-hidden">Masterdeck AI portfolio assistant</h1>
    <div className="ai-titlebar"><div><strong>Masterdeck AI</strong><small>Portfolio insights & stock research</small></div><Button icon={Plus} onClick={() => { cancelReply(); recognitionRef.current?.stop(); setListening(false); setMessages([]); setPrompt(''); setQuickOpen(false) }}>New chat</Button></div>
    <div className="ai-conversation">
      {!messages.length ? <div className="ai-engine-welcome"><ThinkingOrb state={listening ? 'listening' : 'breathing'} size={64} paused={!!reducedMotion} aria-hidden="true"/><span className="section-label">A LITTLE MORE CLARITY</span><h2>Your next question.<br/><em>A clearer answer.</em></h2><p>Explore your investments or look up a company by name or ticker. Start with a question below.</p><div className="ai-question-tabs" aria-label="Question categories">{(Object.keys(questionGroups) as (keyof typeof questionGroups)[]).map(group => <button key={group} aria-pressed={category === group} onClick={() => setCategory(group)}>{group}</button>)}</div><div className="ai-suggestion-grid" key={category}>{suggestions.map((item, index) => <button key={item} onClick={() => send(item)}><small>0{index + 1}</small><span>{item}</span><ArrowUpRight size={17}/></button>)}</div></div> : <div className="ai-messages" role="log" aria-label="Portfolio conversation" aria-live="polite">{messages.map((message,index) => <div className={`ai-message ${message.role}`} key={index}><span>{message.role === 'assistant' ? <ThinkingOrb state="shaping" size={20} paused aria-hidden="true"/> : 'You'}</span><article>{message.answer && <h2>{message.answer.title}</h2>}<p>{message.text}</p>{message.answer?.metrics && <div className="ai-answer-metrics">{message.answer.metrics.map((metric, i) => <div key={`${metric.label}-${i}`}><small>{metric.label}</small><strong>{metric.value}</strong></div>)}</div>}{!!message.answer?.points?.length && <div className="ai-stock-chart"><span>Three-month price history · quoted currency</span><ResponsiveContainer width="100%" height={150}><AreaChart data={message.answer.points}><XAxis dataKey="date" tickFormatter={date => new Date(date).toLocaleDateString('en-AU', { month: 'short' })} minTickGap={50} axisLine={false} tickLine={false}/><Tooltip separator=": " labelFormatter={date => new Date(String(date)).toLocaleDateString('en-AU')} formatter={value => [Number(value).toFixed(2), 'Price']}/><Area type="monotone" dataKey="price" stroke="var(--green)" fill="var(--green)" fillOpacity={0.08} isAnimationActive={!reducedMotion}/></AreaChart></ResponsiveContainer></div>}{message.answer?.source && <a className="ai-source-link" href={message.answer.source.url} target="_blank" rel="noreferrer">{message.answer.source.label} · {message.answer.source.asOf ? new Date(message.answer.source.asOf).toLocaleString('en-AU') : 'Quote time unavailable'} · May be delayed<ArrowUpRight size={13}/></a>}{!!message.answer?.alternatives?.length && <div className="ai-alternatives"><small>Other matching listings</small>{message.answer.alternatives.map(item => <button key={item.symbol} disabled={preparing} onClick={() => send(`Look up ${item.symbol}`)}>{item.symbol} · {item.name}<ArrowUpRight size={12}/></button>)}</div>}{message.answer?.href && <Link to={message.answer.href}>{message.answer.link}<ArrowUpRight size={14}/></Link>}</article></div>)}<div role="status" className="ai-preparing" aria-live="polite">{preparing && <><ThinkingOrb state={researching ? 'searching' : 'solving'} size={64} paused={!!reducedMotion} aria-hidden="true"/><div><strong>Preparing your answer</strong><span>{researching ? 'Searching listings and loading market prices' : 'Calculating from your portfolio records'}</span></div></>}</div><div ref={endRef}/></div>}
    </div>
    <div className="ai-composer-area">
      {quickOpen && <div className="ai-quick-menu" id="portfolio-quick-actions">{suggestions.map(item => <button key={item} onClick={() => send(item)}>{item}<ArrowUpRight size={14}/></button>)}</div>}
      <BorderBeam size="md" colorVariant="ocean" strength={0.7} active={(focused || preparing) && !reducedMotion} theme="auto" borderRadius={20} className="ai-composer-beam">
        <form className="ai-source-compose" onFocus={() => setFocused(true)} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false) }} onSubmit={event => { event.preventDefault(); send() }}>
          <input value={prompt} maxLength={1000} onChange={event => setPrompt(event.target.value)} placeholder={listening ? 'Listening…' : 'Ask about your portfolio or look up a stock…'} aria-label="Ask Masterdeck AI"/>
          <div className="ai-compose-actions"><Liquid blur={5} contrast={18} fill="var(--surface-2)" className="ai-liquid-actions"><Liquid.Item x={0} transition={reducedMotion ? { duration: 0 } : 'snappy'}><button type="button" className="ai-round-action" aria-label="Quick questions" aria-expanded={quickOpen} aria-controls="portfolio-quick-actions" onClick={() => setQuickOpen(value => !value)}><Plus size={18}/></button></Liquid.Item><Liquid.Item x={quickOpen && !reducedMotion ? 12 : 0} transition={reducedMotion ? { duration: 0 } : 'snappy'}><button type="button" className={`ai-round-action ${listening ? 'is-listening' : ''}`} aria-label={listening ? 'Stop voice input' : 'Voice input'} aria-pressed={listening} onClick={toggleVoice}><Mic size={17}/></button></Liquid.Item></Liquid><span className="ai-record-label">{preparing ? 'Preparing answer…' : listening ? 'Listening' : 'Records + market data'}</span><MetalButtonEffect paused={!!reducedMotion || (!focused && !preparing)}>{preparing ? <button className="ai-send" type="button" aria-label="Stop response" onClick={cancelReply}><Square size={14} fill="currentColor"/></button> : <button className="ai-send" type="submit" aria-label="Send question" disabled={!prompt.trim()}><Send size={17}/></button>}</MetalButtonEffect></div>
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
