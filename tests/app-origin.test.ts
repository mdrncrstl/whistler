import { describe, expect, it } from 'vitest'
import { canonicalAppOrigin, canonicalAppUrl, canonicalHostRedirect } from '../src/lib/app-origin'

describe('canonical application origin', () => {
  it('keeps local development on its current origin', () => {
    expect(canonicalAppOrigin({ origin: 'http://localhost:4173', hostname: 'localhost' })).toBe('http://localhost:4173')
    expect(canonicalAppUrl('/app', { origin: 'http://127.0.0.1:5173', hostname: '127.0.0.1' })).toBe('http://127.0.0.1:5173/app')
  })

  it('canonicalizes Vercel and www hosts to the public domain', () => {
    expect(canonicalAppUrl('/auth/callback', { origin: 'https://masterdeck-preview.vercel.app', hostname: 'masterdeck-preview.vercel.app' })).toBe('https://masterdeck.app/auth/callback')
    expect(canonicalAppOrigin({ origin: 'https://www.masterdeck.app', hostname: 'www.masterdeck.app' })).toBe('https://masterdeck.app')
  })

  it('preserves the current route when an old Vercel host is opened', () => {
    expect(canonicalHostRedirect({
      origin: 'https://masterdeck-preview.vercel.app',
      hostname: 'masterdeck-preview.vercel.app',
      pathname: '/app/settings',
      search: '?tab=account',
      hash: '#profile',
    })).toBe('https://masterdeck.app/app/settings?tab=account#profile')
    expect(canonicalHostRedirect({
      origin: 'https://masterdeck.app',
      hostname: 'masterdeck.app',
      pathname: '/app',
      search: '',
      hash: '',
    })).toBeNull()
  })
})
