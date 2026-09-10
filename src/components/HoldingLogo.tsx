import { BarChart3, BriefcaseBusiness, CircleDollarSign, Landmark, Layers3, type LucideIcon } from 'lucide-react'
import { useState } from 'react'

const logoDomains: Record<string, string> = {
  AAPL: 'apple.com', AMZN: 'amazon.com', MSFT: 'microsoft.com', NVDA: 'nvidia.com',
  BHP: 'bhp.com', CBA: 'commbank.com.au', VAS: 'vanguard.com.au', VGS: 'vanguard.com.au',
  UBER: 'uber.com', GDX: 'vaneck.com.au', GOLD: 'globalxetfs.com.au',
  IAF: 'ishares.com.au', IEM: 'ishares.com.au', IJP: 'ishares.com.au', IOO: 'ishares.com.au',
  TSM: 'tsmc.com', AVGO: 'broadcom.com', SONY: 'sony.com', QCOM: 'qualcomm.com',
  GOOGL: 'google.com', GOOG: 'google.com', BBY: 'bestbuy.com', WMT: 'walmart.com',
  AMKR: 'amkor.com', GLW: 'corning.com', CRUS: 'cirrus.com', GFS: 'gf.com', TXN: 'ti.com', AMAT: 'appliedmaterials.com', COHR: 'coherent.com', '005930': 'samsung.com',
  AMD: 'amd.com', INTC: 'intel.com', MU: 'micron.com', AXT: 'axt.com',
}

const logoSources: Record<string, string> = {
  AVGO: '/holding-logos/avgo.png', '005930': '/holding-logos/samsung.png', QCOM: '/holding-logos/qcom.png', GFS: '/holding-logos/gfs.png', AMAT: '/holding-logos/amat.png',
  GOOGL: '/holding-logos/googl.ico',
  GOOG: '/holding-logos/goog.ico',
  BBY: '/holding-logos/bby.ico',
  WMT: '/holding-logos/wmt.ico',
  INTC: '/holding-logos/intc.ico',
  MU: '/holding-logos/mu.ico',
  UBER: '/holding-logos/uber.ico',
  GDX: '/holding-logos/gdx.ico',
  GOLD: '/holding-logos/gold.ico',
  AAPL: '/holding-logos/apple.ico', AMZN: '/holding-logos/amazon.ico', MSFT: '/holding-logos/microsoft.ico', NVDA: '/holding-logos/nvidia.ico',
  BHP: '/holding-logos/bhp.svg', CBA: '/holding-logos/commbank.ico',
  VAS: '/holding-logos/vanguard.png', VGS: '/holding-logos/vanguard.png',
}

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

export function HoldingLogo({ symbol, assetClass, size = 26 }: { symbol: string; assetClass?: string | null; size?: number }) {
  const [failedSource, setFailedSource] = useState('')
  const normalized = symbol.toUpperCase().replace(/^(ASX|NASDAQ|NYSE):/, '').replace(/\.(AX|AU)$/, '')
  const domain = logoDomains[normalized]
  const source = logoSources[normalized] || (domain ? `https://${domain}/favicon.ico` : '')
  const FallbackIcon = fallbackIconFor(normalized, assetClass)
  const isVanguardWordmark = normalized === 'VAS' || normalized === 'VGS'
  if (!source || failedSource === source) return <span className="holding-logo holding-logo-fallback" style={{ width: size, height: size }} aria-hidden="true"><FallbackMark icon={FallbackIcon} size={size} /></span>
  return <span className="holding-logo" data-symbol={normalized} style={{ width: size, height: size }} aria-hidden="true"><img className={isVanguardWordmark ? 'holding-logo-vanguard' : undefined} src={source} alt="" onError={() => setFailedSource(source)} /></span>
}
