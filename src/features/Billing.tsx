import { Check, CreditCard, ExternalLink, ShieldCheck } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Badge, Button, Card, PageHeader, SlidingTabs } from '../components/ui'
import { usePortfolio } from '../context/PortfolioContext'
import { useAccountAccess } from '../context/AccountAccessContext'
import { useBillingStatus } from '../hooks/useBillingStatus'
import { annualSavingsPercent, billingPlans as plans, formatAud, planForSubscription } from '../lib/billing'
import { config, edgeUrl } from '../lib/config'
import { canonicalAppOrigin } from '../lib/app-origin'

const paidStatuses = new Set(['active', 'trialing', 'past_due', 'unpaid'])

export function Billing() {
  const { session, demo, setNotice } = usePortfolio()
  const { trialActive, trialExpired, trialDaysRemaining } = useAccountAccess()
  const { subscription, loading, refresh } = useBillingStatus(session, demo)
  const [annual, setAnnual] = useState(true)
  const [busy, setBusy] = useState('')
  const currentPlan = planForSubscription(subscription?.plan)
  const hasBillingProfile = Boolean(subscription?.stripe_customer_id)
  const hasPaidPlan = Boolean(subscription && paidStatuses.has(subscription.status))
  const renewalDate = subscription?.current_period_end
    ? new Intl.DateTimeFormat('en-AU', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(subscription.current_period_end))
    : null
  const accountPlanName = demo ? 'Demo portfolio' : hasPaidPlan ? currentPlan?.name || 'Paid plan' : trialActive ? 'Full-access trial' : 'Free'
  const accountPlanDetail = hasPaidPlan
    ? `${subscription?.billing_interval === 'annual' ? 'Annual' : 'Monthly'} billing${renewalDate ? ` · ${subscription?.cancel_at_period_end ? 'Ends' : 'Renews'} ${renewalDate}` : ''}`
    : trialActive
      ? `${trialDaysRemaining} ${trialDaysRemaining === 1 ? 'day' : 'days'} remaining · no card required`
      : trialExpired ? 'Trial ended · choose a plan to continue' : 'No paid subscription'
  const accountPlanStatus = loading
    ? 'Checking…'
    : subscription?.status === 'trialing'
      ? 'Stripe trial'
      : subscription?.status === 'past_due'
        ? 'Payment due'
        : hasPaidPlan
          ? 'Active'
          : trialActive
            ? `${trialDaysRemaining} days left`
            : trialExpired
              ? 'Trial ended'
              : 'Free'

  useEffect(() => {
    const checkout = new URLSearchParams(window.location.search).get('checkout')
    if (!checkout) return
    window.history.replaceState({}, '', '/deck/billing')
    if (checkout === 'cancelled') {
      setNotice({ tone: 'info', message: 'Checkout was cancelled. Your plan has not changed.' })
      return
    }
    setNotice({ tone: 'success', message: 'Payment received. Syncing your subscription status…' })
    let attempts = 0
    const timer = window.setInterval(async () => {
      attempts += 1
      const next = await refresh().catch(() => null)
      if ((next && paidStatuses.has(next.status)) || attempts >= 8) window.clearInterval(timer)
    }, 1200)
    return () => window.clearInterval(timer)
  }, [refresh, setNotice])

  const requestBilling = async (endpoint: string, body: Record<string, string>, busyKey: string) => {
    if (demo || !session) {
      setNotice({ tone: 'info', message: 'Sign in with your MASTERDECK account to use billing.' })
      return
    }
    setBusy(busyKey)
    try {
      const response = await fetch(edgeUrl(endpoint), {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}`, apikey: config.dataKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...body, returnUrl: canonicalAppOrigin() }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Billing could not open.')
      window.location.assign(data.url)
    } catch (error) {
      setNotice({ tone: 'error', message: error instanceof Error ? error.message : 'Billing could not open.' })
      setBusy('')
    }
  }

  const checkout = (id: string) => requestBilling('stripe-checkout', { plan: id, interval: annual ? 'annual' : 'monthly' }, id)
  const openBilling = () => {
    if (!hasBillingProfile) {
      setNotice({ tone: 'info', message: 'Choose a plan first to create your secure billing profile.' })
      return
    }
    void requestBilling('stripe-portal', {}, 'stripe-portal')
  }
  return <>
    <PageHeader title="Plans & billing" description="Choose the plan that fits your portfolio." actions={<Button variant="ghost" icon={ExternalLink} busy={busy === 'stripe-portal'} disabled={loading || busy === 'stripe-portal'} onClick={openBilling}>Manage billing</Button>} />
    <Card className={`billing-current ${trialExpired && !hasPaidPlan ? 'expired' : ''}`}>
      <span className="billing-current-icon" aria-hidden="true"><ShieldCheck /></span>
      <div className="billing-current-copy"><span>Current plan</span><strong>{accountPlanName}</strong><small>{accountPlanDetail}</small></div>
      <Badge tone={hasPaidPlan || trialActive ? 'success' : trialExpired ? 'warning' : undefined}>{accountPlanStatus}</Badge>
    </Card>
    <div className="billing-plans-heading"><h2>Choose a plan</h2><SlidingTabs className="billing-toggle" options={[{ value: 'monthly', label: 'Monthly' }, { value: 'annual', label: <><span>Annual</span> <em className="billing-save">save 26%</em></> }]} value={annual ? 'annual' : 'monthly'} onChange={(value) => setAnnual(value === 'annual')} ariaLabel="Billing interval" /></div>
    <div className="pricing-grid">{plans.map((plan) => <Card key={plan.id} className={`pricing-card ${plan.featured ? 'featured' : ''}`}>{plan.featured && <Badge tone="success">Recommended</Badge>}<h2>{plan.name}</h2><p>Up to <strong>{plan.portfolios}</strong> {plan.portfolios === 1 ? 'portfolio' : 'portfolios'}</p><div className="plan-price"><strong>${formatAud(annual ? plan.annual : plan.monthly)}</strong><span>AUD / month</span></div><small>{annual ? `$${formatAud(plan.annualTotal)} billed annually · save ${annualSavingsPercent(plan)}%` : 'Billed monthly. Cancel anytime.'}</small><Button variant={plan.featured ? 'primary' : 'secondary'} icon={hasPaidPlan ? ExternalLink : CreditCard} busy={busy === plan.id || busy === 'stripe-portal'} onClick={() => hasPaidPlan ? openBilling() : checkout(plan.id)}>{hasPaidPlan ? 'Manage current plan' : `Choose ${plan.name}`}</Button><ul>{plan.features.map((feature) => <li key={feature}><Check />{feature}</li>)}</ul></Card>)}</div>
    <p className="billing-trust"><ShieldCheck aria-hidden="true" /><span>14-day trial with no card · Payments handled by Stripe</span></p>
  </>
}
