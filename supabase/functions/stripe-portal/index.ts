import { admin, authenticatedUser, billingConfigured, corsHeaders, json, safeReturnOrigin, stripe } from '../_shared/billing.ts'

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405)
  if (!billingConfigured) return json({ error: 'Stripe activation is waiting for the MASTERDECK Stripe secret.' }, 503)
  try {
    const user = await authenticatedUser(request)
    const { data, error } = await admin.from('billing_customers').select('stripe_customer_id').eq('user_id', user.id).single()
    if (error || !data?.stripe_customer_id) return json({ error: 'No Stripe billing profile exists yet.' }, 404)
    const body = await request.json().catch(() => ({}))
    const session = await stripe.billingPortal.sessions.create({ customer: data.stripe_customer_id, return_url: `${safeReturnOrigin(body.returnUrl)}/app/billing` })
    return json({ url: session.url })
  } catch (error) { return json({ error: error instanceof Error ? error.message : 'Billing portal could not open.' }, 400) }
})
