import { admin, authenticatedUser, billingConfigured, corsHeadersFor, json, safeReturnOrigin, stripe } from '../_shared/billing.ts'

Deno.serve(async (request) => {
  const requestOrigin = request.headers.get('Origin')
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeadersFor(requestOrigin) })
  if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405, requestOrigin)
  if (!billingConfigured) return json({ error: 'MASTERDECK payments are not active yet. Stripe products and server secrets still need to be connected.' }, 503, requestOrigin)
  try {
    const user = await authenticatedUser(request)
    const { data, error } = await admin.from('billing_customers').select('stripe_customer_id').eq('user_id', user.id).single()
    if (error || !data?.stripe_customer_id) return json({ error: 'No Stripe billing profile exists yet.' }, 404, requestOrigin)
    const body = await request.json().catch(() => ({}))
    const session = await stripe.billingPortal.sessions.create({ customer: data.stripe_customer_id, return_url: `${safeReturnOrigin(body.returnUrl)}/app/billing` })
    return json({ url: session.url }, 200, requestOrigin)
  } catch (error) { return json({ error: error instanceof Error ? error.message : 'Billing portal could not open.' }, 400, requestOrigin) }
})
