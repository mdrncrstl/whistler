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

const logoExchangeSuffix: Record<string, string> = {
  ASX: '.AX',
  AU: '.AX',
  TSX: '.TO',
  TSXV: '.V',
  LSE: '.L',
  AMS: '.AS',
  EURONEXT: '.AS',
  XETRA: '.DE',
  FRA: '.F',
  HKEX: '.HK',
  HKG: '.HK',
  TSE: '.T',
  JPX: '.T',
  NSE: '.NS',
  BSE: '.BO',
}

const exchangePrefix = /^(ASX|NASDAQ|NYSE|NYSEARCA|ARCA|TSX|TSXV|LSE|AMS|EURONEXT|XETRA|FRA|HKEX|HKG|TSE|JPX|NSE|BSE):/
const knownTickerSuffix = /\.(AX|AU|TO|V|L|AS|DE|F|HK|T|NS|BO)$/

export function normaliseCompanySymbol(symbol: string) {
  return symbol.toUpperCase().replace(/^(ASX|NASDAQ|NYSE):/, '').replace(/\.(AX|AU)$/, '')
}

/**
 * Returns the ticker format expected by the public logo service. Exchange
 * suffixes matter here: VAS and VAS.AX are different listings to a logo API.
 */
export function marketSymbolForLogo(symbol: string, market?: string | null) {
  const rawInput = String(symbol || '').trim().toUpperCase()
  const prefix = rawInput.match(exchangePrefix)?.[1] || ''
  const raw = rawInput.replace(exchangePrefix, '')
  const ticker = raw.replace(knownTickerSuffix, '')
  if (!ticker || ['CASH', 'AUD', 'USD'].includes(ticker)) return ''
  const suffixMatch = raw.match(knownTickerSuffix)?.[1] || ''
  const inferredExchange = prefix === 'ASX' || suffixMatch === 'AX' || suffixMatch === 'AU' ? 'ASX'
    : prefix === 'NASDAQ' ? 'NASDAQ'
      : prefix === 'NYSE' || prefix === 'NYSEARCA' || prefix === 'ARCA' ? 'NYSE'
        : prefix || ''
  const exchange = String(market || inferredExchange).trim().toUpperCase().replace(/\s+/g, '')
  const suffix = logoExchangeSuffix[exchange] || ''
  return `${ticker}${suffix || (suffixMatch ? `.${suffixMatch}` : '')}`
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
