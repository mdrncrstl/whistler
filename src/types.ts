import type { Session } from '@supabase/supabase-js'

export type Provider = 'ibkr' | 'superhero' | 'google_gmail'
export type ConnectionStatus = 'pending' | 'connected' | 'error' | 'disabled'
export type TransactionType =
  | 'BUY'
  | 'SELL'
  | 'DIVIDEND'
  | 'DISTRIBUTION'
  | 'INTEREST'
  | 'DEPOSIT'
  | 'WITHDRAWAL'
  | 'FEE'
  | 'TAX'
  | 'OTHER'

export interface ProfileSettings {
  privacyMode?: boolean
  defaultTaxMethod?: TaxMethod
  compactTables?: boolean
}

export interface Profile {
  id: string
  email: string | null
  full_name: string | null
  avatar_url: string | null
  base_currency: 'AUD'
  settings: ProfileSettings
}

export interface Position {
  id?: string
  user_id?: string
  broker_connection_id?: string
  provider: Provider
  provider_account_id?: string
  account_name: string
  symbol: string
  name?: string | null
  market?: string | null
  currency: string
  asset_class?: string | null
  sector?: string | null
  quantity: number
  average_cost: number
  current_price: number
  fx_rate: number
  value_aud: number
  cost_aud: number
  unrealised_gain_aud: number
  return_pct: number
  day_change_aud: number
  as_of?: string
}

export interface Transaction {
  id?: string
  provider: Provider
  provider_external_id: string
  provider_account_id?: string | null
  account_name?: string | null
  date: string
  type: TransactionType | string
  symbol?: string | null
  description?: string | null
  quantity: number
  price: number
  currency: string
  amount: number
  fees: number
  fx_rate: number
}

export interface CashBalance {
  id?: string
  provider: Provider
  account_name: string
  currency: string
  balance: number
  fx_rate: number
  value_aud: number
  as_of?: string
}

export interface PortfolioSnapshot {
  id?: string
  date: string
  snapshot_date?: string
  value_aud: number
  cash_aud: number
  invested_aud: number
  benchmark_value_aud?: number | null
  source?: string
}

export interface BrokerConnection {
  id: string
  provider: Provider
  label: string
  status: ConnectionStatus
  config?: Record<string, unknown>
  last_synced_at?: string | null
  last_error?: string | null
  created_at?: string
}

export interface SyncRun {
  id: string
  provider: Provider
  status: 'running' | 'success' | 'error' | 'partial'
  message?: string | null
  imported_count: number
  started_at: string
  finished_at?: string | null
}

export interface PortfolioBundle {
  profile: Profile | null
  holdings: Position[]
  transactions: Transaction[]
  cash: CashBalance[]
  snapshots: PortfolioSnapshot[]
  connections: BrokerConnection[]
  syncRuns: SyncRun[]
  demo: boolean
}

export interface SuperheroHoldingInput {
  account_name?: string
  symbol: string
  name?: string
  market?: string
  currency?: string
  asset_class?: string
  sector?: string
  quantity: number
  average_cost?: number
  current_price?: number
  value?: number
  cost?: number
  fx_rate?: number
  raw?: Record<string, unknown>
}

export interface SuperheroTransactionInput {
  provider_external_id: string
  account_name?: string
  date: string
  type: string
  symbol?: string
  description?: string
  quantity?: number
  price?: number
  currency?: string
  amount?: number
  fees?: number
  fx_rate?: number
  raw?: Record<string, unknown>
}

export interface SuperheroCashInput {
  account_name?: string
  currency: string
  balance: number
  fx_rate?: number
}

export interface SuperheroReport {
  filename: string
  holdings: SuperheroHoldingInput[]
  transactions: SuperheroTransactionInput[]
  cash: SuperheroCashInput[]
  warnings: string[]
}

export type TaxMethod = 'fifo' | 'lifo' | 'hifo'

export interface TaxMatch {
  sellId: string
  symbol: string
  soldAt: string
  boughtAt: string
  quantity: number
  proceedsAud: number
  costBaseAud: number
  gainAud: number
  discountEligible: boolean
  holdingDays: number
}

export interface AppIdentity {
  session: Session | null
  demo: boolean
}
