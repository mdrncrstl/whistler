import Stripe from 'https://esm.sh/stripe@18.5.0?target=denonext'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4'

const priceEnvironment = {
  basic: { monthly: 'STRIPE_PRICE_ESSENTIAL_MONTHLY', annual: 'STRIPE_PRICE_ESSENTIAL_ANNUAL' },
  standard: { monthly: 'STRIPE_PRICE_INVESTOR_MONTHLY', annual: 'STRIPE_PRICE_INVESTOR_ANNUAL' },
  premium: { monthly: 'STRIPE_PRICE_PRIVATE_WEALTH_MONTHLY', annual: 'STRIPE_PRICE_PRIVATE_WEALTH_ANNUAL' },
} as const

export type CheckoutPlan = keyof typeof priceEnvironment
export type CheckoutInterval = 'monthly' | 'annual'

export const stripeConfigured = Boolean(Deno.env.get('STRIPE_SECRET_KEY'))
export const billingConfigured = stripeConfigured && Object.values(priceEnvironment).every((prices) => Object.values(prices).every((name) => Boolean(Deno.env.get(name))))
export const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || 'sk_test_masterdeck_not_configured')
export const admin = createClient(Deno.env.get('SUPABASE_URL') || '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '', { auth: { persistSession: false } })

export const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('APP_ORIGIN') || 'https://masterdeck-eosin.vercel.app',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Vary': 'Origin',
}

export const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

export function priceIdForPlan(plan: CheckoutPlan, interval: CheckoutInterval) {
  return Deno.env.get(priceEnvironment[plan][interval]) || ''
}

export async function authenticatedUser(request: Request) {
  const header = request.headers.get('Authorization') || ''
  const token = header.replace(/^Bearer\s+/i, '')
  if (!token) throw new Error('Authentication required.')
  const { data, error } = await admin.auth.getUser(token)
  if (error || !data.user) throw new Error('Your session is no longer valid.')
  return data.user
}

export function safeReturnOrigin(value: unknown) {
  const configured = Deno.env.get('APP_ORIGIN') || 'https://masterdeck-eosin.vercel.app'
  try {
    const candidate = new URL(String(value || configured))
    if (candidate.origin === configured || ['http://localhost:5173', 'http://127.0.0.1:5173'].includes(candidate.origin)) return candidate.origin
  } catch { /* use configured origin */ }
  return configured
}
