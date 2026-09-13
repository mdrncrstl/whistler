import type { PortfolioBundle } from '../types'
import type { MarketHistoryPoint } from './marketDataApi'
import { allocationBy, incomeTransactions, summarisePortfolio } from './portfolio'
import { money, percent } from './format'

export interface PortfolioAnswer { title: string; text: string; symbol?: string; exchange?: string; currency?: string; href?: string; link?: string; metrics?: { label: string; value: string }[]; points?: MarketHistoryPoint[]; source?: { url: string; label: string; asOf: string | null }; alternatives?: { symbol: string; name: string }[] }

/** Deliberately local and deterministic: never executes a trade or calls a model. */
export function portfolioAnswer(question: string, bundle: PortfolioBundle): PortfolioAnswer {
  const q = question.toLowerCase().trim()
  const summary = summarisePortfolio(bundle)
  const result = (title: string, text: string, href = '/app', link = 'Open portfolio') => ({ title, text, href, link })
  if (/what can|help|capabilit/.test(q)) return result('Your portfolio, explained', `I can calculate value, open-position gains, income, cash and concentration from your loaded records, or look up a holding by ticker. There are ${summary.holdingCount} holdings and ${bundle.transactions.length} transactions available. Ask one question at a time.`, '/app/connections', 'Manage data sources')
  if (/buy|should i|sell|predict|forecast|recommend|tomorrow|next (week|month)|why|news/.test(q)) return { title: 'Let’s keep this grounded', text: 'This portfolio engine calculates from your records. It cannot predict prices, recommend trades or research news. Open a holding for its sourced price summary, or ask about your value, income or concentration.' }
  if (/last |this (month|year|week)|yesterday|\bytd\b|\b20\d{2}\b/.test(q)) return result('Choose a reporting period', 'This chat summarises all loaded records. Use the report’s date controls for a specific period so deposits, sales and dates are handled explicitly.', '/app/reports/performance', 'Open performance report')
  if (!bundle.holdings.length && !bundle.transactions.length && !bundle.cash.length) return result('Start with your records', 'Connect an account or import a statement to calculate your portfolio. Nothing has been estimated or filled with example values.', '/app/connections', 'Add investment records')
  if (/tax|cgt|frank/.test(q)) return result('Review your tax records', 'Open-position gains are not realised capital gains. The tax report matches transaction parcels and flags missing records; review those before using an estimate in a return.', '/app/tax', 'Open tax overview')
  if (/unrealised gains/.test(q)) return result('Unrealised gains', 'The difference between the current value and cost of investments you still hold. It changes with prices and exchange rates. It is not the realised gain from a sale.', '/app/reports/performance', 'Review performance')
  if (/import|connect/.test(q)) return result('Bring your investments together', 'Open Connections to choose a supported broker, upload a statement or add records manually. Available import methods depend on the provider.', '/app/connections', 'Add investment records')
  if (/how many holding/.test(q)) return result('Your loaded holdings', `${summary.holdingCount} positions across ${new Set(bundle.holdings.map(item => item.symbol)).size} distinct tickers. Separate accounts can hold the same investment.`)
  if (/fees/.test(q)) return result('Fees on record', `${money(bundle.transactions.reduce((total, item) => total + Math.abs(item.fees || 0) * (item.fx_rate || 1), 0))} in recorded transaction fees, converted to AUD using each record’s exchange rate. This excludes costs not supplied in your records.`, '/app/transactions', 'Review transactions')
  if (/winner|loser|best|worst|largest position/.test(q)) {
    const largest = /largest/.test(q)
    const losers = /loser|worst/.test(q)
    const rows = [...bundle.holdings].filter(item => largest || (losers ? item.unrealised_gain_aud < 0 : item.unrealised_gain_aud > 0)).sort((a,b) => largest ? b.value_aud-a.value_aud : losers ? a.unrealised_gain_aud-b.unrealised_gain_aud : b.unrealised_gain_aud-a.unrealised_gain_aud).slice(0,5)
    return { ...result(largest ? 'Largest loaded positions' : losers ? 'Largest open-position losses' : 'Largest open-position gains', rows.length ? 'Ranked by AUD value across loaded positions. Separate accounts may hold the same ticker. Gains exclude realised sales.' : 'No matching positions in your loaded records.'), metrics: rows.map(item => ({label: item.symbol, value: money(largest ? item.value_aud : item.unrealised_gain_aud)})) }
  }
  if (/currency exposure/.test(q)) {
    const currencies = new Map<string, number>()
    for (const item of bundle.holdings) currencies.set(item.currency, (currencies.get(item.currency) || 0) + item.value_aud)
    return { ...result('Currency exposure', 'Holdings grouped by quote currency, valued in AUD. This does not measure the underlying currency exposure of a hedged fund.', '/app/reports/diversification', 'Explore diversification'), metrics: [...currencies].sort((a,b)=>b[1]-a[1]).map(([label,value])=>({label,value:money(value)})) }
  }
  if (/concentrat|allocat|exposure|diversif|largest/.test(q)) {
    const top = allocationBy(bundle.holdings, 'sector').slice(0, 3)
    return result('Where your exposure sits', top.length ? `${top.map(item => `${item.name}: ${percent(item.percentage).replace(/^\+/, '')}`).join('; ')}. Percentages use the current AUD value of holdings and exclude cash. Missing sectors are grouped as Other.` : 'No holdings are available to calculate sector exposure.', '/app/reports/diversification', 'Explore diversification')
  }
  const tokens = q.replace(/[^a-z0-9.]+/g, ' ').split(' ')
  const holdings = bundle.holdings.filter(item => tokens.includes(item.symbol.toLowerCase()))
  if (holdings.length) {
    const symbol = holdings[0].symbol
    const matching = holdings.filter(item => item.symbol === symbol)
    const value = matching.reduce((sum, item) => sum + item.value_aud, 0)
    const gain = matching.reduce((sum, item) => sum + item.unrealised_gain_aud, 0)
    return result(symbol, `${symbol} is worth ${money(value)} across ${matching.length} loaded position${matching.length === 1 ? '' : 's'}, with ${money(gain)} in unrealised gains. ${summary.invested ? percent(value / summary.invested * 100).replace(/^\+/, '') : '0%'} of invested holdings by value. All amounts are AUD.`, `/app/holdings/${encodeURIComponent(symbol)}`, 'Open holding')
  }
  if (/income|dividend|distribution|interest/.test(q)) return result('Income on record', `${money(summary.income)} from ${incomeTransactions(bundle.transactions).length} recorded income transactions across all loaded dates, converted to AUD using each transaction’s exchange rate. This is recorded income, not a forecast yield.`, '/app/income', 'Open income breakdown')
  if (/cash/.test(q)) return result('Available cash on record', `${money(summary.cash)} in loaded cash balances. Holdings are worth ${money(summary.invested)}; together they total ${money(summary.total)}. All amounts are AUD.`)
  if (/transaction|trade|record/.test(q)) return result('Your transaction history', `${bundle.transactions.length} transactions are loaded. Open the ledger to filter by date, account, type and ticker.`, '/app/transactions', 'Open transactions')
  if (/performance|return|gain|value|portfolio|today|movement/.test(q)) return result('Your portfolio at a glance', `Portfolio value is ${money(summary.total)}, including ${money(summary.cash)} cash. Open-position gains are ${money(summary.unrealised)} (${percent(summary.returnPct)} of cost); recorded income is ${money(summary.income)}. The latest loaded daily movement is ${money(summary.dayChange)}. All amounts are AUD; open-position gains exclude realised sales.`)
  return { title: 'Try a portfolio question', text: 'I don’t have a calculation for that question yet. Try “How much income have I received?”, “Where am I concentrated?” or enter a ticker you hold.' }
}
