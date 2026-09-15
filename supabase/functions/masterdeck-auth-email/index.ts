import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { Webhook } from 'npm:standardwebhooks@1.0.0'
import { buildAuthEmailMessage } from '../_shared/masterdeck-email.ts'

type AuthEmailHookPayload = {
  user: {
    email?: string | null
  }
  email_data: {
    token?: string
    token_hash?: string
    redirect_to?: string
    email_action_type?: string
    site_url?: string
  }
}

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function hookSecret() {
  const secret = Deno.env.get('SEND_EMAIL_HOOK_SECRET') || ''
  return secret.replace(/^v1,whsec_/, '')
}

function confirmationUrl({
  tokenHash,
  action,
  redirectTo,
}: {
  tokenHash?: string
  action: string
  redirectTo?: string
}) {
  if (!tokenHash) return undefined
  const base = (Deno.env.get('SUPABASE_URL') || 'https://cbfettdbdjlgbjxzwvps.supabase.co').replace(/\/$/, '')
  const url = new URL(`${base}/auth/v1/verify`)
  url.searchParams.set('token', tokenHash)
  url.searchParams.set('type', action)
  url.searchParams.set('redirect_to', redirectTo || 'https://masterdeck.app/auth/callback')
  return url.toString()
}

async function sendEmail({
  email,
  action,
  token,
  tokenHash,
  redirectTo,
  idempotencyKey,
}: {
  email: string
  action: string
  token?: string
  tokenHash?: string
  redirectTo?: string
  idempotencyKey?: string
}) {
  const apiKey = Deno.env.get('RESEND_API_KEY')
  const from = Deno.env.get('AUTH_FROM_EMAIL') || Deno.env.get('MARKETING_FROM_EMAIL')
  if (!apiKey || !from || !hookSecret()) throw new Error('Masterdeck auth email is not configured.')

  const message = buildAuthEmailMessage({
    action,
    token,
    confirmationUrl: confirmationUrl({ tokenHash, action, redirectTo }),
  })
  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  }
  if (idempotencyKey) headers['Idempotency-Key'] = idempotencyKey

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      from,
      to: [email],
      reply_to: Deno.env.get('AUTH_REPLY_TO') || undefined,
      subject: message.subject,
      html: message.html,
      text: message.text,
    }),
  })
  if (!response.ok) {
    const detail = await response.text().catch(() => '')
    throw new Error(`Resend rejected the auth email (${response.status}). ${detail.slice(0, 200)}`)
  }
}

Deno.serve(async (request) => {
  if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405)

  try {
    const secret = hookSecret()
    if (!secret) throw new Error('SEND_EMAIL_HOOK_SECRET is not configured.')
    const rawPayload = await request.text()
    const webhook = new Webhook(secret)
    const payload = webhook.verify(rawPayload, Object.fromEntries(request.headers)) as AuthEmailHookPayload
    const email = payload.user?.email?.trim().toLowerCase()
    const action = payload.email_data?.email_action_type || 'signup'
    if (!email) return json({ error: 'The auth event has no recipient email.' }, 400)

    await sendEmail({
      email,
      action,
      token: payload.email_data?.token,
      tokenHash: payload.email_data?.token_hash,
      redirectTo: payload.email_data?.redirect_to,
      idempotencyKey: request.headers.get('webhook-id') || undefined,
    })
    return json({}, 200)
  } catch (error) {
    console.error('Masterdeck auth email failed:', error instanceof Error ? error.message : 'unknown error')
    return json({ error: 'The Masterdeck auth email could not be sent.' }, 500)
  }
})
