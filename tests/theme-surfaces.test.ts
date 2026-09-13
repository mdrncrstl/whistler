import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

// Read whichever stylesheets main.tsx actually imports, so this suite cannot drift onto a
// stylesheet the app no longer ships.
const entry = readFileSync(join(process.cwd(), 'src', 'main.tsx'), 'utf8')
const stylesheets = [...entry.matchAll(/import '(\.\/[^']+\.css)'/g)].map((match) => match[1].replace('./', ''))
const css = stylesheets.map((file) => readFileSync(join(process.cwd(), 'src', file), 'utf8')).join('\n')

describe('theme-aware shared surfaces', () => {
  it('loads the stylesheets the application entry imports', () => {
    expect(stylesheets.length).toBeGreaterThan(0)
    expect(css.length).toBeGreaterThan(1000)
  })

  it('uses surface tokens for fields, switches, dialogs and notifications', () => {
    expect(css).toMatch(/\.settings-field input \{[^}]*background: var\(--surface\)/)
    expect(css).toMatch(/\.settings-static-value \{[^}]*background: var\(--surface-2\)/)
    expect(css).toMatch(/\.settings-control-row > i \{[^}]*background: var\(--surface-3\)/)
    expect(css).toMatch(/\.modal-dialog \{[^}]*background: var\(--surface\)/)
    expect(css).toMatch(/\.toast \{[^}]*background: var\(--surface\)/)
  })

  it('keeps mobile navigation theme-aware instead of forcing white or black', () => {
    const mobileNavRules = css.match(/\.mobile-nav \{[^}]*\}/g) || []
    expect(mobileNavRules.length).toBeGreaterThan(0)
    expect(mobileNavRules.every((rule) => !rule.includes('rgb(255 255 255') && !rule.includes('rgb(7 17 13'))).toBe(true)
  })

  it('keeps the chart palette green-led and defined once as tokens', () => {
    // The categorical set passes the dataviz six checks against both surfaces.
    expect(css).toMatch(/--chart-1: #0f9d63/)
    expect(css).toMatch(/--chart-2: #7c3aed/)
    expect(css).toMatch(/--chart-benchmark:/)
    // Nothing outside the token block should be carrying its own blue.
    const outsideTokens = css.replace(/--chart-\d: #[0-9a-f]{6};/g, '')
    expect(outsideTokens).not.toMatch(/#3a6ff5|#5277ef|#2563eb/)
    expect(css).not.toMatch(/var\(--blue\)/)
  })

  it('derives hover weights from ink so they hold in both themes', () => {
    expect(css).toMatch(/--hover: color-mix\(in srgb, var\(--text\) 4\.5%, transparent\)/)
    expect(css).toMatch(/--hover-soft: color-mix\(in srgb, var\(--text\) 3%, transparent\)/)
  })

  it('gives the portfolio metric strip a Navexa-style hover fill without a duplicate popup', () => {
    expect(css).toMatch(/\.portfolio-metrics \.metric-tab:hover \{[^}]*background: var\(--hover-soft\)/)
    expect(css).toMatch(/\.portfolio-metrics \.metric-tab\.active \{[^}]*border-bottom-color: var\(--accent\)/)
    expect(css).toMatch(/\.portfolio-metrics \.metric-tab \{[^}]*transition: background-color \.15s ease/)
    expect(css).not.toContain('metric-hover-value')
  })
})
