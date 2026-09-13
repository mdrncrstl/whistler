import { Fragment, useEffect, useRef, useState } from 'react'
import { ArrowUpRight, ChevronDown } from 'lucide-react'
import { marketingGroups, marketingPages } from '../lib/marketingPages'

export function MarketingNavigation({ mobile = false, onNavigate }: { mobile?: boolean; onNavigate?: () => void }) {
  const [open, setOpen] = useState<string | null>(null)
  const root = useRef<HTMLDivElement>(null)
  const closeTimer = useRef(0)
  const corridor = useRef<{ x: number; y: number; left: number; right: number; bottom: number; until: number } | null>(null)
  const inTriangle = (x: number, y: number) => {
    const c = corridor.current
    if (!c || Date.now() > c.until) return false
    const t = (y - c.y) / (c.bottom - c.y)
    return t >= 0 && t <= 1 && x >= c.x + (c.left - c.x) * t - 8 && x <= c.x + (c.right - c.x) * t + 8
  }
  const cancelClose = () => { window.clearTimeout(closeTimer.current); corridor.current = null }
  useEffect(() => {
    const outside = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) { setOpen(null); corridor.current = null } }
    const move = (event: PointerEvent) => {
      if (inTriangle(event.clientX, event.clientY)) {
        window.clearTimeout(closeTimer.current)
        closeTimer.current = window.setTimeout(() => setOpen(null), 350)
      }
    }
    document.addEventListener('pointerdown', outside)
    document.addEventListener('pointermove', move)
    return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('pointermove', move) }
  }, [])
  useEffect(() => () => window.clearTimeout(closeTimer.current), [])

  // A fine pointer opens the panel on hover, the way the rest of the category is used.
  // Touch and keyboard keep the click/Enter path, so nothing depends on hover alone.
  const hoverCapable = () => !mobile && typeof window !== 'undefined' && window.matchMedia('(hover: hover) and (pointer: fine)').matches
  const hoverClose = () => { if (!hoverCapable()) return; window.clearTimeout(closeTimer.current); closeTimer.current = window.setTimeout(() => setOpen(null), 350) }
  return <div className={`md-site-menu ${mobile ? 'is-mobile' : ''}`} ref={root} onKeyDown={event => {
    if (event.key === 'Escape' && open) { event.stopPropagation(); cancelClose(); setOpen(null); root.current?.querySelector<HTMLButtonElement>(`button[data-group="${open}"]`)?.focus() }
  }} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(null) }}
    >
      {marketingGroups.map(group => <Fragment key={group}>
        {group === 'Company' && <a className="md-pricing-link" href="/pricing" onClick={onNavigate}>Pricing</a>}
        <div className="md-menu-group" onPointerLeave={hoverClose}>
        <button data-group={group} aria-expanded={open === group} aria-controls={`${mobile ? 'mobile' : 'desktop'}-${group.replaceAll(' ','-')}`}
          onPointerEnter={event => { if (event.pointerType === 'mouse' && hoverCapable() && !inTriangle(event.clientX, event.clientY)) { cancelClose(); setOpen(group) } }}
          onPointerLeave={event => {
            if (!hoverCapable() || open !== group) return
            const panel = event.currentTarget.parentElement?.querySelector('.md-menu-panel')?.getBoundingClientRect()
            if (panel && event.clientY <= panel.top) corridor.current = { x: event.clientX, y: event.clientY - 4, left: panel.left - 8, right: panel.right + 8, bottom: panel.top + 24, until: Date.now() + 1500 }
            hoverClose()
          }}
          onKeyDown={event => { if (event.key === 'ArrowDown') { event.preventDefault(); cancelClose(); setOpen(group); requestAnimationFrame(() => root.current?.querySelector<HTMLAnchorElement>('.md-menu-panel a')?.focus()) } }}
          onClick={event => { cancelClose(); setOpen(hoverCapable() && event.detail > 0 ? group : open === group ? null : group) }}>{group}<ChevronDown size={14} aria-hidden="true"/></button>
      {open === group && <div className="md-menu-panel" onPointerEnter={cancelClose} onFocus={cancelClose} id={`${mobile ? 'mobile' : 'desktop'}-${group.replaceAll(' ','-')}`}>
        <div className="md-menu-links">{marketingPages.filter(page => page.group === group).map(page => <a key={page.path} href={page.path} onClick={() => { cancelClose(); setOpen(null); onNavigate?.() }}><span><strong>{page.label}</strong><small>{page.description}</small></span><ArrowUpRight size={16} aria-hidden="true"/></a>)}</div>
      </div>}
    </div></Fragment>)}
  </div>
}
