import { Check, CreditCard, ExternalLink, ShieldCheck } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Badge, Button, Card, PageHeader } from '../components/ui'
import { usePortfolio } from '../context/PortfolioContext'
import { useAccountAccess } from '../context/AccountAccessContext'
import { useBillingStatus } from '../hooks/useBillingStatus'
import { annualSavingsPercent, billingPlans as plans, formatAud, planForSubscription } from '../lib/billing'
import { config, edgeUrl } from '../lib/config'

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
  const accountPlanName = demo ? 'Demo workspace' : hasPaidPlan ? currentPlan?.name || 'Paid plan' : trialActive ? 'Full-access trial' : 'Free'
  const accountPlanDetail = hasPaidPlan
    ? `${subscription?.billing_interval === 'annual' ? 'Annual' : 'Monthly'} billing${renewalDate ? ` · ${subscription?.cancel_at_period_end ? 'Ends' : 'Renews'} ${renewalDate}` : ''}`
    : trialActive
      ? `${trialDaysRemaining} ${trialDaysRemaining === 1 ? 'day' : 'days'} remaining · no card required · nothing auto-renews`
      : trialExpired ? 'Your free trial has ended. Choose a plan to continue.' : 'Choose a plan below when you are ready.'

  useEffect(() => {
    const checkout = new URLSearchParams(window.location.search).get('checkout')
    if (!checkout) return
    window.history.replaceState({}, '', '/app/billing')
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
        body: JSON.stringify({ ...body, returnUrl: window.location.origin }),
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
    <PageHeader title="Plans & billing" description="Full portfolio intelligence, priced exactly 30% below comparable Navexa plans." actions={<div className="page-actions"><Button variant="ghost" icon={ExternalLink} busy={busy === 'stripe-portal'} disabled={loading || busy === 'stripe-portal'} onClick={openBilling}>Manage billing</Button><Badge tone="success">Payments secured by Stripe</Badge></div>} />
    {(trialActive || trialExpired) && !hasPaidPlan && <Card className={`billing-trial-callout ${trialExpired ? 'expired' : ''}`}><ShieldCheck/><div><strong>{trialActive ? 'Your 14-day trial is already running.' : 'Your 14-day trial has ended.'}</strong><p>{trialActive ? 'You have full access now. No card is stored and nothing will renew automatically—only choose a plan if you want to continue after the trial.' : 'Your records are safe. Choose a plan below to restore access to your workspace.'}</p></div></Card>}
    <Card className="billing-current">
      <div><span>Current plan</span><strong>{accountPlanName}</strong><small>{accountPlanDetail}</small></div>
      <Badge tone={hasPaidPlan || trialActive ? 'success' : undefined}>{loading ? 'Checking…' : subscription?.status === 'trialing' ? 'Stripe trial' : subscription?.status === 'past_due' ? 'Payment due' : hasPaidPlan ? 'Active' : trialActive ? `${trialDaysRemaining} days left` : trialExpired ? 'Trial ended' : 'Free'}</Badge>
    </Card>
    <div className="billing-toggle" role="group" aria-label="Billing interval"><button type="button" aria-pressed={!annual} className={!annual ? 'active' : ''} onClick={() => setAnnual(false)}>Monthly</button><button type="button" aria-pressed={annual} className={annual ? 'active' : ''} onClick={() => setAnnual(true)}>Annual <span>save 26%</span></button></div>
    <div className="pricing-grid">{plans.map((plan) => <Card key={plan.id} className={`pricing-card ${plan.featured ? 'featured' : ''}`}>{plan.featured && <Badge tone="success">Recommended</Badge>}<h2>{plan.name}</h2><p>Up to <strong>{plan.portfolios}</strong> {plan.portfolios === 1 ? 'portfolio' : 'portfolios'}</p><div className="plan-price"><strong>${formatAud(annual ? plan.annual : plan.monthly)}</strong><span>AUD / month</span></div><small>{annual ? `$${formatAud(plan.annualTotal)} billed annually · save ${annualSavingsPercent(plan)}%` : 'Billed monthly. Cancel anytime.'}</small><Button variant={plan.featured ? 'primary' : 'secondary'} icon={hasPaidPlan ? ExternalLink : CreditCard} busy={busy === plan.id || busy === 'stripe-portal'} onClick={() => hasPaidPlan ? openBilling() : checkout(plan.id)}>{hasPaidPlan ? 'Manage current plan' : `Choose ${plan.name}`}</Button><ul>{plan.features.map((feature) => <li key={feature}><Check />{feature}</li>)}</ul></Card>)}</div>
    <div className="billing-trust"><span><ShieldCheck />14 days free with no card</span><span><CreditCard />Card details never touch MASTERDECK</span><span><ExternalLink />Stripe-hosted checkout and portal</span></div>
  </>
}
