import { useEffect, useRef, useState } from 'react'
import { ArrowUpRight, ChevronDown } from 'lucide-react'
import { marketingGroups, marketingPages } from '../lib/marketingPages'

export function MarketingNavigation({ mobile = false, onNavigate }: { mobile?: boolean; onNavigate?: () => void }) {
  const [open, setOpen] = useState<string | null>(null)
  const root = useRef<HTMLDivElement>(null)
  const closeTimer = useRef(0)
  useEffect(() => {
    const outside = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(null) }
    document.addEventListener('pointerdown', outside)
    return () => document.removeEventListener('pointerdown', outside)
  }, [])
  useEffect(() => () => window.clearTimeout(closeTimer.current), [])

  // A fine pointer opens the panel on hover, the way the rest of the category is used.
  // Touch and keyboard keep the click/Enter path, so nothing depends on hover alone.
  const hoverCapable = () => !mobile && typeof window !== 'undefined' && window.matchMedia('(hover: hover) and (pointer: fine)').matches
  const hoverOpen = (group: string) => { if (!hoverCapable()) return; window.clearTimeout(closeTimer.current); setOpen(group) }
  const hoverClose = () => { if (!hoverCapable()) return; closeTimer.current = window.setTimeout(() => setOpen(null), 140) }
  return <div className={`md-site-menu ${mobile ? 'is-mobile' : ''}`} ref={root} onKeyDown={event => {
    if (event.key === 'Escape') { setOpen(null); root.current?.querySelector<HTMLButtonElement>(`button[data-group="${open}"]`)?.focus() }
  }} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(null) }}
    onPointerLeave={hoverClose} onPointerEnter={() => window.clearTimeout(closeTimer.current)}>
    {marketingGroups.map(group => <div className="md-menu-group" key={group} onPointerEnter={() => hoverOpen(group)}>
      {group === 'Company' && <a className="md-pricing-link" href="/pricing" onClick={onNavigate}>Pricing</a>}
      <button data-group={group} aria-expanded={open === group} aria-controls={`${mobile ? 'mobile' : 'desktop'}-${group.replaceAll(' ','-')}`} onClick={() => setOpen(open === group ? null : group)}>{group}<ChevronDown size={14}/></button>
      {open === group && <div className="md-menu-panel" id={`${mobile ? 'mobile' : 'desktop'}-${group.replaceAll(' ','-')}`}>
        <div className="md-menu-links">{marketingPages.filter(page => page.group === group).map(page => <a key={page.path} href={page.path} onClick={() => { setOpen(null); onNavigate?.() }}><span><strong>{page.label}</strong><small>{page.description}</small></span><ArrowUpRight size={16}/></a>)}</div>
      </div>}
    </div>)}
  </div>
}
