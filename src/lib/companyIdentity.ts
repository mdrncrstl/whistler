const companyDomains: Record<string, string> = {
  AAPL: 'apple.com', AMZN: 'amazon.com', MSFT: 'microsoft.com', NVDA: 'nvidia.com',
  BHP: 'bhp.com', CBA: 'commbank.com.au', VAS: 'vanguard.com.au', VGS: 'vanguard.com.au',
  UBER: 'uber.com', GDX: 'vaneck.com.au', GOLD: 'globalxetfs.com.au',
  IAF: 'ishares.com.au', IEM: 'ishares.com.au', IJP: 'ishares.com.au', IOO: 'ishares.com.au',
  TSM: 'tsmc.com', AVGO: 'broadcom.com', SONY: 'sony.com', QCOM: 'qualcomm.com',
  GOOGL: 'google.com', GOOG: 'google.com', BBY: 'bestbuy.com', WMT: 'walmart.com',
  AMKR: 'amkor.com', GLW: 'corning.com', CRUS: 'cirrus.com', GFS: 'gf.com', TXN: 'ti.com', AMAT: 'appliedmaterials.com', COHR: 'coherent.com', '005930': 'samsung.com',
  AMD: 'amd.com', INTC: 'intel.com', MU: 'micron.com', AXT: 'axt.com', HIMS: 'hims.com',
  META: 'meta.com', NFLX: 'netflix.com', TSLA: 'tesla.com',
}

export function normaliseCompanySymbol(symbol: string) {
  return symbol.toUpperCase().replace(/^(ASX|NASDAQ|NYSE):/, '').replace(/\.(AX|AU)$/, '')
}

export function companyDomainForSymbol(symbol: string, market?: string | null) {
  const normalized = normaliseCompanySymbol(symbol)
  const exchangeKey = market?.trim().toUpperCase() === 'ASX' ? `${normalized}.AX` : normalized
  return companyDomains[exchangeKey] || companyDomains[normalized] || ''
}

export function companyUrlForSymbol(symbol: string, market?: string | null) {
  const domain = companyDomainForSymbol(symbol, market)
  return domain ? `https://${domain}/` : undefined
}
