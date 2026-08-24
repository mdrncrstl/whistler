import Stripe from 'https://esm.sh/stripe@18.5.0?target=denonext'
import { admin, billingConfigured, stripe } from '../_shared/billing.ts'

const cryptoProvider = Stripe.createSubtleCryptoProvider()

async function saveSubscription(subscription: Stripe.Subscription, fallbackUserId?: string) {
  const customerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id
  let userId = subscription.metadata.user_id || fallbackUserId
  if (!userId) {
    const { data } = await admin.from('billing_customers').select('user_id').eq('stripe_customer_id', customerId).maybeSingle()
    userId = data?.user_id
  }
  if (!userId) throw new Error('Subscription is missing a MASTERDECK user reference.')
  const item = subscription.items.data[0]
  const { error } = await admin.from('billing_customers').upsert({
    user_id: userId, stripe_customer_id: customerId, stripe_subscription_id: subscription.id,
    plan: subscription.metadata.plan || null,
    billing_interval: subscription.metadata.billing_interval || (item?.price.recurring?.interval === 'year' ? 'annual' : 'monthly'),
    status: subscription.status, current_period_end: item?.current_period_end ? new Date(item.current_period_end * 1000).toISOString() : null,
    cancel_at_period_end: subscription.cancel_at_period_end, updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id' })
  if (error) throw error
}

Deno.serve(async (request) => {
  if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 })
  if (!billingConfigured || !Deno.env.get('STRIPE_WEBHOOK_SIGNING_SECRET')) return new Response('Stripe webhook is not activated.', { status: 503 })
  try {
    const rawBody = await request.text()
    const signature = request.headers.get('Stripe-Signature')
    const event = await stripe.webhooks.constructEventAsync(rawBody, signature || '', Deno.env.get('STRIPE_WEBHOOK_SIGNING_SECRET') || '', undefined, cryptoProvider)
    if (event.type === 'checkout.session.completed') {
      const checkout = event.data.object as Stripe.Checkout.Session
      if (checkout.subscription) {
        const subscription = await stripe.subscriptions.retrieve(String(checkout.subscription))
        await saveSubscription(subscription, checkout.client_reference_id || checkout.metadata?.user_id)
      }
    }
    if (event.type === 'customer.subscription.updated' || event.type === 'customer.subscription.deleted' || event.type === 'customer.subscription.created') await saveSubscription(event.data.object as Stripe.Subscription)
    return new Response(JSON.stringify({ received: true }), { status: 200, headers: { 'Content-Type': 'application/json' } })
  } catch (error) { return new Response(error instanceof Error ? error.message : 'Invalid webhook.', { status: 400 }) }
})
