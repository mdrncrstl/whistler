import { useState } from 'react'

const logoDomains: Record<string, string> = {
  AAPL: 'apple.com', AMZN: 'amazon.com', MSFT: 'microsoft.com', NVDA: 'nvidia.com',
  BHP: 'bhp.com', CBA: 'commbank.com.au', VAS: 'vanguard.com.au', VGS: 'vanguard.com.au',
  UBER: 'uber.com', GDX: 'vaneck.com.au', GOLD: 'globalxetfs.com.au',
  IAF: 'ishares.com.au', IEM: 'ishares.com.au', IJP: 'ishares.com.au', IOO: 'ishares.com.au',
}

const logoSources: Record<string, string> = {
  AAPL: '/holding-logos/apple.ico', AMZN: '/holding-logos/amazon.ico', MSFT: '/holding-logos/microsoft.ico', NVDA: '/holding-logos/nvidia.ico',
  BHP: '/holding-logos/bhp.svg', CBA: '/holding-logos/commbank.ico',
  VAS: '/holding-logos/vanguard.png', VGS: '/holding-logos/vanguard.png',
}

export function HoldingLogo({ symbol, size = 26 }: { symbol: string; size?: number }) {
  const [failed, setFailed] = useState(false)
  const normalized = symbol.toUpperCase()
  const domain = logoDomains[normalized]
  const source = logoSources[normalized] || (domain ? `https://${domain}/favicon.ico` : '')
  if (!source || failed) return <span className="holding-logo holding-logo-fallback" style={{ width: size, height: size }} aria-hidden="true">{normalized.slice(0, 1)}</span>
  return <span className="holding-logo" style={{ width: size, height: size }} aria-hidden="true"><img src={source} alt="" onError={() => setFailed(true)} /></span>
}
