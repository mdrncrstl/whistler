import { describe, expect, it } from 'vitest'
import { canonicalAppOrigin, canonicalAppUrl, canonicalHostRedirect, legacyWorkspaceDestination } from '../src/lib/app-origin'

describe('canonical application origin', () => {
  it('keeps local development on its current origin', () => {
    expect(canonicalAppOrigin({ origin: 'http://localhost:4173', hostname: 'localhost' })).toBe('http://localhost:4173')
    expect(canonicalAppUrl('/workspace', { origin: 'http://127.0.0.1:5173', hostname: '127.0.0.1' })).toBe('http://127.0.0.1:5173/workspace')
  })

  it('canonicalizes Vercel and www hosts to the public domain', () => {
    expect(canonicalAppUrl('/auth/callback', { origin: 'https://masterdeck-preview.vercel.app', hostname: 'masterdeck-preview.vercel.app' })).toBe('https://masterdeck.app/auth/callback')
    expect(canonicalAppOrigin({ origin: 'https://www.masterdeck.app', hostname: 'www.masterdeck.app' })).toBe('https://masterdeck.app')
  })

  it('moves legacy workspace links to the canonical workspace path', () => {
    expect(legacyWorkspaceDestination({
      pathname: '/app/tax/mytax',
      search: '?from=2025-07-01&to=2026-06-30',
      hash: '#summary',
    })).toBe('/workspace/tax/mytax?from=2025-07-01&to=2026-06-30#summary')
  })

  it('preserves the current route when an old Vercel host is opened', () => {
    expect(canonicalHostRedirect({
      origin: 'https://masterdeck-preview.vercel.app',
      hostname: 'masterdeck-preview.vercel.app',
      pathname: '/workspace/settings',
      search: '?tab=account',
      hash: '#profile',
    })).toBe('https://masterdeck.app/workspace/settings?tab=account#profile')
    expect(canonicalHostRedirect({
      origin: 'https://masterdeck.app',
      hostname: 'masterdeck.app',
      pathname: '/workspace',
      search: '',
      hash: '',
    })).toBeNull()
  })
})
