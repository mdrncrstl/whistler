import type { SupplyChainCompany, SupplyChainRelationship } from '../data/supplyChain'

export interface SupplyChainFiling {
  form: string
  filedAt: string
  accession: string
  primaryDocument: string
  url: string
}

export interface LiveSupplyChainNetwork {
  company: SupplyChainCompany
  companies: SupplyChainCompany[]
  relationships: SupplyChainRelationship[]
  filing: SupplyChainFiling
  coverage: 'live-sec-filing'
  generatedAt: string
}

const networkCache = new Map<string, LiveSupplyChainNetwork>()

async function readJson<T>(response: Response): Promise<T> {
  const payload = await response.json() as T & { error?: string }
  if (!response.ok) throw new Error(payload.error || `Request failed (${response.status})`)
  return payload
}

export async function fetchSupplyChainNetwork(symbol: string, signal?: AbortSignal) {
  const ticker = symbol.trim().toUpperCase()
  const cached = networkCache.get(ticker)
  if (cached) return cached
  const response = await fetch(`/api/supply-chain?ticker=${encodeURIComponent(ticker)}`, { signal })
  const payload = await readJson<LiveSupplyChainNetwork>(response)
  networkCache.set(ticker, payload)
  return payload
}

export async function searchSupplyChainCompanies(query: string, signal?: AbortSignal) {
  const response = await fetch(`/api/supply-chain?q=${encodeURIComponent(query.trim())}`, { signal })
  const payload = await readJson<{ companies: SupplyChainCompany[] }>(response)
  return payload.companies
}
