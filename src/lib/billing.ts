export const billingPlans = [
  { id: 'basic', stripePlan: 'essential', name: 'Essential', portfolios: 1, annual: 14, annualTotal: 168, monthly: 18.9, navexaAnnual: 20, navexaMonthly: 27, featured: false, features: ['All performance reports', 'Australian tax reporting', 'Custom benchmark', 'Unlimited holdings'] },
  { id: 'standard', stripePlan: 'investor', name: 'Investor', portfolios: 3, annual: 17.5, annualTotal: 210, monthly: 23.8, navexaAnnual: 25, navexaMonthly: 34, featured: true, features: ['Everything in Essential', 'Unrealised CGT planning', 'Diversification and income calendar', 'Portfolio sharing'] },
  { id: 'premium', stripePlan: 'private_wealth', name: 'Private Wealth', portfolios: 10, annual: 28, annualTotal: 336, monthly: 37.8, navexaAnnual: 40, navexaMonthly: 54, featured: false, features: ['Everything in Investor', 'Up to 10 portfolios', 'Deck AI and document inbox', 'Priority data support'] },
] as const

export type BillingPlan = typeof billingPlans[number]
export type BillingInterval = 'monthly' | 'annual'
export type SubscriptionStatus = 'active' | 'trialing' | 'past_due' | 'unpaid' | 'canceled' | 'incomplete' | 'incomplete_expired' | 'paused' | 'inactive'

export type BillingSubscription = {
  plan: string | null
  billing_interval: BillingInterval | null
  status: SubscriptionStatus
  current_period_end: string | null
  cancel_at_period_end: boolean
  stripe_customer_id: string
  stripe_subscription_id: string | null
}

export function annualDiscountAgainstNavexa(plan: BillingPlan) {
  return 1 - plan.annual / plan.navexaAnnual
}

export function monthlyDiscountAgainstNavexa(plan: BillingPlan) {
  return 1 - plan.monthly / plan.navexaMonthly
}

export function annualSavingsPercent(plan: BillingPlan) {
  return Math.round((1 - plan.annualTotal / (plan.monthly * 12)) * 100)
}

export function formatAud(value: number) {
  return new Intl.NumberFormat('en-AU', { minimumFractionDigits: Number.isInteger(value) ? 0 : 2, maximumFractionDigits: 2 }).format(value)
}

export function planForSubscription(plan: string | null | undefined) {
  return billingPlans.find((candidate) => candidate.stripePlan === plan)
}
