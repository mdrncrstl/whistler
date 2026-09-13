import { BarChart3, BriefcaseBusiness, CircleDollarSign, Landmark, Layers3, type LucideIcon } from 'lucide-react'
import { useState } from 'react'
import { companyDomainForSymbol, normaliseCompanySymbol } from '../lib/companyIdentity'

function fallbackIconFor(symbol: string, assetClass?: string | null): LucideIcon {
  const normalizedClass = assetClass?.toLowerCase() || ''
  if (normalizedClass.includes('cash') || normalizedClass.includes('currency') || normalizedClass.includes('fixed')) return CircleDollarSign
  if (normalizedClass.includes('fund') || normalizedClass.includes('etf')) return Layers3
  if (normalizedClass.includes('property') || normalizedClass.includes('real')) return Landmark
  if (symbol === 'CASH' || symbol === 'AUD' || symbol === 'USD') return CircleDollarSign
  if (normalizedClass.includes('share') || normalizedClass.includes('equity') || normalizedClass.includes('stock')) return BarChart3
  return BriefcaseBusiness
}

function FallbackMark({ icon: Icon, size }: { icon: LucideIcon; size: number }) {
  return <Icon size={Math.max(13, Math.round(size * .52))} strokeWidth={1.8} />
}

function faviconSources(domain: string) {
  const logoDevKey = import.meta.env.VITE_LOGO_DEV_PUBLIC_KEY?.trim()
  return [
    ...(logoDevKey ? [`https://img.logo.dev/${encodeURIComponent(domain)}?token=${encodeURIComponent(logoDevKey)}&size=128&format=png&retina=true&fallback=404`] : []),
    `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=128`,
  ]
}

export function HoldingLogo({ symbol, assetClass, market, size = 26, href }: { symbol: string; assetClass?: string | null; market?: string | null; size?: number; href?: string }) {
  const [sourceState, setSourceState] = useState({ key: '', index: 0 })
  const normalized = normaliseCompanySymbol(symbol)
  const domain = companyDomainForSymbol(normalized, market)
  const sources = domain ? faviconSources(domain) : []
  const sourceKey = `${normalized}:${domain}`
  const sourceIndex = sourceState.key === sourceKey ? sourceState.index : 0
  const source = sources[sourceIndex] || ''
  const FallbackIcon = fallbackIconFor(normalized, assetClass)
  const mark = !source
    ? <FallbackMark icon={FallbackIcon} size={size} />
    : <img src={source} alt="" onError={() => setSourceState((current) => ({ key: sourceKey, index: Math.min((current.key === sourceKey ? current.index : 0) + 1, sources.length) }))} />
  if (href) return <a className="holding-logo holding-logo-link" data-symbol={normalized} style={{ width: size, height: size }} href={href} target="_blank" rel="noreferrer" aria-label={`Open ${normalized} company website`}>{mark}</a>
  return <span className={`holding-logo ${!source ? 'holding-logo-fallback' : ''}`} data-symbol={normalized} style={{ width: size, height: size }} aria-hidden="true">{mark}</span>
}
