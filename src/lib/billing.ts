export const billingPlans = [
  { id: 'basic', name: 'Essential', portfolios: 1, annual: 14, monthly: 18, navexaAnnual: 20, featured: false, features: ['All performance reports', 'Australian tax reporting', 'Custom benchmark', 'Unlimited holdings'] },
  { id: 'standard', name: 'Investor', portfolios: 3, annual: 17.5, monthly: 23, navexaAnnual: 25, featured: true, features: ['Everything in Essential', 'Unrealised CGT planning', 'Diversification and income calendar', 'Portfolio sharing'] },
  { id: 'premium', name: 'Private Wealth', portfolios: 10, annual: 28, monthly: 36, navexaAnnual: 40, featured: false, features: ['Everything in Investor', 'Up to 10 portfolios', 'Deck AI and document inbox', 'Priority data support'] },
] as const

export function annualDiscountAgainstNavexa(plan: typeof billingPlans[number]) {
  return 1 - plan.annual / plan.navexaAnnual
}
