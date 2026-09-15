import { describe, expect, it } from 'vitest'
import { buildAuthEmailMessage, buildDemoWelcomeEmailHtml, normalizeAuthEmailAction } from '../supabase/functions/_shared/masterdeck-email'

describe('Masterdeck email templates', () => {
  it('builds a branded signup confirmation with a safe confirmation link', () => {
    const message = buildAuthEmailMessage({
      action: 'signup',
      confirmationUrl: 'https://cbfettdbdjlgbjxzwvps.supabase.co/auth/v1/verify?token=abc&redirect_to=https%3A%2F%2Fmasterdeck.app%2Fauth%2Fcallback',
    })

    expect(message.subject).toBe('Confirm your Masterdeck account')
    expect(message.html).toContain('https://masterdeck.app/brand/masterdeck-logo.png')
    expect(message.html).toContain('Every investment. One clear view.')
    expect(message.html).toContain('href="https://cbfettdbdjlgbjxzwvps.supabase.co/auth/v1/verify?token=abc&amp;redirect_to=https%3A%2F%2Fmasterdeck.app%2Fauth%2Fcallback"')
    expect(message.html).not.toContain('<script')
  })

  it('keeps the demo email on the same Masterdeck visual system', () => {
    const html = buildDemoWelcomeEmailHtml()
    expect(html).toContain('YOUR DEMO IS READY')
    expect(html).toContain('masterdeck-logo.png')
    expect(html).toContain('Open Masterdeck')
  })

  it('normalizes the auth action used by Supabase hooks', () => {
    expect(normalizeAuthEmailAction('magic_link')).toBe('magiclink')
    expect(normalizeAuthEmailAction('unexpected')).toBe('signup')
  })
})
