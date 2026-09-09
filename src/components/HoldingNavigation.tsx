import { type KeyboardEvent, type MouseEvent, type ReactNode } from 'react'
import { Link, useInRouterContext, useNavigate } from 'react-router-dom'

const ignoredSymbols = new Set(['', 'CASH'])
const interactiveSelector = 'a, button, input, select, textarea, label, [role="button"]'

function canOpenHolding(symbol?: string | null) {
  return !ignoredSymbols.has(String(symbol || '').trim().toUpperCase())
}

function holdingPath(symbol: string) {
  return `/app/holdings/${encodeURIComponent(symbol.trim().toUpperCase())}`
}

function startedFromInteractiveControl(target: EventTarget | null) {
  return target instanceof Element && Boolean(target.closest(interactiveSelector))
}

export function HoldingNavigationRow({ symbol, children, className = '' }: { symbol?: string | null; children: ReactNode; className?: string }) {
  const inRouter = useInRouterContext()
  if (!inRouter) return <tr className={className}>{children}</tr>
  return <RoutedHoldingNavigationRow symbol={symbol} className={className}>{children}</RoutedHoldingNavigationRow>
}

function RoutedHoldingNavigationRow({ symbol, children, className = '' }: { symbol?: string | null; children: ReactNode; className?: string }) {
  const navigate = useNavigate()
  const enabled = canOpenHolding(symbol)
  const open = () => enabled && navigate(holdingPath(String(symbol)))
  const onClick = (event: MouseEvent<HTMLTableRowElement>) => {
    if (!startedFromInteractiveControl(event.target)) open()
  }
  const onKeyDown = (event: KeyboardEvent<HTMLTableRowElement>) => {
    if (startedFromInteractiveControl(event.target) || !['Enter', ' '].includes(event.key)) return
    event.preventDefault()
    open()
  }

  return <tr className={`${className} ${enabled ? 'holding-navigation-row' : ''}`.trim()} tabIndex={enabled ? 0 : undefined} aria-label={enabled ? `Open ${String(symbol).toUpperCase()} holding` : undefined} onClick={onClick} onKeyDown={onKeyDown}>{children}</tr>
}

export function HoldingNavigationItem({ symbol, children, className = '' }: { symbol?: string | null; children: ReactNode; className?: string }) {
  const inRouter = useInRouterContext()
  if (!canOpenHolding(symbol)) return <div className={className}>{children}</div>
  if (!inRouter) return <div className={className}>{children}</div>
  return <Link className={`${className} holding-navigation-item`.trim()} to={holdingPath(String(symbol))} aria-label={`Open ${String(symbol).toUpperCase()} holding`}>{children}</Link>
}
