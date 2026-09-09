import { describe, expect, it } from 'vitest'
import { readCsvSheet } from '../src/lib/csvImport'
import { recogniseCsv } from '../src/lib/csvRecognise'

const sheet = (csv: string) => readCsvSheet(csv)

describe('CSV recognition', () => {
  it('reads a CommSec-shaped trade export without being told anything', () => {
    const result = recogniseCsv(sheet(
      'Confirmation Number,Trade Date,Transaction Type,ASX Code,Units,Price Per Unit,Brokerage\n' +
      'N1234567,2026-02-14,Buy,CBA.AX,25,162.85,19.95\n'), 'CommSec_Trades_2026.csv')
    expect(result.kind).toBe('transactions')
    expect(result.missing).toEqual([])
    expect(result.confident).toBe(true)
    expect(result.broker?.name).toBe('CommSec')
    expect(result.market).toBe('ASX')
  })

  it('reads a holdings snapshot and picks the holdings shape', () => {
    const result = recogniseCsv(sheet(
      'Ticker,Shares Held,Average Buy Price,Last Price\nVAS,91,92.40,105.03\n'), 'export.csv')
    expect(result.kind).toBe('holdings')
    expect(result.missing).toEqual([])
    expect(result.broker).toBeNull()
  })

  it('takes the currency from a currency column rather than guessing', () => {
    const result = recogniseCsv(sheet(
      'Symbol,Quantity,Average Cost,Current Price,Currency\nAAPL,80,163.40,226.40,USD\n'), 'positions.csv')
    expect(result.currency).toBe('USD')
  })

  it('infers ASX from ticker suffixes when no currency column exists', () => {
    const result = recogniseCsv(sheet(
      'Symbol,Quantity,Average Cost,Current Price\nBHP.AX,205,39.80,43.18\n'), 'positions.csv')
    expect(result.market).toBe('ASX')
    expect(result.currency).toBe('AUD')
  })

  it('prefers the more specific broker name in a filename', () => {
    const result = recogniseCsv(sheet(
      'Symbol,Quantity,Average Cost,Current Price\nTSLA,3,210.00,240.00\n'), 'stake-us-holdings.csv')
    expect(result.broker?.id).toBe('stake-us')
  })

  it('reports what it could not match instead of guessing a column', () => {
    const result = recogniseCsv(sheet('Thing,Widget,Blob\nA,1,2\n'), 'mystery.csv')
    expect(result.confident).toBe(false)
    expect(result.missing.length).toBeGreaterThan(0)
  })

  it('never assigns one column to two fields', () => {
    const result = recogniseCsv(sheet(
      'Symbol,Quantity,Price,Current Price\nCBA,10,160.00,162.85\n'), 'x.csv')
    const used = Object.values(result.mapping).filter(Boolean)
    expect(new Set(used).size).toBe(used.length)
  })

  it('maps the Masterdeck holdings template it ships', () => {
    const result = recogniseCsv(sheet('symbol,quantity,average_cost,current_price\nVAS,10,90,100\n'), 'masterdeck-holdings.csv')
    expect(result.kind).toBe('holdings')
    expect(result.confident).toBe(true)
  })
})
