import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const css = readFileSync(join(process.cwd(), 'src', 'styles.css'), 'utf8')

describe('theme-aware shared surfaces', () => {
  it('uses surface tokens for fields, switches, dialogs and notifications', () => {
    expect(css).toMatch(/\.form-stack input \{[^}]*background: var\(--surface\)/)
    expect(css).toMatch(/\.form-stack input:disabled \{[^}]*background: var\(--surface-2\)/)
    expect(css).toMatch(/\.toggle-row > i \{[^}]*background: var\(--surface-3\)/)
    expect(css).toMatch(/\.modal-dialog \{[^}]*background: var\(--surface\)/)
    expect(css).toMatch(/\.toast \{[^}]*background: var\(--surface\)/)
  })

  it('keeps mobile navigation theme-aware instead of forcing white or black', () => {
    const mobileNavRules = css.match(/\.mobile-nav \{[^}]*\}/g) || []
    expect(mobileNavRules.length).toBeGreaterThan(0)
    expect(mobileNavRules.every((rule) => !rule.includes('rgb(255 255 255') && !rule.includes('rgb(7 17 13'))).toBe(true)
  })
})
