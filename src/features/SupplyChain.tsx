import { companyDisclosures, disclosureCompanies, companyLogoSymbol } from '../data/companyDisclosures'
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ExternalLink, Search } from 'lucide-react'
import { HoldingLogo } from '../components/HoldingLogo'
import { RelationshipNetwork, type RelationshipGraphNode, type RelationshipGraphLink } from '../components/RelationshipNetwork'
import { usePortfolio } from '../context/PortfolioContext'
import { supplyChainCompanies, supplyChainRelationships, inverseRelationshipType, relationshipSingular, type SupplyChainCompany, type RelationshipType } from '../data/supplyChain'
import { fetchSupplyChainNetwork, searchSupplyChainCompanies, type LiveSupplyChainNetwork } from '../lib/supplyChainApi'
import { isFund } from '../lib/assetType'

export function SupplyChain({ embedded = false, embeddedSymbol }: { embedded?: boolean; embeddedSymbol?: string } = {}) {
  const { symbol } = useParams()
  const navigate = useNavigate()
  const { bundle } = usePortfolio()
  const ticker = (embeddedSymbol || symbol || 'AAPL').toUpperCase()
  const [result, setResult] = useState<{ ticker: string; network: LiveSupplyChainNetwork | null; error: boolean } | null>(null)
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState<SupplyChainCompany[]>([])
  const [filter, setFilter] = useState<RelationshipType | 'all'>('all')
  const [showContext, setShowContext] = useState(false)
  const [view, setView] = useState<'list' | 'map'>('list')
  const [selected, setSelected] = useState<string | null>(null)
  const holding = bundle.holdings.find(item => item.symbol.toUpperCase() === ticker)
  const fund = holding ? isFund(holding) : isFund({ symbol: ticker, name: [...supplyChainCompanies, ...disclosureCompanies].find(item => item.ticker === ticker)?.name })
  useEffect(() => {
    if (fund) return
    const controller = new AbortController()
    fetchSupplyChainNetwork(ticker, controller.signal).then(network => { if (!controller.signal.aborted) setResult({ ticker, network, error: false }) }).catch(() => { if (!controller.signal.aborted) setResult({ ticker, network: null, error: true }) })
    return () => controller.abort()
  }, [ticker, fund])
  useEffect(() => {
    if (query.trim().length < 2) return
    const controller = new AbortController()
    const timer = window.setTimeout(() => {
      searchSupplyChainCompanies(query, controller.signal).then(items => { if (!controller.signal.aborted) setSuggestions(items) }).catch(() => { if (!controller.signal.aborted) setSuggestions([]) })
    }, 250)
    return () => { clearTimeout(timer); controller.abort() }
  }, [query])
  const network = result?.ticker === ticker ? result.network : null
  const loading = !fund && result?.ticker !== ticker
  const known = [...supplyChainCompanies, ...disclosureCompanies].find(item => item.ticker === ticker)
  const company: SupplyChainCompany = network?.company || known || { id: ticker, ticker, name: holding?.name || ticker, market: holding?.market || '', country: '', sector: '', description: '' }
  const companies = useMemo(() => new Map([...supplyChainCompanies, ...disclosureCompanies, ...(network?.companies || [])].map(item => [item.id, item])), [network])
  const entries = useMemo(() => {
    const relationships = [...(network?.relationships || []), ...companyDisclosures.filter(item => item.from === known?.id || item.to === known?.id).map(item => ({ ...item, from: item.from === known?.id ? company.id : item.from, to: item.to === known?.id ? company.id : item.to })), ...(showContext ? supplyChainRelationships.filter(item => item.from === known?.id || item.to === known?.id).map(item => ({ ...item, from: item.from === known?.id ? company.id : item.from, to: item.to === known?.id ? company.id : item.to, sourceKind: 'curated' as const })) : [])]
    const deduped = new Map<string, { company: SupplyChainCompany; relationship: typeof relationships[number]; type: RelationshipType }>()
    relationships.forEach(relationship => {
      const outgoing = relationship.from === company.id
      if (!outgoing && relationship.to !== company.id) return
      const other = companies.get(outgoing ? relationship.to : relationship.from)
      if (!other) return
      const type = outgoing ? relationship.type : inverseRelationshipType(relationship.type)
      const key = `${type}:${other.ticker || other.name}`
      if (!deduped.has(key)) deduped.set(key, { company: other, relationship, type })
    })
    return [...deduped.values()]
  }, [network, showContext, known, company.id, companies])
  const visible = entries.filter(item => filter === 'all' || item.type === filter)
  const selection = visible.find(item => item.relationship.id === selected)
  const candidates = [...new Map([...suggestions, ...supplyChainCompanies, ...disclosureCompanies].filter(item => !isFund({ symbol: item.ticker || '', name: item.name }) && `${item.ticker} ${item.name}`.toLowerCase().includes(query.toLowerCase())).map(item => [item.ticker || item.id, item])).values()].slice(0, 8)
  const choose = (item: SupplyChainCompany) => { if (!item.ticker) return; setQuery(''); setSelected(null); navigate(`/app/tools/supply-chain/${encodeURIComponent(item.ticker)}`) }
  const nodes: RelationshipGraphNode[] = [{ company, x: 450, y: 280, depth: 0 }, ...visible.map((item, index) => ({ company: item.company, relation: item.relationship, type: item.type, depth: 1 as const, x: index % 2 ? 740 : 160, y: 70 + Math.floor(index / 2) * 96 }))]
  const links: RelationshipGraphLink[] = nodes.slice(1).map(node => ({ id: node.relation!.id, relationId: node.relation!.id, from: { x: 450, y: 280 }, to: { x: node.x, y: node.y }, type: node.type!, depth: 1 }))
  if (fund) return embedded ? null : <section className="intelligence-page"><h1>Supply chain intelligence</h1><p>Company relationships do not apply to this fund. Open an individual company to explore its business relationships.</p><Link to="/app/tools/supply-chain/AAPL">Explore companies</Link></section>
  return <section className={`intelligence-page ${embedded ? 'is-embedded' : ''}`} id={embedded ? 'company-relationships' : undefined}>
    <header className="intelligence-heading"><div>{embedded ? <h2>Company relationships</h2> : <h1>Supply chain intelligence</h1>}<p>Understand the businesses behind this company, with sources you can inspect.</p></div>{embedded && <Link to={`/app/tools/supply-chain/${ticker}`}>Open explorer <ExternalLink size={13}/></Link>}</header>
    {!embedded && <div className="intelligence-search"><Search size={16}/><input aria-label="Search companies" value={query} onChange={event => setQuery(event.target.value)} onKeyDown={event => { if (event.key === 'Enter' && candidates[0]) choose(candidates[0]); if (event.key === 'Escape') setQuery('') }} placeholder="Search company or ticker…"/>{query && <div className="intelligence-suggestions">{candidates.length ? candidates.map(item => <button key={item.id} onClick={() => choose(item)}><HoldingLogo symbol={companyLogoSymbol(item)}/><span>{item.name}</span><small>{item.ticker}</small></button>) : <p>No companies found.</p>}</div>}</div>}
    <div className="intelligence-company"><HoldingLogo symbol={ticker} size={38}/><div><h2>{company.name}</h2><span>{ticker}{company.market ? ` · ${company.market}` : ''}</span></div><div className="intelligence-source">{loading ? 'Loading latest filing…' : network ? <><span>{network.filing.form} · {network.filing.filedAt}</span><a href={network.filing.url} target="_blank" rel="noreferrer">Read filing <ExternalLink size={12}/></a></> : <span>Filing data unavailable</span>}</div></div>
    <div className="intelligence-controls"><div className="intelligence-filters" role="group" aria-label="Relationship filters">{(['all', 'supplier', 'customer', 'competitor', 'partner'] as const).map(type => <button key={type} aria-pressed={filter === type} onClick={() => { setFilter(type); setSelected(null) }}>{type === 'all' ? 'All' : `${relationshipSingular[type]}s`} <span>{entries.filter(item => type === 'all' || item.type === type).length}</span></button>)}</div><div className="intelligence-view">{(['list', 'map'] as const).map(item => <button key={item} aria-pressed={view === item} onClick={() => setView(item)}>{item === 'list' ? 'List' : 'Map'}</button>)}</div></div>
    <p className="intelligence-coverage">{entries.filter(item => item.relationship.sourceKind !== 'curated').length} sourced connections · Annual filings and dated company disclosures. Select a company to inspect its evidence.</p>
    <label className="intelligence-context"><input type="checkbox" checked={showContext} onChange={event => setShowContext(event.target.checked)}/>Include curated background <span>Not verified from the latest filing</span></label>
    {!visible.length ? <div className="intelligence-empty"><h3>{loading ? 'Reading company relationships…' : 'No sourced relationships available'}</h3><p>{loading ? 'The latest available annual filing is being checked.' : 'Try another company or include clearly labelled curated background. Absence from this view does not mean a relationship does not exist.'}</p></div> : view === 'map' ? <RelationshipNetwork activeCompany={company} nodes={nodes} links={links} selectedRelationshipId={selected} onSelectRelationship={setSelected} onOpenCompany={choose}/> : <div className="intelligence-list">{visible.map(item => <button key={item.relationship.id} className={selected === item.relationship.id ? 'selected' : ''} onClick={() => setSelected(selected === item.relationship.id ? null : item.relationship.id)} aria-expanded={selected === item.relationship.id}><HoldingLogo symbol={companyLogoSymbol(item.company)} size={30}/><span><strong>{item.company.name}</strong><small>{item.company.ticker || 'Private company'}</small></span><span className="intelligence-type">{relationshipSingular[item.type]}</span><span className={`intelligence-evidence ${item.relationship.sourceKind !== 'curated' ? 'verified' : ''}`}>{item.relationship.sourceKind === 'live-sec' ? 'Filing' : item.relationship.sourceKind === 'company-disclosure' ? 'Disclosure' : 'Background'}</span></button>)}</div>}
    {selection && <article className="intelligence-detail" aria-label="Selected relationship evidence"><h3>{selection.company.name}</h3>{selection.company.ticker && <button onClick={() => choose(selection.company)}>Explore {selection.company.name}</button>}<p>{selection.relationship.note}</p><span>{selection.relationship.source} · {selection.relationship.updated}</span>{selection.relationship.sourceUrl && <a href={selection.relationship.sourceUrl} target="_blank" rel="noreferrer">Inspect source <ExternalLink size={13}/></a>}</article>}
  </section>
}
