import { describe, expect, it } from 'vitest'
import { readCsvSheet, mapCsvReport } from '../src/lib/csvImport'

const fields = { symbol:'0', quantity:'1', average_cost:'2', current_price:'3' }
const tradeFields = { transaction_id:'0', date:'1', type:'2', symbol:'3', quantity:'4', price:'5', fees:'6', fx_rate:'7' }
describe('broker CSV mapping', () => {
  it('maps custom headers and preserves account, quantity and cost', () => {
    const report = mapCsvReport(readCsvSheet('Code,Units,Entry,Last\nVAS,10,90,100'), 'holdings', fields, 'Stake', 'AUD', 'ASX', 'file.csv')
    expect(report.holdings).toHaveLength(1)
    expect(report.holdings[0]).toMatchObject({ account_name:'Stake', symbol:'VAS', quantity:10, average_cost:90, current_price:100 })
    expect(report.warnings.join(' ')).toContain('complete trade history')
  })
  it('preserves foreign exchange and fees, and scopes IDs to the account', () => {
    const sheet = readCsvSheet('ID,Date,Side,Code,Units,Price,Fee,FX\n123,2026-01-15,buy,AAPL,10,200,5,1.5')
    const report = mapCsvReport(sheet, 'transactions', tradeFields, 'US account', 'USD', 'NASDAQ', 'file.csv')
    expect(report.transactions[0]).toMatchObject({ provider_external_id:'csv:US%20account:123', amount:-2000, fees:5, fx_rate:1.5, type:'BUY' })
    expect(() => mapCsvReport(sheet, 'transactions', {...tradeFields, fx_rate:''}, 'US', 'USD', 'NASDAQ', 'file.csv')).toThrow('Match every')
  })
  it.each(['x,2026-02-30,BUY,VAS,1,100,0', 'x,2026-01-15,DIVIDEND,VAS,1,100,0', 'x,2026-01-15,BUY,VAS,0,100,0'])('rejects invalid trade rows without a partial import: %s', row => {
    expect(() => mapCsvReport(readCsvSheet(`id,date,type,symbol,quantity,price,fees\n${row}`), 'transactions', tradeFields, 'Broker', 'AUD', 'ASX', 'x.csv')).toThrow('Row 2')
  })
  it('rejects duplicate tickers and ambiguous decimal commas', () => {
    for (const csv of ['a,b,c,d\nVAS,10,90,100\nvas,2,90,100', 'a,b,c,d\nVAS,10,"90,50",100']) {
      expect(() => mapCsvReport(readCsvSheet(csv), 'holdings', fields, 'Broker', 'AUD', 'ASX', 'x.csv')).toThrow()
    }
  })
})
