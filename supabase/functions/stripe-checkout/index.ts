import { admin, authenticatedUser, billingConfigured, corsHeaders, json, priceIdForPlan, safeReturnOrigin, stripe, type CheckoutInterval, type CheckoutPlan } from '../_shared/billing.ts'

const plans = {
  basic: { plan: 'essential' },
  standard: { plan: 'investor' },
  premium: { plan: 'private_wealth' },
} as const

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405)
  if (!billingConfigured) return json({ error: 'MASTERDECK payments are not active yet. Stripe products and server secrets still need to be connected.' }, 503)
  try {
    const user = await authenticatedUser(request)
    const body = await request.json()
    const plan = body.plan as CheckoutPlan
    const selected = plans[plan]
    const interval: CheckoutInterval = body.interval === 'monthly' ? 'monthly' : 'annual'
    if (!selected) return json({ error: 'Unknown plan.' }, 400)

    const { data: existing } = await admin.from('billing_customers').select('stripe_customer_id,stripe_subscription_id,status').eq('user_id', user.id).maybeSingle()
    if (existing?.stripe_subscription_id && ['active', 'trialing', 'past_due', 'unpaid'].includes(existing.status)) return json({ error: 'You already have a subscription. Use Manage billing to change or cancel it.' }, 409)
    let customerId = existing?.stripe_customer_id as string | undefined
    if (!customerId) {
      const customer = await stripe.customers.create({ email: user.email, name: user.user_metadata?.full_name, metadata: { user_id: user.id } })
      customerId = customer.id
      const { error } = await admin.from('billing_customers').upsert({ user_id: user.id, stripe_customer_id: customerId, status: 'inactive' })
      if (error) throw error
    }

    const origin = safeReturnOrigin(body.returnUrl)
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription', customer: customerId, client_reference_id: user.id,
      allow_promotion_codes: true,
      line_items: [{ quantity: 1, price: priceIdForPlan(plan, interval) }],
      subscription_data: { metadata: { user_id: user.id, plan: selected.plan, billing_interval: interval } },
      metadata: { user_id: user.id, plan: selected.plan, billing_interval: interval },
      success_url: `${origin}/app/billing?checkout=success`, cancel_url: `${origin}/app/billing?checkout=cancelled`,
    })
    return json({ url: session.url })
  } catch (error) { return json({ error: error instanceof Error ? error.message : 'Checkout could not start.' }, 400) }
})
