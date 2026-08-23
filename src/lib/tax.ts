import { differenceInCalendarDays } from 'date-fns'
import type { TaxMatch, TaxMethod, Transaction } from '../types'
import { financialYearBounds } from './portfolio'

interface Lot {
  id: string
  date: string
  quantity: number
  unitCostAud: number
}

const audValue = (transaction: Transaction) => {
  const fx = Number(transaction.fx_rate || 1)
  const gross = Math.abs(Number(transaction.amount || 0)) || Math.abs(Number(transaction.quantity || 0) * Number(transaction.price || 0))
  return gross * fx
}

export function matchTaxLots(transactions: Transaction[], financialYear: string, method: TaxMethod): TaxMatch[] {
  const { start, end } = financialYearBounds(financialYear)
  const bySymbol = new Map<string, Lot[]>()
  const output: TaxMatch[] = []
  const activity = [...transactions]
    .filter((item) => item.symbol && ['BUY', 'SELL'].includes(String(item.type).toUpperCase()))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  activity.forEach((transaction) => {
    const symbol = String(transaction.symbol).toUpperCase()
    const quantity = Math.abs(Number(transaction.quantity || 0))
    if (!quantity) return
    if (String(transaction.type).toUpperCase() === 'BUY') {
      const fees = Math.abs(Number(transaction.fees || 0) * Number(transaction.fx_rate || 1))
      const lots = bySymbol.get(symbol) || []
      lots.push({
        id: transaction.provider_external_id,
        date: transaction.date,
        quantity,
        unitCostAud: (audValue(transaction) + fees) / quantity,
      })
      bySymbol.set(symbol, lots)
      return
    }

    let remaining = quantity
    const lots = bySymbol.get(symbol) || []
    const sellDate = new Date(transaction.date)
    const proceedsTotal = Math.max(0, audValue(transaction) - Math.abs(Number(transaction.fees || 0) * Number(transaction.fx_rate || 1)))
    while (remaining > 0 && lots.some((lot) => lot.quantity > 0)) {
      const candidates = lots.filter((lot) => lot.quantity > 0)
      const lot = method === 'lifo'
        ? candidates.at(-1)!
        : method === 'hifo'
          ? [...candidates].sort((a, b) => b.unitCostAud - a.unitCostAud)[0]
          : candidates[0]
      const matchedQuantity = Math.min(remaining, lot.quantity)
      const proceedsAud = proceedsTotal * (matchedQuantity / quantity)
      const costBaseAud = matchedQuantity * lot.unitCostAud
      const holdingDays = differenceInCalendarDays(sellDate, new Date(lot.date))
      if (sellDate >= start && sellDate <= end) {
        output.push({
          sellId: transaction.provider_external_id,
          symbol,
          soldAt: transaction.date,
          boughtAt: lot.date,
          quantity: matchedQuantity,
          proceedsAud,
          costBaseAud,
          gainAud: proceedsAud - costBaseAud,
          discountEligible: holdingDays >= 365,
          holdingDays,
        })
      }
      lot.quantity -= matchedQuantity
      remaining -= matchedQuantity
    }
  })
  return output
}

export function taxSummary(matches: TaxMatch[]) {
  const gains = matches.filter((item) => item.gainAud > 0).reduce((sum, item) => sum + item.gainAud, 0)
  const losses = matches.filter((item) => item.gainAud < 0).reduce((sum, item) => sum + Math.abs(item.gainAud), 0)
  const discountEligibleGains = matches
    .filter((item) => item.gainAud > 0 && item.discountEligible)
    .reduce((sum, item) => sum + item.gainAud, 0)
  const net = gains - losses
  const estimatedDiscountedNet = Math.max(0, net - Math.min(discountEligibleGains * 0.5, Math.max(0, net)))
  return { gains, losses, net, discountEligibleGains, estimatedDiscountedNet }
}
