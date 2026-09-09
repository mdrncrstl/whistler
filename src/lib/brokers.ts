/**
 * How a broker's records reach Masterdeck.
 *
 * `sync`   – Masterdeck holds a read-only connection and pulls records itself.
 * `parser` – Masterdeck understands that broker's own export format directly.
 * `csv`    – The generic column mapper. Works with any broker that exports CSV; the
 *            entry here only pre-fills the account label, exchange and currency so the
 *            mapping starts in the right place.
 *
 * Nothing in this list is a live API connection except where `method` is 'sync'. That
 * distinction is shown to the user on every surface that renders this list.
 */
export type BrokerMethod = 'sync' | 'parser' | 'csv'

export interface Broker {
  id: string
  name: string
  method: BrokerMethod
  market: string
  currency: string
  region: 'Australia' | 'Global'
  note?: string
}

export const brokers: Broker[] = [
  { id: 'ibkr', name: 'Interactive Brokers', method: 'sync', market: 'NASDAQ', currency: 'USD', region: 'Global', note: 'Optional read-only Activity Flex feed' },
  { id: 'superhero', name: 'Superhero', method: 'parser', market: 'ASX', currency: 'AUD', region: 'Australia', note: 'Portfolio report, transaction statement, valuation CSV or contract-note PDF' },

  { id: 'commsec', name: 'CommSec', method: 'csv', market: 'ASX', currency: 'AUD', region: 'Australia' },
  { id: 'selfwealth', name: 'SelfWealth', method: 'csv', market: 'ASX', currency: 'AUD', region: 'Australia' },
  { id: 'pearler', name: 'Pearler', method: 'csv', market: 'ASX', currency: 'AUD', region: 'Australia' },
  { id: 'stake-au', name: 'Stake', method: 'csv', market: 'ASX', currency: 'AUD', region: 'Australia' },
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
  { id: 'moomoo', name: 'moomoo', method: 'csv', market: 'NASDAQ', currency: 'USD', region: 'Global' },
  { id: 'webull', name: 'Webull', method: 'csv', market: 'NASDAQ', currency: 'USD', region: 'Global' },
  { id: 'schwab', name: 'Charles Schwab', method: 'csv', market: 'NYSE', currency: 'USD', region: 'Global' },
  { id: 'fidelity', name: 'Fidelity', method: 'csv', market: 'NYSE', currency: 'USD', region: 'Global' },
  { id: 'robinhood', name: 'Robinhood', method: 'csv', market: 'NASDAQ', currency: 'USD', region: 'Global' },
  { id: 'etrade', name: 'E*TRADE', method: 'csv', market: 'NASDAQ', currency: 'USD', region: 'Global' },
  { id: 'vanguard-us', name: 'Vanguard (US)', method: 'csv', market: 'NYSE', currency: 'USD', region: 'Global' },
  { id: 'degiro', name: 'DEGIRO', method: 'csv', market: 'AMS', currency: 'EUR', region: 'Global' },
  { id: 'saxo', name: 'Saxo', method: 'csv', market: 'NASDAQ', currency: 'USD', region: 'Global' },
  { id: 'wealthsimple', name: 'Wealthsimple', method: 'csv', market: 'TSX', currency: 'CAD', region: 'Global' },
  { id: 'hatch', name: 'Hatch', method: 'csv', market: 'NASDAQ', currency: 'USD', region: 'Global' },
  { id: 'other', name: 'Another broker', method: 'csv', market: 'ASX', currency: 'AUD', region: 'Global', note: 'Any CSV export with a header row' },
]

export const methodLabel: Record<BrokerMethod, string> = {
  sync: 'Direct read-only sync',
  parser: 'Statement import',
  csv: 'CSV import',
}

export const methodDetail: Record<BrokerMethod, string> = {
  sync: 'Use an optional supported feed to pull records without trading access.',
  parser: 'Masterdeck reads this broker’s own export format directly.',
  csv: 'Export a CSV from the broker and map its columns once. Not a live connection.',
}

export const syncedBrokers = brokers.filter(broker => broker.method === 'sync')
export const parserBrokers = brokers.filter(broker => broker.method === 'parser')
export const csvBrokers = brokers.filter(broker => broker.method === 'csv' && broker.id !== 'other')
