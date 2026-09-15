/**
 * How a broker's records reach Masterdeck.
 *
 * `sync`             – Masterdeck holds a direct read-only connection and pulls records itself.
 * `aggregated-sync` – A secure read-only provider handles the broker login, then Masterdeck
 *                     pulls normalized records server-side.
 * `parser`          – Masterdeck understands that broker's own export format directly.
 * `csv`             – The generic column mapper. Works with any broker that exports CSV; the
 *                     entry here only pre-fills the account label, exchange and currency so
 *                     the mapping starts in the right place.
 *
 * Nothing in this list is a live connection except where `method` is `sync` or
 * `aggregated-sync`. That distinction is shown to the user on every surface that renders
 * this list.
 */
export type BrokerMethod = 'sync' | 'aggregated-sync' | 'parser' | 'csv'

export interface Broker {
  id: string
  name: string
  method: BrokerMethod
  market: string
  currency: string
  region: 'Australia' | 'Global'
  note?: string
  snapTradeSlug?: string
}

export const brokers: Broker[] = [
  { id: 'ibkr', name: 'Interactive Brokers', method: 'sync', market: 'NASDAQ', currency: 'USD', region: 'Global', note: 'Optional read-only Activity Flex feed' },
  { id: 'superhero', name: 'Superhero', method: 'parser', market: 'ASX', currency: 'AUD', region: 'Australia', note: 'Portfolio report, transaction statement, valuation CSV or contract-note PDF' },

  { id: 'commsec', name: 'CommSec', method: 'aggregated-sync', market: 'ASX', currency: 'AUD', region: 'Australia', snapTradeSlug: 'COMMSEC' },
  { id: 'selfwealth', name: 'SelfWealth', method: 'csv', market: 'ASX', currency: 'AUD', region: 'Australia' },
  { id: 'pearler', name: 'Pearler', method: 'csv', market: 'ASX', currency: 'AUD', region: 'Australia' },
  { id: 'stake-au', name: 'Stake', method: 'aggregated-sync', market: 'ASX', currency: 'AUD', region: 'Australia', snapTradeSlug: 'STAKEAUS' },
  { id: 'nabtrade', name: 'nabtrade', method: 'csv', market: 'ASX', currency: 'AUD', region: 'Australia' },
  { id: 'cmc', name: 'CMC Markets', method: 'csv', market: 'ASX', currency: 'AUD', region: 'Australia' },
  { id: 'westpac', name: 'Westpac Online Investing', method: 'csv', market: 'ASX', currency: 'AUD', region: 'Australia' },
  { id: 'anz', name: 'ANZ Share Investing', method: 'csv', market: 'ASX', currency: 'AUD', region: 'Australia' },
  { id: 'bell-direct', name: 'Bell Direct', method: 'csv', market: 'ASX', currency: 'AUD', region: 'Australia' },
  { id: 'macquarie', name: 'Macquarie Online Trading', method: 'csv', market: 'ASX', currency: 'AUD', region: 'Australia' },
  { id: 'betashares', name: 'Betashares Direct', method: 'csv', market: 'ASX', currency: 'AUD', region: 'Australia' },
  { id: 'vanguard-au', name: 'Vanguard Personal Investor', method: 'csv', market: 'ASX', currency: 'AUD', region: 'Australia' },
  { id: 'raiz', name: 'Raiz', method: 'csv', market: 'ASX', currency: 'AUD', region: 'Australia' },
  { id: 'sharesies-au', name: 'Sharesies', method: 'csv', market: 'ASX', currency: 'AUD', region: 'Australia' },

  { id: 'stake-us', name: 'Stake (US)', method: 'csv', market: 'NASDAQ', currency: 'USD', region: 'Global' },
  { id: 'moomoo', name: 'moomoo', method: 'aggregated-sync', market: 'NASDAQ', currency: 'USD', region: 'Global', snapTradeSlug: 'MOOMOO' },
  { id: 'webull', name: 'Webull', method: 'aggregated-sync', market: 'NASDAQ', currency: 'USD', region: 'Global', snapTradeSlug: 'WEBULL' },
  { id: 'schwab', name: 'Charles Schwab', method: 'aggregated-sync', market: 'NYSE', currency: 'USD', region: 'Global', note: 'Read-only via SnapTrade; availability may require provider approval', snapTradeSlug: 'SCHWAB' },
  { id: 'fidelity', name: 'Fidelity', method: 'aggregated-sync', market: 'NYSE', currency: 'USD', region: 'Global', note: 'Read-only via SnapTrade; availability may require provider approval', snapTradeSlug: 'FIDELITY' },
  { id: 'robinhood', name: 'Robinhood', method: 'aggregated-sync', market: 'NASDAQ', currency: 'USD', region: 'Global', snapTradeSlug: 'ROBINHOOD' },
  { id: 'etrade', name: 'E*TRADE', method: 'aggregated-sync', market: 'NASDAQ', currency: 'USD', region: 'Global', snapTradeSlug: 'ETRADE' },
  { id: 'vanguard-us', name: 'Vanguard (US)', method: 'aggregated-sync', market: 'NYSE', currency: 'USD', region: 'Global', snapTradeSlug: 'VANGUARD' },
  { id: 'degiro', name: 'DEGIRO', method: 'aggregated-sync', market: 'AMS', currency: 'EUR', region: 'Global', snapTradeSlug: 'DEGIRO' },
  { id: 'saxo', name: 'Saxo', method: 'csv', market: 'NASDAQ', currency: 'USD', region: 'Global' },
  { id: 'wealthsimple', name: 'Wealthsimple', method: 'aggregated-sync', market: 'TSX', currency: 'CAD', region: 'Global', snapTradeSlug: 'WEALTHSIMPLE' },
  { id: 'hatch', name: 'Hatch', method: 'csv', market: 'NASDAQ', currency: 'USD', region: 'Global' },
  { id: 'other', name: 'Another broker', method: 'csv', market: 'ASX', currency: 'AUD', region: 'Global', note: 'Any CSV export with a header row' },
]

export const methodLabel: Record<BrokerMethod, string> = {
  sync: 'Direct read-only sync',
  'aggregated-sync': 'Secure read-only connection',
  parser: 'Statement import',
  csv: 'CSV import',
}

export const methodDetail: Record<BrokerMethod, string> = {
  sync: 'Use an optional supported feed to pull records without trading access.',
  'aggregated-sync': 'Connect through a secure read-only provider. No trading or money movement access.',
  parser: 'Masterdeck reads this broker’s own export format directly.',
  csv: 'Export a CSV from the broker and map its columns once. Not a live connection.',
}

export const syncedBrokers = brokers.filter(broker => broker.method === 'sync' || broker.method === 'aggregated-sync')
export const parserBrokers = brokers.filter(broker => broker.method === 'parser')
export const csvBrokers = brokers.filter(broker => broker.method === 'csv' && broker.id !== 'other')
