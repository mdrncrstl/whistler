import type Stripe from 'https://esm.sh/stripe@18.5.0?target=denonext'
import { admin, stripe } from './billing.ts'

const REFERRAL_CREDIT_AUD_CENTS = 2000

type ReferralReward = {
  id: string
  attribution_id: string
  beneficiary_user_id: string
  amount_aud_cents: number
  status: 'pending' | 'applied' | 'reversed'
}

async function markAttributionRewarded(attributionId: string) {
  const { data, error } = await admin.from('referral_rewards')
    .select('status')
    .eq('attribution_id', attributionId)
  if (error) throw error
  if (data?.length === 2 && data.every((reward) => reward.status === 'applied')) {
    const { error: updateError } = await admin.from('referral_attributions').update({
      status: 'rewarded',
      rewarded_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq('id', attributionId)
    if (updateError) throw updateError
  }
}

export async function applyPendingReferralRewards(userId: string) {
  const { data: billing, error: billingError } = await admin.from('billing_customers')
    .select('stripe_customer_id')
    .eq('user_id', userId)
    .maybeSingle()
  if (billingError) throw billingError
  if (!billing?.stripe_customer_id) return 0

  const { data, error } = await admin.from('referral_rewards')
    .select('id,attribution_id,beneficiary_user_id,amount_aud_cents,status')
    .eq('beneficiary_user_id', userId)
    .eq('status', 'pending')
  if (error) throw error

  let applied = 0
  for (const reward of (data || []) as ReferralReward[]) {
    const transaction = await stripe.customers.createBalanceTransaction(
      billing.stripe_customer_id,
      {
        amount: -reward.amount_aud_cents,
        currency: 'aud',
        description: 'MASTERDECK referral credit',
        metadata: { referral_reward_id: reward.id, attribution_id: reward.attribution_id },
      },
      { idempotencyKey: `masterdeck-referral-${reward.id}` },
    )
    const { error: updateError } = await admin.from('referral_rewards').update({
      status: 'applied',
      stripe_balance_transaction_id: transaction.id,
      applied_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq('id', reward.id).eq('status', 'pending')
    if (updateError) throw updateError
    applied += 1
    await markAttributionRewarded(reward.attribution_id)
  }
  return applied
}

export async function qualifyReferralFromPaidInvoice(invoice: Stripe.Invoice, stripeEventId: string) {
  if (invoice.amount_paid <= 0 || !invoice.billing_reason?.startsWith('subscription')) return false
  const customerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id
  if (!customerId) return false

  const { data: billing, error: billingError } = await admin.from('billing_customers')
    .select('user_id')
    .eq('stripe_customer_id', customerId)
    .maybeSingle()
  if (billingError) throw billingError
  if (!billing?.user_id) return false

  const { data: attribution, error: attributionError } = await admin.from('referral_attributions')
    .select('id,referrer_user_id,referred_user_id,status')
    .eq('referred_user_id', billing.user_id)
    .maybeSingle()
  if (attributionError) throw attributionError
  if (!attribution || attribution.status === 'reversed') return false

  if (attribution.status === 'signed_up') {
    const { error: updateError } = await admin.from('referral_attributions').update({
      status: 'qualified',
      qualified_at: new Date().toISOString(),
      qualifying_invoice_id: invoice.id,
      updated_at: new Date().toISOString(),
    }).eq('id', attribution.id).eq('status', 'signed_up')
    if (updateError) throw updateError
  }

  const rewards = [
    { attribution_id: attribution.id, beneficiary_user_id: attribution.referrer_user_id, beneficiary_kind: 'referrer', amount_aud_cents: REFERRAL_CREDIT_AUD_CENTS, stripe_event_id: stripeEventId },
    { attribution_id: attribution.id, beneficiary_user_id: attribution.referred_user_id, beneficiary_kind: 'friend', amount_aud_cents: REFERRAL_CREDIT_AUD_CENTS, stripe_event_id: stripeEventId },
  ]
  const { error: rewardsError } = await admin.from('referral_rewards').upsert(rewards, { onConflict: 'attribution_id,beneficiary_kind', ignoreDuplicates: true })
  if (rewardsError) throw rewardsError

  await applyPendingReferralRewards(attribution.referred_user_id)
  await applyPendingReferralRewards(attribution.referrer_user_id)
  return true
}
