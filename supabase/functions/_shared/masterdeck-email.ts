export const MASTERDECK_APP_ORIGIN = 'https://masterdeck.app'
export const MASTERDECK_LOGO_URL = `${MASTERDECK_APP_ORIGIN}/brand/masterdeck-logo.png`

export type AuthEmailAction =
  | 'signup'
  | 'magiclink'
  | 'recovery'
  | 'invite'
  | 'email_change'
  | 'reauthentication'

type AuthEmailCopy = {
  subject: string
  preview: string
  eyebrow: string
  title: string
  body: string
  button?: string
  fallback?: string
}

const authEmailCopy: Record<AuthEmailAction, AuthEmailCopy> = {
  signup: {
    subject: 'Confirm your Masterdeck account',
    preview: 'One clear view of every investment.',
    eyebrow: 'WELCOME TO MASTERDECK',
    title: 'Every investment. One clear view.',
    body: 'Confirm your email to finish creating your Masterdeck account and open your workspace.',
    button: 'Confirm email',
    fallback: 'If you did not create a Masterdeck account, you can safely ignore this email.',
  },
  magiclink: {
    subject: 'Your Masterdeck sign-in link',
    preview: 'Use this secure link to open Masterdeck.',
    eyebrow: 'SIGN IN TO MASTERDECK',
    title: 'Your workspace is ready.',
    body: 'Use the button below to sign in securely. This link can only be used once and expires shortly.',
    button: 'Sign in to Masterdeck',
    fallback: 'If you did not request a sign-in link, you can safely ignore this email.',
  },
  recovery: {
    subject: 'Reset your Masterdeck password',
    preview: 'Choose a new password for your Masterdeck account.',
    eyebrow: 'MASTERDECK ACCOUNT',
    title: 'Choose a new password.',
    body: 'We received a request to reset your Masterdeck password. Use the button below to continue.',
    button: 'Reset password',
    fallback: 'If you did not request a password reset, you can safely ignore this email.',
  },
  invite: {
    subject: 'You have been invited to Masterdeck',
    preview: 'Open your Masterdeck workspace.',
    eyebrow: 'MASTERDECK INVITATION',
    title: 'Your portfolio workspace awaits.',
    body: 'Use the button below to accept your invitation and open Masterdeck.',
    button: 'Accept invitation',
    fallback: 'If you were not expecting this invitation, you can safely ignore this email.',
  },
  email_change: {
    subject: 'Confirm your new Masterdeck email',
    preview: 'Confirm the new email address for your account.',
    eyebrow: 'MASTERDECK ACCOUNT',
    title: 'Confirm your new email.',
    body: 'Use the button below to confirm this email address for your Masterdeck account.',
    button: 'Confirm new email',
    fallback: 'If you did not request this change, contact Masterdeck support.',
  },
  reauthentication: {
    subject: 'Your Masterdeck verification code',
    preview: 'Use this code to continue in Masterdeck.',
    eyebrow: 'MASTERDECK SECURITY',
    title: 'Confirm it is you.',
    body: 'Enter this verification code in Masterdeck to continue.',
    fallback: 'If you did not request this code, you can safely ignore this email.',
  },
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

export function normalizeAuthEmailAction(value: string): AuthEmailAction {
  if (Object.prototype.hasOwnProperty.call(authEmailCopy, value)) return value as AuthEmailAction
  if (value === 'magic_link') return 'magiclink'
  return 'signup'
}

function emailShell({ preview, content }: { preview: string; content: string }) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta name="color-scheme" content="light">
    <meta name="supported-color-schemes" content="light">
    <title>Masterdeck</title>
  </head>
  <body style="margin:0;background:#f2f7f4;color:#102c25;font-family:Arial,Helvetica,sans-serif;-webkit-font-smoothing:antialiased">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">${escapeHtml(preview)}</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;background:#f2f7f4">
      <tr>
        <td align="center" style="padding:32px 16px">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;border-collapse:separate;background:#ffffff;border:1px solid #d7e6df;border-radius:18px;overflow:hidden">
            <tr>
              <td style="height:5px;background:#12a675;font-size:0;line-height:0">&nbsp;</td>
            </tr>
            <tr>
              <td style="padding:32px 36px 36px">
                <a href="${MASTERDECK_APP_ORIGIN}" style="display:inline-block;text-decoration:none">
                  <img src="${MASTERDECK_LOGO_URL}" width="190" alt="Masterdeck" style="display:block;width:190px;max-width:100%;height:auto;border:0">
                </a>
                ${content}
              </td>
            </tr>
          </table>
          <p style="margin:16px 0 0;color:#71827b;font-size:12px;line-height:1.5;text-align:center">Masterdeck · Portfolio tracking and Australian tax records</p>
        </td>
      </tr>
    </table>
  </body>
</html>`
}

export function buildAuthEmailMessage({
  action,
  confirmationUrl,
  token,
}: {
  action: string
  confirmationUrl?: string
  token?: string
}) {
  const copy = authEmailCopy[normalizeAuthEmailAction(action)]
  const escapedUrl = confirmationUrl ? escapeHtml(confirmationUrl) : ''
  const button = copy.button && escapedUrl
    ? `<a href="${escapedUrl}" style="display:inline-block;padding:14px 20px;border-radius:10px;background:#0c9d73;color:#ffffff;font-size:15px;font-weight:700;line-height:1;text-decoration:none">${copy.button}</a>`
    : ''
  const code = token
    ? `<div style="margin:22px 0;padding:18px 20px;border:1px solid #cfe1d9;border-radius:12px;background:#f4faf7;color:#0b7e5e;font-size:28px;font-weight:700;letter-spacing:.18em;text-align:center">${escapeHtml(token)}</div>`
    : ''
  const fallback = copy.fallback
    ? `<p style="margin:24px 0 0;color:#71827b;font-size:12px;line-height:1.55">${copy.fallback}</p>`
    : ''
  const linkFallback = escapedUrl && copy.button
    ? `<p style="margin:24px 0 0;color:#71827b;font-size:12px;line-height:1.55">If the button does not work, copy this link into your browser:<br><a href="${escapedUrl}" style="color:#087b5d;word-break:break-all">${escapedUrl}</a></p>`
    : ''
  const html = emailShell({
    preview: copy.preview,
    content: `
                <p style="margin:36px 0 12px;color:#0c9d73;font-size:11px;font-weight:700;letter-spacing:.16em">${copy.eyebrow}</p>
                <h1 style="margin:0 0 14px;color:#102c25;font-size:30px;line-height:1.15;letter-spacing:-.03em">${copy.title}</h1>
                <p style="margin:0;color:#526c62;font-size:16px;line-height:1.6">${copy.body}</p>
                ${code}
                ${button ? `<div style="margin:28px 0 0">${button}</div>` : ''}
                ${linkFallback}
                ${fallback}`,
  })
  return { subject: copy.subject, html, text: `${copy.title}\n\n${copy.body}${token ? `\n\nVerification code: ${token}` : ''}${confirmationUrl ? `\n\n${confirmationUrl}` : ''}` }
}

export function buildDemoWelcomeEmailHtml() {
  return emailShell({
    preview: 'Your Masterdeck demo is ready.',
    content: `
                <p style="margin:36px 0 12px;color:#0c9d73;font-size:11px;font-weight:700;letter-spacing:.16em">YOUR DEMO IS READY</p>
                <h1 style="margin:0 0 14px;color:#102c25;font-size:30px;line-height:1.15;letter-spacing:-.03em">See every investment in one clear view.</h1>
                <p style="margin:0;color:#526c62;font-size:16px;line-height:1.6">Explore portfolio value, returns, income and Australian tax views with sample data before you connect your own records.</p>
                <div style="margin:28px 0 0"><a href="${MASTERDECK_APP_ORIGIN}/deck" style="display:inline-block;padding:14px 20px;border-radius:10px;background:#0c9d73;color:#ffffff;font-size:15px;font-weight:700;line-height:1;text-decoration:none">Open Masterdeck</a></div>
                <p style="margin:24px 0 0;color:#71827b;font-size:12px;line-height:1.55">You are receiving this because you opted in to Masterdeck updates. Reply to this email if you would like to stop receiving them.</p>`,
  })
}
