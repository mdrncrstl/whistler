export function isFund(holding: { asset_class?: string | null; name?: string | null; symbol: string }) {
  return /\betf\b|\bfund\b|exchange.traded|index trust/i.test(`${holding.asset_class || ''} ${holding.name || ''}`) || ['VAS', 'VGS', 'GDX', 'GOLD', 'IAF', 'IEM', 'IJP', 'IOO'].includes(holding.symbol.toUpperCase())
}
