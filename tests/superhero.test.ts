import { describe, expect, it } from 'vitest'
import { parseContractNoteText, parseSuperheroCsv } from '../src/lib/superhero'

describe('Superhero report parsing', () => {
  it('parses combined holdings, cash and transaction sections', () => {
    const csv = `Portfolio holdings\nSymbol,Security Name,Quantity,Average Cost,Current Price,Market Value,Currency,Exchange\nVGS,Vanguard MSCI Index ETF,12,110.50,145.20,1742.40,AUD,ASX\n\nCash balances\nCurrency,Balance,Account Name\nAUD,245.30,Superhero\n\nTransactions\nTransaction Date,Transaction Type,Symbol,Quantity,Price,Amount,Brokerage,Currency,Reference\n01/08/2026,BUY,CBA,5,160,-800,5,AUD,abc-1\n02/08/2026,DIVIDEND,VGS,0,0,12.50,0,AUD,abc-2`
    const report = parseSuperheroCsv(csv, 'full-portfolio.csv')
    expect(report.holdings).toHaveLength(1)
    expect(report.holdings[0]).toMatchObject({ symbol: 'VGS', quantity: 12, value: 1742.4 })
    expect(report.cash).toEqual([{ account_name: 'Superhero', currency: 'AUD', balance: 245.3, fx_rate: 1 }])
    expect(report.transactions).toHaveLength(2)
    expect(report.transactions[0]).toMatchObject({ type: 'BUY', symbol: 'CBA', fees: 5 })
    expect(report.transactions[1].type).toBe('DIVIDEND')
  })

  it('deduplicates repeated transaction identifiers', () => {
    const csv = `Date,Type,Symbol,Quantity,Price,Amount,Reference\n01/08/2026,BUY,VAS,2,100,-200,same\n01/08/2026,BUY,VAS,2,100,-200,same`
    expect(parseSuperheroCsv(csv).transactions).toHaveLength(1)
  })

  it('extracts a supported Superhero contract note', () => {
    const report = parseContractNoteText('Trade Date: 04/08/2026 BUY ASX Code: BHP Quantity: 25 Price: $43.10 Brokerage: $5.00 Net Consideration: $1082.50', 'bhp-note.pdf')
    expect(report.warnings).toHaveLength(0)
    expect(report.transactions[0]).toMatchObject({ type: 'BUY', symbol: 'BHP', quantity: 25, price: 43.1, fees: 5, amount: -1082.5 })
  })

  it('rejects unsupported tables without inventing records', () => {
    const report = parseSuperheroCsv('Hello,World\nNot,A portfolio')
    expect(report.holdings).toHaveLength(0)
    expect(report.transactions).toHaveLength(0)
    expect(report.warnings[0]).toContain('No supported')
  })
})
