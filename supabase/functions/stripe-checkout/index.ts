import { admin, authenticatedUser, billingConfigured, corsHeaders, json, safeReturnOrigin, stripe } from '../_shared/billing.ts'

const plans = {
  basic: { plan: 'essential', name: 'MASTERDECK Essential', annual: 16800, monthly: 1800 },
  standard: { plan: 'investor', name: 'MASTERDECK Investor', annual: 21000, monthly: 2300 },
  premium: { plan: 'private_wealth', name: 'MASTERDECK Private Wealth', annual: 33600, monthly: 3600 },
} as const

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405)
  if (!billingConfigured) return json({ error: 'Stripe activation is waiting for the MASTERDECK Stripe secret.' }, 503)
  try {
    const user = await authenticatedUser(request)
    const body = await request.json()
    const selected = plans[body.plan as keyof typeof plans]
    const interval = body.interval === 'monthly' ? 'monthly' : 'annual'
    if (!selected) return json({ error: 'Unknown plan.' }, 400)

    const { data: existing } = await admin.from('billing_customers').select('stripe_customer_id').eq('user_id', user.id).maybeSingle()
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
      line_items: [{ quantity: 1, price_data: { currency: 'aud', unit_amount: selected[interval], recurring: { interval: interval === 'annual' ? 'year' : 'month' }, product_data: { name: selected.name, metadata: { plan: selected.plan } } } }],
      subscription_data: { metadata: { user_id: user.id, plan: selected.plan, billing_interval: interval } },
      metadata: { user_id: user.id, plan: selected.plan, billing_interval: interval },
      success_url: `${origin}/app/billing?checkout=success`, cancel_url: `${origin}/app/billing?checkout=cancelled`,
    })
    return json({ url: session.url })
  } catch (error) { return json({ error: error instanceof Error ? error.message : 'Checkout could not start.' }, 400) }
})
