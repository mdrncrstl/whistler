import { companyLogoSymbol } from '../data/companyDisclosures'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Building2, Factory, Handshake, Maximize2, Minus, MousePointer2, Plus, ShoppingCart, Swords, type LucideIcon } from 'lucide-react'
import { useCallback, useEffect, useRef, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react'
import { relationshipSingular, type RelationshipType, type SupplyChainCompany, type SupplyChainRelationship } from '../data/supplyChain'
import { HoldingLogo } from './HoldingLogo'

export interface RelationshipGraphNode {
  company: SupplyChainCompany
  depth: 0 | 1 | 2
  type?: RelationshipType
  relation?: SupplyChainRelationship
  x: number
  y: number
}

export interface RelationshipGraphLink {
  id: string
  relationId?: string
  from: { x: number; y: number }
  to: { x: number; y: number }
  type: RelationshipType
  depth: 1 | 2
}

interface RelationshipNetworkProps {
  activeCompany: SupplyChainCompany
  nodes: RelationshipGraphNode[]
  links: RelationshipGraphLink[]
  selectedRelationshipId: string | null
  onSelectRelationship: (relationshipId: string | null) => void
  onOpenCompany: (company: SupplyChainCompany) => void
  emptyState?: React.ReactNode
}

const WORLD_WIDTH = 900

const relationIcons: Record<RelationshipType, LucideIcon> = {
  supplier: Factory,
  customer: ShoppingCart,
  competitor: Swords,
  partner: Handshake,
}

function linkPath(link: RelationshipGraphLink) {
  const horizontal = link.type === 'supplier' || link.type === 'customer'
  if (horizontal) {
    const bend = Math.max(54, Math.abs(link.to.x - link.from.x) * 0.46)
    const direction = link.to.x >= link.from.x ? 1 : -1
    return `M ${link.from.x} ${link.from.y} C ${link.from.x + bend * direction} ${link.from.y}, ${link.to.x - bend * direction} ${link.to.y}, ${link.to.x} ${link.to.y}`
  }
  const bend = Math.max(48, Math.abs(link.to.y - link.from.y) * 0.44)
  const direction = link.to.y >= link.from.y ? 1 : -1
  return `M ${link.from.x} ${link.from.y} C ${link.from.x} ${link.from.y + bend * direction}, ${link.to.x} ${link.to.y - bend * direction}, ${link.to.x} ${link.to.y}`
}

export function RelationshipNetwork({ activeCompany, nodes, links, selectedRelationshipId, onSelectRelationship, onOpenCompany, emptyState }: RelationshipNetworkProps) {
  const WORLD_HEIGHT = Math.max(560, ...nodes.map(node => node.y + 70))
  const reduceMotion = useReducedMotion()
  const canvasRef = useRef<HTMLDivElement>(null)
  const worldRef = useRef<HTMLDivElement>(null)
  const zoomLabelRef = useRef<HTMLSpanElement>(null)
  const cameraRef = useRef({ x: 0, y: 0, scale: 1 })
  const dragRef = useRef<{ pointerId: number; originX: number; originY: number; cameraX: number; cameraY: number } | null>(null)

  const applyCamera = useCallback((next: { x: number; y: number; scale: number }) => {
    const scale = Math.min(1.8, Math.max(0.48, next.scale))
    cameraRef.current = { ...next, scale }
    if (worldRef.current) worldRef.current.style.transform = `translate3d(${next.x}px, ${next.y}px, 0) scale(${scale})`
    if (zoomLabelRef.current) zoomLabelRef.current.textContent = `${Math.round(scale * 100)}%`
  }, [])

  const fitGraph = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const scale = Math.min(1.12, Math.max(0.55, Math.min((canvas.clientWidth - 32) / WORLD_WIDTH, (canvas.clientHeight - 32) / WORLD_HEIGHT)))
    applyCamera({ x: (canvas.clientWidth - WORLD_WIDTH * scale) / 2, y: (canvas.clientHeight - WORLD_HEIGHT * scale) / 2, scale })
  }, [applyCamera, WORLD_HEIGHT])

  const zoomBy = useCallback((factor: number) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const current = cameraRef.current
    const nextScale = Math.min(1.8, Math.max(0.48, current.scale * factor))
    const centreX = canvas.clientWidth / 2
    const centreY = canvas.clientHeight / 2
    const worldX = (centreX - current.x) / current.scale
    const worldY = (centreY - current.y) / current.scale
    applyCamera({ x: centreX - worldX * nextScale, y: centreY - worldY * nextScale, scale: nextScale })
  }, [applyCamera])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    fitGraph()
    const observer = new ResizeObserver(fitGraph)
    observer.observe(canvas)
    const onWheel = (event: WheelEvent) => {
      event.preventDefault()
      const bounds = canvas.getBoundingClientRect()
      const current = cameraRef.current
      const pointerX = event.clientX - bounds.left
      const pointerY = event.clientY - bounds.top
      const nextScale = Math.min(1.8, Math.max(0.48, current.scale * (event.deltaY > 0 ? 0.92 : 1.08)))
      const worldX = (pointerX - current.x) / current.scale
      const worldY = (pointerY - current.y) / current.scale
      applyCamera({ x: pointerX - worldX * nextScale, y: pointerY - worldY * nextScale, scale: nextScale })
    }
    canvas.addEventListener('wheel', onWheel, { passive: false })
    return () => { observer.disconnect(); canvas.removeEventListener('wheel', onWheel) }
  }, [applyCamera, fitGraph])

  useEffect(() => { fitGraph() }, [fitGraph, nodes.length, activeCompany.id])

  const startPan = (event: ReactPointerEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest('button, a')) return
    dragRef.current = { pointerId: event.pointerId, originX: event.clientX, originY: event.clientY, cameraX: cameraRef.current.x, cameraY: cameraRef.current.y }
    event.currentTarget.setPointerCapture(event.pointerId)
    event.currentTarget.classList.add('is-panning')
  }
  const movePan = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    applyCamera({ x: drag.cameraX + event.clientX - drag.originX, y: drag.cameraY + event.clientY - drag.originY, scale: cameraRef.current.scale })
  }
  const endPan = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (dragRef.current?.pointerId !== event.pointerId) return
    dragRef.current = null
    event.currentTarget.classList.remove('is-panning')
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
  }

  return <div className="relationship-network-shell">
    <div className="relationship-network-controls" role="toolbar" aria-label="Relationship map controls">
      <button type="button" onClick={fitGraph}><Maximize2 size={14} /> Fit graph</button>
      <span className="relationship-network-control-divider" aria-hidden="true" />
      <button type="button" aria-label="Zoom out" onClick={() => zoomBy(0.86)}><Minus size={14} /></button>
      <span ref={zoomLabelRef} className="relationship-network-zoom">100%</span>
      <button type="button" aria-label="Zoom in" onClick={() => zoomBy(1.16)}><Plus size={14} /></button>
    </div>
    <div ref={canvasRef} className="relationship-network-canvas" aria-label={`Relationship map for ${activeCompany.name}`} onPointerDown={startPan} onPointerMove={movePan} onPointerUp={endPan} onPointerCancel={endPan}>
      <div ref={worldRef} className="relationship-network-world" style={{ width: WORLD_WIDTH, height: WORLD_HEIGHT }}>
        <svg className="relationship-network-links" viewBox={`0 0 ${WORLD_WIDTH} ${WORLD_HEIGHT}`} aria-hidden="true">
          <defs>
            <marker id="relationship-arrow" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><path d="M0,0 L7,3.5 L0,7 Z" /></marker>
          </defs>
          {links.map((link) => <motion.path key={link.id} d={linkPath(link)} className={`relationship-network-link link-${link.type} ${link.relationId === selectedRelationshipId ? 'is-selected' : ''} ${link.depth === 2 ? 'is-secondary' : ''}`} markerEnd={link.type === 'supplier' || link.type === 'customer' ? 'url(#relationship-arrow)' : undefined} initial={reduceMotion ? false : { pathLength: 0, opacity: 0 }} animate={{ pathLength: 1, opacity: link.depth === 2 ? 0.32 : 1 }} transition={{ duration: reduceMotion ? 0 : 0.32, ease: [0.23, 1, 0.32, 1] }} />)}
        </svg>
        <AnimatePresence initial={false}>{nodes.map((node) => {
          const Icon = node.depth === 0 ? Building2 : relationIcons[node.type!]
          const selected = Boolean(node.relation && node.relation.id === selectedRelationshipId)
          const style = { left: node.x, top: node.y } as CSSProperties
          return <motion.button key={`${activeCompany.id}-${node.depth}-${node.company.id}`} type="button" className={`relationship-network-node ${node.depth === 0 ? 'is-central' : ''} ${node.depth === 2 ? 'is-secondary' : ''} ${selected ? 'is-selected' : ''}`} style={style} initial={reduceMotion ? false : { opacity: 0, scale: 0.94 }} animate={{ opacity: node.depth === 2 ? 0.72 : 1, scale: 1 }} exit={reduceMotion ? undefined : { opacity: 0, scale: 0.96 }} transition={{ duration: reduceMotion ? 0 : 0.18, ease: 'easeOut' }} transformTemplate={(_, generatedTransform) => `translate(-50%, -50%) ${generatedTransform}`} onClick={() => node.relation ? onSelectRelationship(node.relation.id) : undefined} onDoubleClick={() => node.depth > 0 && onOpenCompany(node.company)} aria-pressed={selected || undefined} aria-label={node.depth === 0 ? `${activeCompany.name}, active company` : `${node.company.name}, ${relationshipSingular[node.type!]}. Select for evidence; double-click to open its network.`}>
            <span className="relationship-network-node-mark">{companyLogoSymbol(node.company) ? <HoldingLogo symbol={companyLogoSymbol(node.company)} size={28}/> : <Icon size={node.depth === 0 ? 18 : 14} />}</span>
            <span className="relationship-network-node-copy"><strong>{node.company.name}</strong><small>{node.company.ticker || 'Private'}{node.depth > 0 ? ` / ${relationshipSingular[node.type!]}` : ' / Active company'}</small></span>
            {node.relation?.sourceKind && node.relation.sourceKind !== 'curated' && <span className="relationship-network-evidence">{node.relation.sourceKind === 'live-sec' ? 'Filing' : 'Source'}</span>}
          </motion.button>
        })}</AnimatePresence>
      </div>
      {emptyState}
      <div className="relationship-network-instruction"><MousePointer2 size={13} /><span>Click to inspect</span><span>Double-click to re-centre</span><span>Drag to pan</span></div>
    </div>
  </div>
}
