import { describe, expect, it } from 'vitest'
import { canonicalAppOrigin, canonicalAppUrl, canonicalHostRedirect, canonicalWorkspacePathname, legacyWorkspaceDestination } from '../src/lib/app-origin'

describe('canonical application origin', () => {
  it('keeps local development on its current origin', () => {
    expect(canonicalAppOrigin({ origin: 'http://localhost:4173', hostname: 'localhost' })).toBe('http://localhost:4173')
    expect(canonicalAppUrl('/deck', { origin: 'http://127.0.0.1:5173', hostname: '127.0.0.1' })).toBe('http://127.0.0.1:5173/deck')
  })

  it('canonicalizes Vercel and www hosts to the public domain', () => {
    expect(canonicalAppUrl('/auth/callback', { origin: 'https://masterdeck-preview.vercel.app', hostname: 'masterdeck-preview.vercel.app' })).toBe('https://masterdeck.app/auth/callback')
    expect(canonicalAppOrigin({ origin: 'https://www.masterdeck.app', hostname: 'www.masterdeck.app' })).toBe('https://masterdeck.app')
  })

  it('moves both legacy app paths to the canonical deck path', () => {
    expect(legacyWorkspaceDestination({
      pathname: '/app/tax/mytax',
      search: '?from=2025-07-01&to=2026-06-30',
      hash: '#summary',
    })).toBe('/deck/tax/mytax?from=2025-07-01&to=2026-06-30#summary')
    expect(legacyWorkspaceDestination({ pathname: '/workspace/tax/mytax', search: '', hash: '' })).toBe('/deck/tax/mytax')
    expect(canonicalWorkspacePathname('/workspace/settings')).toBe('/deck/settings')
    expect(canonicalAppUrl('/workspace/settings', { origin: 'https://masterdeck-preview.vercel.app', hostname: 'masterdeck-preview.vercel.app' })).toBe('https://masterdeck.app/deck/settings')
  })

  it('preserves the current route when an old Vercel host is opened', () => {
    expect(canonicalHostRedirect({
      origin: 'https://masterdeck-preview.vercel.app',
      hostname: 'masterdeck-preview.vercel.app',
      pathname: '/workspace/settings',
      search: '?tab=account',
      hash: '#profile',
    })).toBe('https://masterdeck.app/deck/settings?tab=account#profile')
    expect(canonicalHostRedirect({
      origin: 'https://masterdeck.app',
      hostname: 'masterdeck.app',
      pathname: '/deck',
      search: '',
      hash: '',
    })).toBeNull()
  })
})
