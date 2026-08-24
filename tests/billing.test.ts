import { describe, expect, it } from 'vitest'
import { annualDiscountAgainstNavexa, billingPlans } from '../src/lib/billing'

describe('MASTERDECK pricing', () => {
  it('is exactly 30% below each captured Navexa annual monthly-equivalent tier', () => {
    for (const plan of billingPlans) expect(annualDiscountAgainstNavexa(plan)).toBeCloseTo(0.3, 10)
  })

  it('keeps annual bill totals aligned with the Stripe checkout amounts', () => {
    expect(billingPlans.map((plan) => plan.annual * 12)).toEqual([168, 210, 336])
  })
})
