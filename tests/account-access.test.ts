import { describe, expect, it } from 'vitest'
import { daysRemaining } from '../src/context/AccountAccessContext'

describe('account trial window', () => {
  it('rounds partial days up and never returns a negative count', () => {
    const now = Date.parse('2026-08-27T00:00:00.000Z')
    expect(daysRemaining('2026-09-10T00:00:00.000Z', now)).toBe(14)
    expect(daysRemaining('2026-08-27T00:00:01.000Z', now)).toBe(1)
    expect(daysRemaining('2026-08-26T23:59:59.000Z', now)).toBe(0)
  })
})
