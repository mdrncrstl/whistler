export type RelationshipType = 'supplier' | 'customer' | 'competitor' | 'partner'
export type Confidence = 'High' | 'Moderate'

export interface SupplyChainCompany {
  id: string
  name: string
  ticker?: string
  country: string
  market: string
  sector: string
  description: string
  portfolio?: boolean
}

export interface SupplyChainRelationship {
  id: string
  from: string
  to: string
  type: RelationshipType
  note: string
  confidence: Confidence
  source: string
  sourceKind?: 'live-sec' | 'curated' | 'company-disclosure'
  sourceUrl?: string
  updated: string
}

export const supplyChainCompanies: SupplyChainCompany[] = [
  { id: 'apple', name: 'Apple', ticker: 'AAPL', country: 'United States', market: 'NASDAQ', sector: 'Technology', description: 'Consumer hardware, software and services.', portfolio: true },
  { id: 'nvidia', name: 'NVIDIA', ticker: 'NVDA', country: 'United States', market: 'NASDAQ', sector: 'Semiconductors', description: 'Accelerated computing and AI platforms.', portfolio: true },
  { id: 'microsoft', name: 'Microsoft', ticker: 'MSFT', country: 'United States', market: 'NASDAQ', sector: 'Software & cloud', description: 'Enterprise software, cloud and productivity.', portfolio: true },
  { id: 'amazon', name: 'Amazon', ticker: 'AMZN', country: 'United States', market: 'NASDAQ', sector: 'Consumer & cloud', description: 'Commerce, logistics and cloud infrastructure.', portfolio: true },
  { id: 'bhp', name: 'BHP Group', ticker: 'BHP', country: 'Australia', market: 'ASX', sector: 'Materials', description: 'Global resources and critical minerals.', portfolio: true },
  { id: 'cba', name: 'Commonwealth Bank', ticker: 'CBA', country: 'Australia', market: 'ASX', sector: 'Financials', description: 'Consumer and business banking in Australia.', portfolio: true },
  { id: 'vanguard-msci', name: 'Vanguard MSCI Index ETF', ticker: 'VGS', country: 'Australia', market: 'ASX', sector: 'Diversified ETF', description: 'International shares exposure across developed markets.', portfolio: true },
  { id: 'vanguard-aus', name: 'Vanguard Australian Shares ETF', ticker: 'VAS', country: 'Australia', market: 'ASX', sector: 'Diversified ETF', description: 'Broad Australian shares market exposure.', portfolio: true },
  { id: 'tsmc', name: 'TSMC', ticker: 'TSM', country: 'Taiwan', market: 'NYSE', sector: 'Semiconductors', description: 'Advanced semiconductor foundry manufacturing.' },
  { id: 'foxconn', name: 'Foxconn', ticker: '2317', country: 'Taiwan', market: 'TWSE', sector: 'Electronics manufacturing', description: 'Electronics manufacturing and assembly.' },
  { id: 'broadcom', name: 'Broadcom', ticker: 'AVGO', country: 'United States', market: 'NASDAQ', sector: 'Semiconductors', description: 'Connectivity and infrastructure software.' },
  { id: 'sony', name: 'Sony', ticker: 'SONY', country: 'Japan', market: 'NYSE', sector: 'Electronics & media', description: 'Image sensors, electronics and entertainment.' },
  { id: 'qualcomm', name: 'Qualcomm', ticker: 'QCOM', country: 'United States', market: 'NASDAQ', sector: 'Semiconductors', description: 'Wireless platforms and modem technology.' },
  { id: 'samsung', name: 'Samsung Electronics', ticker: '005930', country: 'South Korea', market: 'KRX', sector: 'Technology', description: 'Consumer electronics and semiconductors.' },
  { id: 'alphabet', name: 'Alphabet', ticker: 'GOOGL', country: 'United States', market: 'NASDAQ', sector: 'Technology', description: 'Internet services, advertising and cloud.' },
  { id: 'best-buy', name: 'Best Buy', ticker: 'BBY', country: 'United States', market: 'NYSE', sector: 'Retail', description: 'Consumer electronics retail and distribution.' },
  { id: 'amd', name: 'AMD', ticker: 'AMD', country: 'United States', market: 'NASDAQ', sector: 'Semiconductors', description: 'High-performance CPUs, GPUs and adaptive silicon.' },
  { id: 'intel', name: 'Intel', ticker: 'INTC', country: 'United States', market: 'NASDAQ', sector: 'Semiconductors', description: 'Processors and semiconductor manufacturing.' },
  { id: 'sk-hynix', name: 'SK hynix', ticker: '000660', country: 'South Korea', market: 'KRX', sector: 'Memory semiconductors', description: 'Memory and storage semiconductor products.' },
  { id: 'micron', name: 'Micron Technology', ticker: 'MU', country: 'United States', market: 'NASDAQ', sector: 'Memory semiconductors', description: 'Memory and storage solutions.' },
  { id: 'dell', name: 'Dell Technologies', ticker: 'DELL', country: 'United States', market: 'NYSE', sector: 'Infrastructure', description: 'Servers, storage and enterprise infrastructure.' },
  { id: 'openai', name: 'OpenAI', country: 'United States', market: 'Private', sector: 'Artificial intelligence', description: 'AI research and deployed model products.' },
  { id: 'oracle', name: 'Oracle', ticker: 'ORCL', country: 'United States', market: 'NYSE', sector: 'Software & cloud', description: 'Database, enterprise software and cloud services.' },
  { id: 'salesforce', name: 'Salesforce', ticker: 'CRM', country: 'United States', market: 'NYSE', sector: 'Software', description: 'Customer relationship management software.' },
  { id: 'walmart', name: 'Walmart', ticker: 'WMT', country: 'United States', market: 'NYSE', sector: 'Retail', description: 'Global retail and e-commerce.' },
  { id: 'rio-tinto', name: 'Rio Tinto', ticker: 'RIO', country: 'Australia', market: 'ASX', sector: 'Materials', description: 'Diversified mining and metals producer.' },
  { id: 'caterpillar', name: 'Caterpillar', ticker: 'CAT', country: 'United States', market: 'NYSE', sector: 'Industrials', description: 'Mining, construction and heavy equipment.' },
  { id: 'komatsu', name: 'Komatsu', ticker: '6301', country: 'Japan', market: 'TSE', sector: 'Industrials', description: 'Construction and mining equipment.' },
  { id: 'toyota', name: 'Toyota', ticker: 'TM', country: 'Japan', market: 'NYSE', sector: 'Automotive', description: 'Vehicle manufacturing and mobility services.' },
  { id: 'south32', name: 'South32', ticker: 'S32', country: 'Australia', market: 'ASX', sector: 'Materials', description: 'Diversified mining and metals producer.' },
  { id: 'anz', name: 'ANZ Group', ticker: 'ANZ', country: 'Australia', market: 'ASX', sector: 'Financials', description: 'Banking and financial services.' },
  { id: 'westpac', name: 'Westpac', ticker: 'WBC', country: 'Australia', market: 'ASX', sector: 'Financials', description: 'Banking and financial services.' },
  { id: 'visa', name: 'Visa', ticker: 'V', country: 'United States', market: 'NYSE', sector: 'Payments', description: 'Global payments network.' },
  { id: 'mastercard', name: 'Mastercard', ticker: 'MA', country: 'United States', market: 'NYSE', sector: 'Payments', description: 'Global payments technology network.' },
  { id: 'aws', name: 'AWS', country: 'United States', market: 'Private', sector: 'Cloud infrastructure', description: 'Cloud infrastructure and developer services.' },
  { id: 'vanguard', name: 'Vanguard', country: 'United States', market: 'Private', sector: 'Asset management', description: 'Index funds and asset management.' },
  { id: 'msci', name: 'MSCI', ticker: 'MSCI', country: 'United States', market: 'NYSE', sector: 'Financial data', description: 'Indexes and portfolio analytics.' },
]

export const supplyChainRelationships: SupplyChainRelationship[] = [
  { id: 'apple-tsmc', from: 'apple', to: 'tsmc', type: 'supplier', note: 'Advanced chip fabrication for custom silicon.', confidence: 'High', source: 'Company filings · supplier disclosures', updated: 'Aug 2026' },
  { id: 'apple-foxconn', from: 'apple', to: 'foxconn', type: 'supplier', note: 'Contract manufacturing and final assembly.', confidence: 'High', source: 'Company filings · supplier disclosures', updated: 'Aug 2026' },
  { id: 'apple-broadcom', from: 'apple', to: 'broadcom', type: 'supplier', note: 'Wireless and connectivity components.', confidence: 'High', source: 'Company filings · supplier disclosures', updated: 'Aug 2026' },
  { id: 'apple-sony', from: 'apple', to: 'sony', type: 'supplier', note: 'Image sensors for camera systems.', confidence: 'Moderate', source: 'Supplier reporting · industry research', updated: 'Jul 2026' },
  { id: 'apple-best-buy', from: 'apple', to: 'best-buy', type: 'customer', note: 'Retail distribution relationship.', confidence: 'Moderate', source: 'Channel disclosures · company reporting', updated: 'Jul 2026' },
  { id: 'apple-amazon', from: 'apple', to: 'amazon', type: 'customer', note: 'Retail and marketplace channel relationship.', confidence: 'Moderate', source: 'Curated context · retail channels', updated: 'Aug 2026' },
  { id: 'apple-walmart', from: 'apple', to: 'walmart', type: 'customer', note: 'Retail channel relationship for Apple products.', confidence: 'Moderate', source: 'Curated context · retail channels', updated: 'Aug 2026' },
  { id: 'apple-samsung', from: 'apple', to: 'samsung', type: 'competitor', note: 'Premium smartphone and device categories.', confidence: 'High', source: 'Company filings · market data', updated: 'Aug 2026' },
  { id: 'apple-alphabet', from: 'apple', to: 'alphabet', type: 'competitor', note: 'Consumer platforms, services and advertising.', confidence: 'Moderate', source: 'Market mapping · company reporting', updated: 'Jul 2026' },
  { id: 'apple-qualcomm', from: 'apple', to: 'qualcomm', type: 'partner', note: 'Modem technology and patent licensing.', confidence: 'High', source: 'Company filings · partnership disclosures', updated: 'Aug 2026' },
  { id: 'nvidia-tsmc', from: 'nvidia', to: 'tsmc', type: 'supplier', note: 'Leading-edge GPU and accelerator fabrication.', confidence: 'High', source: 'Company filings · supplier disclosures', updated: 'Aug 2026' },
  { id: 'nvidia-sk-hynix', from: 'nvidia', to: 'sk-hynix', type: 'supplier', note: 'High-bandwidth memory for AI accelerators.', confidence: 'High', source: 'Company filings · supplier disclosures', updated: 'Aug 2026' },
  { id: 'nvidia-micron', from: 'nvidia', to: 'micron', type: 'supplier', note: 'Memory components across accelerator systems.', confidence: 'Moderate', source: 'Supplier reporting · industry research', updated: 'Jul 2026' },
  { id: 'nvidia-microsoft', from: 'nvidia', to: 'microsoft', type: 'customer', note: 'AI infrastructure and cloud compute demand.', confidence: 'High', source: 'Company filings · cloud disclosures', updated: 'Aug 2026' },
  { id: 'nvidia-amazon', from: 'nvidia', to: 'amazon', type: 'customer', note: 'Accelerated computing for cloud workloads.', confidence: 'High', source: 'Company filings · cloud disclosures', updated: 'Aug 2026' },
  { id: 'nvidia-dell', from: 'nvidia', to: 'dell', type: 'customer', note: 'Enterprise AI server and workstation channels.', confidence: 'Moderate', source: 'Product disclosures · channel reporting', updated: 'Jul 2026' },
  { id: 'nvidia-amd', from: 'nvidia', to: 'amd', type: 'competitor', note: 'Data-centre accelerators and graphics processors.', confidence: 'High', source: 'Company filings · market data', updated: 'Aug 2026' },
  { id: 'nvidia-intel', from: 'nvidia', to: 'intel', type: 'competitor', note: 'Data-centre silicon and accelerated computing.', confidence: 'Moderate', source: 'Company filings · market data', updated: 'Jul 2026' },
  { id: 'nvidia-oracle', from: 'nvidia', to: 'oracle', type: 'partner', note: 'Cloud infrastructure for GPU compute capacity.', confidence: 'High', source: 'Partnership disclosures · company reporting', updated: 'Aug 2026' },
  { id: 'microsoft-tsmc', from: 'microsoft', to: 'tsmc', type: 'supplier', note: 'Custom silicon and infrastructure supply chain.', confidence: 'Moderate', source: 'Company reporting · industry research', updated: 'Jul 2026' },
  { id: 'microsoft-dell', from: 'microsoft', to: 'dell', type: 'supplier', note: 'Enterprise hardware distribution and infrastructure.', confidence: 'Moderate', source: 'Partner reporting · company filings', updated: 'Jul 2026' },
  { id: 'microsoft-openai', from: 'microsoft', to: 'openai', type: 'partner', note: 'AI models, cloud infrastructure and distribution.', confidence: 'High', source: 'Partnership disclosures · company reporting', updated: 'Aug 2026' },
  { id: 'microsoft-oracle', from: 'microsoft', to: 'oracle', type: 'partner', note: 'Cloud interoperability and enterprise workloads.', confidence: 'Moderate', source: 'Partnership disclosures', updated: 'Jul 2026' },
  { id: 'microsoft-amazon', from: 'microsoft', to: 'amazon', type: 'competitor', note: 'Cloud infrastructure, productivity and AI platforms.', confidence: 'High', source: 'Company filings · market data', updated: 'Aug 2026' },
  { id: 'microsoft-alphabet', from: 'microsoft', to: 'alphabet', type: 'competitor', note: 'Cloud, AI and productivity platforms.', confidence: 'High', source: 'Company filings · market data', updated: 'Aug 2026' },
  { id: 'amazon-walmart', from: 'amazon', to: 'walmart', type: 'competitor', note: 'Retail, fulfilment and e-commerce channels.', confidence: 'High', source: 'Company filings · market data', updated: 'Aug 2026' },
  { id: 'amazon-openai', from: 'amazon', to: 'openai', type: 'partner', note: 'AI infrastructure and model access ecosystem.', confidence: 'Moderate', source: 'Partnership reporting · industry research', updated: 'Jul 2026' },
  { id: 'bhp-caterpillar', from: 'bhp', to: 'caterpillar', type: 'supplier', note: 'Mining equipment and autonomous haulage systems.', confidence: 'High', source: 'Company reporting · supplier disclosures', updated: 'Aug 2026' },
  { id: 'bhp-komatsu', from: 'bhp', to: 'komatsu', type: 'supplier', note: 'Mining equipment and fleet technology.', confidence: 'Moderate', source: 'Company reporting · supplier disclosures', updated: 'Jul 2026' },
  { id: 'bhp-toyota', from: 'bhp', to: 'toyota', type: 'customer', note: 'Nickel and battery materials value chain exposure.', confidence: 'Moderate', source: 'Company reporting · industry research', updated: 'Jul 2026' },
  { id: 'bhp-rio', from: 'bhp', to: 'rio-tinto', type: 'competitor', note: 'Iron ore and diversified resources.', confidence: 'High', source: 'Company filings · market data', updated: 'Aug 2026' },
  { id: 'bhp-south32', from: 'bhp', to: 'south32', type: 'partner', note: 'Shared Australian resources ecosystem.', confidence: 'Moderate', source: 'Company reporting · market mapping', updated: 'Jul 2026' },
  { id: 'cba-anz', from: 'cba', to: 'anz', type: 'competitor', note: 'Australian retail and business banking.', confidence: 'High', source: 'Company filings · market data', updated: 'Aug 2026' },
  { id: 'cba-westpac', from: 'cba', to: 'westpac', type: 'competitor', note: 'Australian retail and business banking.', confidence: 'High', source: 'Company filings · market data', updated: 'Aug 2026' },
  { id: 'cba-visa', from: 'cba', to: 'visa', type: 'partner', note: 'Card network and payments infrastructure.', confidence: 'High', source: 'Company reporting · network disclosures', updated: 'Aug 2026' },
  { id: 'cba-mastercard', from: 'cba', to: 'mastercard', type: 'partner', note: 'Card network and payments infrastructure.', confidence: 'High', source: 'Company reporting · network disclosures', updated: 'Aug 2026' },
  { id: 'cba-aws', from: 'cba', to: 'aws', type: 'partner', note: 'Cloud services for digital banking workloads.', confidence: 'Moderate', source: 'Technology reporting · company disclosures', updated: 'Jul 2026' },
  { id: 'vgs-vanguard', from: 'vanguard-msci', to: 'vanguard', type: 'partner', note: 'Fund issuer and portfolio administration.', confidence: 'High', source: 'Fund issuer documents', updated: 'Aug 2026' },
  { id: 'vgs-msci', from: 'vanguard-msci', to: 'msci', type: 'partner', note: 'Index methodology and benchmark exposure.', confidence: 'High', source: 'Fund issuer documents · index methodology', updated: 'Aug 2026' },
  { id: 'vas-vanguard', from: 'vanguard-aus', to: 'vanguard', type: 'partner', note: 'Fund issuer and portfolio administration.', confidence: 'High', source: 'Fund issuer documents', updated: 'Aug 2026' },
]

export const relationshipLabels: Record<RelationshipType, string> = {
  supplier: 'Suppliers',
  customer: 'Customers',
  competitor: 'Competitors',
  partner: 'Partners',
}

export const relationshipSingular: Record<RelationshipType, string> = {
  supplier: 'Supplier',
  customer: 'Customer',
  competitor: 'Competitor',
  partner: 'Partner',
}

export function inverseRelationshipType(type: RelationshipType): RelationshipType {
  if (type === 'supplier') return 'customer'
  if (type === 'customer') return 'supplier'
  return type
}
