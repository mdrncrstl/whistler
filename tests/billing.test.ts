import { describe, expect, it } from 'vitest'
import { annualDiscountAgainstNavexa, annualSavingsPercent, billingPlans, formatAud, monthlyDiscountAgainstNavexa } from '../src/lib/billing'

describe('MASTERDECK pricing', () => {
  it('is exactly 30% below each captured Navexa annual monthly-equivalent tier', () => {
    for (const plan of billingPlans) expect(annualDiscountAgainstNavexa(plan)).toBeCloseTo(0.3, 10)
  })

  it('keeps annual bill totals aligned with the Stripe checkout amounts', () => {
    expect(billingPlans.map((plan) => plan.annualTotal)).toEqual([168, 210, 336])
  })

  it('is exactly 30% below each captured Navexa monthly tier', () => {
    for (const plan of billingPlans) expect(monthlyDiscountAgainstNavexa(plan)).toBeCloseTo(0.3, 10)
  })

  it('formats fractional AUD prices and calculates annual savings', () => {
    expect(billingPlans.map((plan) => formatAud(plan.monthly))).toEqual(['18.90', '23.80', '37.80'])
    expect(billingPlans.map(annualSavingsPercent)).toEqual([26, 26, 26])
  })
})
