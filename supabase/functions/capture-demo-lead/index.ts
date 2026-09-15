import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient, type User } from 'https://esm.sh/@supabase/supabase-js@2.57.4'

const appOrigin = 'https://masterdeck.app'
const allowedOrigins = new Set([
  appOrigin,
  'https://www.masterdeck.app',
  'http://localhost:4173',
  'http://127.0.0.1:4173',
  'http://localhost:4176',
  'http://127.0.0.1:4176',
])

function corsHeaders(origin: string | null) {
  return {
    'Access-Control-Allow-Origin': origin && allowedOrigins.has(origin) ? origin : appOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Credentials': 'true',
    'Content-Type': 'application/json',
    Vary: 'Origin',
  }
}

function json(body: unknown, status: number, origin: string | null) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders(origin) })
}

function secretKey() {
  const secretKeys = Deno.env.get('SUPABASE_SECRET_KEYS')
  if (secretKeys) {
    try {
      const parsed = JSON.parse(secretKeys) as Record<string, string>
      if (parsed.default) return parsed.default
    } catch { /* fall through to the legacy secret name */ }
  }
  return Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
}

const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
const admin = createClient(supabaseUrl, secretKey(), { auth: { persistSession: false } })

async function authenticatedUser(request: Request): Promise<User> {
  const token = (request.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '')
  if (!token) throw new Error('Authentication required.')
  const { data, error } = await admin.auth.getUser(token)
  if (error || !data.user) throw new Error('Your session is no longer valid.')
  return data.user
}

function welcomeEmailHtml() {
  return `<!doctype html>
<html lang="en"><body style="margin:0;background:#f4f8f6;color:#10251e;font-family:Arial,sans-serif">
  <div style="max-width:560px;margin:32px auto;padding:36px 32px;background:#fff;border:1px solid #d9e6df;border-radius:16px">
    <p style="margin:0 0 24px;color:#138a68;font-size:12px;font-weight:700;letter-spacing:.12em">MASTERDECK</p>
    <h1 style="margin:0 0 14px;font-size:28px;line-height:1.15">Your demo is ready.</h1>
    <p style="margin:0 0 24px;color:#5d6f68;font-size:16px;line-height:1.6">See your portfolio value, returns, income and Australian tax views in one place.</p>
    <a href="${appOrigin}/deck" style="display:inline-block;padding:13px 18px;border-radius:9px;background:#168b69;color:#fff;text-decoration:none;font-weight:700">Open Masterdeck</a>
    <p style="margin:28px 0 0;color:#87958f;font-size:12px;line-height:1.5">You’re receiving this because you opted in to Masterdeck updates. Reply to this email if you’d like to stop receiving them.</p>
  </div>
</body></html>`
}

async function sendWelcomeEmail(email: string) {
  const apiKey = Deno.env.get('RESEND_API_KEY')
  const from = Deno.env.get('MARKETING_FROM_EMAIL')
  if (!apiKey || !from) return 'not_configured' as const

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from,
      to: [email],
      reply_to: Deno.env.get('MARKETING_REPLY_TO') || undefined,
      subject: 'Your Masterdeck demo is ready',
      html: welcomeEmailHtml(),
    }),
  })
  return response.ok ? 'sent' as const : 'failed' as const
}

Deno.serve(async (request) => {
  const origin = request.headers.get('Origin')
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(origin) })
  if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405, origin)

  try {
    const user = await authenticatedUser(request)
    if (!user.email) return json({ error: 'Your account does not have an email address.' }, 400, origin)
    const body = await request.json().catch(() => ({})) as { marketingOptIn?: unknown; source?: unknown }
    if (body.source !== undefined && body.source !== 'public_demo') return json({ error: 'Unknown lead source.' }, 400, origin)

    const now = new Date().toISOString()
    const email = user.email.trim().toLowerCase()
    const { data: existing, error: lookupError } = await admin.from('masterdeck_demo_leads')
      .select('first_demo_opened_at,marketing_opt_in,marketing_opted_in_at,welcome_email_sent_at,email_unsubscribed_at')
      .eq('user_id', user.id)
      .eq('source', 'public_demo')
      .maybeSingle()
    if (lookupError) throw lookupError

    const requestedOptIn = body.marketingOptIn === true
    const marketingOptIn = Boolean(existing?.marketing_opt_in || requestedOptIn)
    const optedInAt = existing?.marketing_opted_in_at || (requestedOptIn ? now : null)
    const { error: upsertError } = await admin.from('masterdeck_demo_leads').upsert({
      user_id: user.id,
      email,
      source: 'public_demo',
      first_demo_opened_at: existing?.first_demo_opened_at || now,
      last_demo_opened_at: now,
      marketing_opt_in: marketingOptIn,
      marketing_opted_in_at: optedInAt,
      email_unsubscribed_at: requestedOptIn ? null : existing?.email_unsubscribed_at || null,
      welcome_email_sent_at: existing?.welcome_email_sent_at || null,
      updated_at: now,
    }, { onConflict: 'user_id,source' })
    if (upsertError) throw upsertError

    let emailStatus: 'sent' | 'failed' | 'not_configured' | 'skipped' = 'skipped'
    if (marketingOptIn && !existing?.welcome_email_sent_at && !existing?.email_unsubscribed_at) {
      emailStatus = await sendWelcomeEmail(email)
      if (emailStatus === 'sent') {
        const { error: sentError } = await admin.from('masterdeck_demo_leads')
          .update({ welcome_email_sent_at: new Date().toISOString(), updated_at: new Date().toISOString() })
          .eq('user_id', user.id)
          .eq('source', 'public_demo')
        if (sentError) throw sentError
      }
    }

    return json({ ok: true, emailStatus }, 200, origin)
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Demo lead could not be recorded.' }, 400, origin)
  }
})
