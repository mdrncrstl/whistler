import type { PortfolioBundle, PortfolioSnapshot, Transaction } from '../types'

const transactions: Transaction[] = [
  { provider: 'ibkr', provider_external_id: 'd1', account_name: 'IBKR Main', date: '2024-01-12T00:00:00Z', type: 'BUY', symbol: 'AAPL', description: 'Bought Apple Inc.', quantity: 90, price: 163.4, currency: 'USD', amount: -14706, fees: 2.1, fx_rate: 1.52 },
  { provider: 'ibkr', provider_external_id: 'd2', account_name: 'IBKR Main', date: '2024-05-22T00:00:00Z', type: 'BUY', symbol: 'NVDA', description: 'Bought NVIDIA Corp.', quantity: 118, price: 89.2, currency: 'USD', amount: -10525.6, fees: 2.4, fx_rate: 1.51 },
  { provider: 'superhero', provider_external_id: 'd3', account_name: 'Superhero', date: '2024-08-08T00:00:00Z', type: 'BUY', symbol: 'VGS', description: 'Bought Vanguard MSCI Index ETF', quantity: 126, price: 119.1, currency: 'AUD', amount: -15006.6, fees: 5, fx_rate: 1 },
  { provider: 'superhero', provider_external_id: 'd4', account_name: 'Superhero', date: '2024-11-18T00:00:00Z', type: 'BUY', symbol: 'CBA', description: 'Bought Commonwealth Bank', quantity: 78, price: 113.5, currency: 'AUD', amount: -8853, fees: 5, fx_rate: 1 },
  { provider: 'ibkr', provider_external_id: 'd5', account_name: 'IBKR Main', date: '2025-02-14T00:00:00Z', type: 'BUY', symbol: 'AMZN', description: 'Bought Amazon.com Inc.', quantity: 30, price: 174, currency: 'USD', amount: -5220, fees: 1.8, fx_rate: 1.57 },
  { provider: 'superhero', provider_external_id: 'd6', account_name: 'Superhero', date: '2025-09-27T00:00:00Z', type: 'DIVIDEND', symbol: 'VGS', description: 'VGS quarterly distribution', quantity: 0, price: 0, currency: 'AUD', amount: 214.35, fees: 0, fx_rate: 1 },
  { provider: 'superhero', provider_external_id: 'd7', account_name: 'Superhero', date: '2026-02-11T00:00:00Z', type: 'DIVIDEND', symbol: 'CBA', description: 'CBA interim dividend', quantity: 0, price: 0, currency: 'AUD', amount: 176.28, fees: 0, fx_rate: 1 },
  { provider: 'ibkr', provider_external_id: 'd8', account_name: 'IBKR Main', date: '2026-05-18T00:00:00Z', type: 'SELL', symbol: 'AAPL', description: 'Sold Apple Inc.', quantity: 10, price: 226, currency: 'USD', amount: 2260, fees: 1.5, fx_rate: 1.55 },
  { provider: 'ibkr', provider_external_id: 'd9', account_name: 'IBKR Main', date: '2026-06-16T00:00:00Z', type: 'DIVIDEND', symbol: 'AAPL', description: 'Apple dividend', quantity: 0, price: 0, currency: 'USD', amount: 23.4, fees: 0, fx_rate: 1.53 },
  { provider: 'ibkr', provider_external_id: 'd10', account_name: 'IBKR Main', date: '2025-01-20T00:00:00Z', type: 'BUY', symbol: 'MSFT', description: 'Bought Microsoft Corp.', quantity: 23, price: 390, currency: 'USD', amount: -8970, fees: 2.2, fx_rate: 1.57 },
  { provider: 'ibkr', provider_external_id: 'd11', account_name: 'IBKR Main', date: '2026-08-10T00:00:00Z', type: 'SELL', symbol: 'MSFT', description: 'Sold Microsoft Corp.', quantity: 4, price: 505.6, currency: 'USD', amount: 2022.4, fees: 1.4, fx_rate: 1.54 },
  { provider: 'superhero', provider_external_id: 'd12', account_name: 'Superhero', date: '2026-08-14T00:00:00Z', type: 'DIVIDEND', symbol: 'VGS', description: 'VGS quarterly distribution', quantity: 0, price: 0, currency: 'AUD', amount: 126.7, fees: 0, fx_rate: 1 },
]

const snapshotValues = [88500, 91740, 93820, 97410, 102660, 108940, 111250, 119630, 122470, 128820, 131400, 139855]
const snapshots: PortfolioSnapshot[] = snapshotValues.map((value, index) => {
  const date = new Date(Date.UTC(2025, 8 + index, 1))
  return {
    date: date.toISOString().slice(0, 10),
    value_aud: value,
    invested_aud: value - 7950,
    cash_aud: 7950,
    benchmark_value_aud: Math.round(88500 * (1 + index * 0.026)),
    source: 'demo',
  }
})

export const demoBundle: PortfolioBundle = {
  profile: {
    id: 'demo-user',
    email: 'demo@masterdeck.app',
    full_name: 'Demo Investor',
    avatar_url: null,
    base_currency: 'AUD',
    settings: { privacyMode: false, defaultTaxMethod: 'fifo' },
  },
  holdings: [
    { provider: 'ibkr', account_name: 'IBKR Main', symbol: 'AAPL', name: 'Apple Inc.', market: 'NASDAQ', currency: 'USD', asset_class: 'US shares', sector: 'Technology', quantity: 80, average_cost: 163.4, current_price: 226.4, fx_rate: 1.54, value_aud: 27892.48, cost_aud: 20130.88, unrealised_gain_aud: 7761.6, return_pct: 38.56, day_change_aud: 312.4 },
    { provider: 'ibkr', account_name: 'IBKR Main', symbol: 'NVDA', name: 'NVIDIA Corp.', market: 'NASDAQ', currency: 'USD', asset_class: 'US shares', sector: 'Technology', quantity: 118, average_cost: 89.2, current_price: 143.5, fx_rate: 1.54, value_aud: 26080.82, cost_aud: 16209.42, unrealised_gain_aud: 9871.4, return_pct: 60.9, day_change_aud: -146.2 },
    { provider: 'superhero', account_name: 'Superhero', symbol: 'VGS', name: 'Vanguard MSCI Index International Shares ETF', market: 'ASX', currency: 'AUD', asset_class: 'ETF', sector: 'Diversified', quantity: 126, average_cost: 119.1, current_price: 146.05, fx_rate: 1, value_aud: 18402.3, cost_aud: 15006.6, unrealised_gain_aud: 3395.7, return_pct: 22.63, day_change_aud: 88.2 },
    { provider: 'superhero', account_name: 'Superhero', symbol: 'CBA', name: 'Commonwealth Bank of Australia', market: 'ASX', currency: 'AUD', asset_class: 'AU shares', sector: 'Financials', quantity: 78, average_cost: 113.5, current_price: 162.85, fx_rate: 1, value_aud: 12702.3, cost_aud: 8853, unrealised_gain_aud: 3849.3, return_pct: 43.48, day_change_aud: 54.6 },
    { provider: 'ibkr', account_name: 'IBKR Main', symbol: 'AMZN', name: 'Amazon.com Inc.', market: 'NASDAQ', currency: 'USD', asset_class: 'US shares', sector: 'Consumer discretionary', quantity: 30, average_cost: 174, current_price: 228.9, fx_rate: 1.54, value_aud: 10575.18, cost_aud: 8038.8, unrealised_gain_aud: 2536.38, return_pct: 31.55, day_change_aud: 72.1 },
    { provider: 'superhero', account_name: 'Superhero', symbol: 'BHP', name: 'BHP Group', market: 'ASX', currency: 'AUD', asset_class: 'AU shares', sector: 'Materials', quantity: 205, average_cost: 39.8, current_price: 43.18, fx_rate: 1, value_aud: 8851.9, cost_aud: 8159, unrealised_gain_aud: 692.9, return_pct: 8.49, day_change_aud: -41 },
    { provider: 'ibkr', account_name: 'IBKR Main', symbol: 'MSFT', name: 'Microsoft Corp.', market: 'NASDAQ', currency: 'USD', asset_class: 'US shares', sector: 'Technology', quantity: 19, average_cost: 390, current_price: 505.6, fx_rate: 1.54, value_aud: 14792.9, cost_aud: 11411.4, unrealised_gain_aud: 3381.5, return_pct: 29.63, day_change_aud: 117.8 },
    { provider: 'superhero', account_name: 'Superhero', symbol: 'VAS', name: 'Vanguard Australian Shares Index ETF', market: 'ASX', currency: 'AUD', asset_class: 'ETF', sector: 'Diversified', quantity: 91, average_cost: 92.4, current_price: 105.03, fx_rate: 1, value_aud: 9557.73, cost_aud: 8408.4, unrealised_gain_aud: 1149.33, return_pct: 13.67, day_change_aud: 27.3 },
  ],
  transactions,
  cash: [
    { provider: 'ibkr', account_name: 'IBKR Main', currency: 'AUD', balance: 9292, fx_rate: 1, value_aud: 9292 },
    { provider: 'superhero', account_name: 'Superhero', currency: 'AUD', balance: 1707, fx_rate: 1, value_aud: 1707 },
  ],
  snapshots,
  connections: [
    { id: 'demo-ibkr', provider: 'ibkr', label: 'IBKR Main', status: 'connected', last_synced_at: '2026-08-24T01:15:00Z', config: { mode: 'read-only-flex' } },
    { id: 'demo-superhero', provider: 'superhero', label: 'Superhero', status: 'connected', last_synced_at: '2026-08-23T09:30:00Z', config: { mode: 'report-import' } },
  ],
  syncRuns: [
    { id: 'run-1', provider: 'ibkr', status: 'success', message: 'IBKR portfolio refreshed', imported_count: 184, started_at: '2026-08-24T01:14:12Z', finished_at: '2026-08-24T01:15:00Z' },
  ],
  demo: true,
}
