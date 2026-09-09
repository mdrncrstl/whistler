import type { SupplyChainCompany, SupplyChainRelationship } from './supplyChain'

const manufacturingSource = 'https://www.apple.com/newsroom/2026/03/apple-adds-new-partners-to-its-american-manufacturing-program/'
// Dated announcements supplement, rather than pretend to be, annual-filing extraction.
export const disclosureCompanies: SupplyChainCompany[] = [
  ['amkor', 'Amkor Technology', 'AMKR', 'Semiconductor packaging'],
  ['corning', 'Corning', 'GLW', 'Materials'],
  ['cirrus', 'Cirrus Logic', 'CRUS', 'Semiconductors'],
  ['globalfoundries', 'GlobalFoundries', 'GFS', 'Semiconductors'],
  ['texas-instruments', 'Texas Instruments', 'TXN', 'Semiconductors'],
  ['applied-materials', 'Applied Materials', 'AMAT', 'Semiconductor equipment'],
  ['coherent', 'Coherent', 'COHR', 'Optical materials'],
].map(([id, name, ticker, sector]) => ({ id, name, ticker, sector, country: 'United States', market: id === 'corning' || id === 'coherent' ? 'NYSE' : 'NASDAQ', description: sector }))

export const companyDisclosures: SupplyChainRelationship[] = [
  ...['amkor', 'corning', 'cirrus', 'globalfoundries', 'texas-instruments', 'applied-materials', 'coherent', 'broadcom', 'samsung'].map(to => ({
    id: `apple-disclosure-${to}`, from: 'apple', to, type: 'partner' as const,
    note: 'Apple named this company in its American Manufacturing Program announcement. This describes the announced manufacturing collaboration; it does not quantify revenue exposure.',
    confidence: 'High' as const, source: 'Apple Newsroom', sourceKind: 'company-disclosure' as const,
    sourceUrl: manufacturingSource, updated: '2026-03-26',
  })),
  { id: 'apple-disclosure-tsmc', from: 'apple', to: 'tsmc', type: 'supplier', note: 'Apple identified TSMC as a chip manufacturing supplier in its US manufacturing update.', confidence: 'High', source: 'Apple Newsroom', sourceKind: 'company-disclosure', sourceUrl: 'https://www.apple.com/newsroom/2026/02/apple-accelerates-us-manufacturing-with-mac-mini-production/', updated: '2026-02-24' },
  { id: 'apple-disclosure-qualcomm', from: 'apple', to: 'qualcomm', type: 'supplier', note: 'Qualcomm announced an agreement to supply modem and RF systems for Apple smartphone launches in 2024, 2025 and 2026.', confidence: 'High', source: 'Qualcomm', sourceKind: 'company-disclosure', sourceUrl: 'https://www.qualcomm.com/news/releases/2023/09/qualcomm-announces-agreement-with-apple-for-chip-supply', updated: '2023-09-11' },
]

/** Logo identity is separate from a subsidiary's listing status. */
export function companyLogoSymbol(company: Pick<SupplyChainCompany, 'name' | 'ticker'>) {
  if (/^google( llc| inc\.?| limited)?$/i.test(company.name.trim())) return 'GOOGL'
  return company.ticker || ''
}
