# MASTERDECK portfolio parity QA

## Comparison target

- Source visual truth: `qa/navexa-live-portfolio-2560.png` (authenticated Navexa portfolio captured live on 2026-08-24).
- Implementation: `qa/masterdeck-local-parity.png` (MASTERDECK demo data used only to give the screen equivalent visual density).
- Combined comparison input: `qa/navexa-masterdeck-comparison.png`.
- Route/state: portfolio route, light theme, desktop, populated holdings state.
- Comparison viewport: both inputs were cropped without scaling to the same 1440 x 900 px region. Source screenshot is 2545 x 1214 px at DPR 1. Implementation browser capture is 2880 x 1800 px; the comparison uses its unscaled top-left 1440 x 900 region because browser screenshot clipping was returned at the host browser density.
- Production evidence: `qa/masterdeck-production-parity-empty.png` confirms the deployed authenticated route uses the same shell and empty-state geometry.

## Full-view comparison evidence

The combined image was opened as one side-by-side comparison input. The main spatial anchors now align: 239 px navigation rail, 48 px header, filter row at the top of the content area, five metrics in a single horizontal strip, amount/percent and line/bar controls, a full-width blue performance chart, then the holdings title and grouped table. MASTERDECK keeps its own name and mark and does not reuse Navexa trademarks or hotlinked assets.

## Focused region evidence

- Typography: both screens use real Inter font files at 300-700 weights. MASTERDECK no longer resolves to Aptos.
- Sidebar: group labels, 32 px rows, muted inactive states, neutral active fill, and collapsed report/tax groups follow the reference rhythm.
- Header/filter controls: centered 400 px global search and 400 px holdings filter match the measured source widths; controls are 28-34 px high with 6 px radii.
- Metrics/chart: labels, large tabular numbers, active total-return tile, blue line/fill, right-side axis and section heights match the source hierarchy.
- Holdings: exchange group rows, 45 px position rows, sticky symbol column, numeric alignment, subtotals and grand total match the source table composition.
- Assets: MASTERDECK retains its own brand mark and Lucide icons. No Navexa logo, holding logo, copied SVG, photographic asset, placeholder image, or hotlink was introduced.

## Required fidelity surfaces

- Fonts and typography: passed. Local Inter font files load in five weights; sizes, weights, line heights, uppercase micro-labels and tabular hierarchy are materially aligned.
- Spacing and layout rhythm: passed. The major x/y anchors differ by less than one normal control gap in the normalized comparison; no P1/P2 density or wrapping drift remains.
- Colors and visual tokens: passed. Light slate surfaces, blue performance accent, green/red financial states and neutral borders align while remaining MASTERDECK-owned tokens.
- Image quality and asset fidelity: passed. No source imagery was required; icon-library vectors remain sharp.
- Copy and content: passed. Portfolio, filter, performance, return and grouped holding labels match the product task without copying Navexa branding.
- Responsiveness: passed for MASTERDECK at compact width; the reference itself preserves a desktop-width canvas at the attempted mobile viewport, so MASTERDECK intentionally keeps the dense portfolio table horizontally scrollable while retaining its mobile shell.
- Accessibility and interactions: passed for the tested core flow. Search is labelled, controls are semantic buttons, the performance period changes rendered state, export is wired, and the console is clean.

## Comparison history

### Pass 1

- [P1] Wrong typography and unrelated dashboard composition.
  - Evidence: `qa/masterdeck-before-parity.png` used Aptos, stacked metric cards, allocation/mover cards and a mobile-like overview instead of the reference hierarchy.
  - Fix: bundled Inter, rebuilt the portfolio route around the measured filter/metric/chart/table geometry, and collapsed navigation groups on the portfolio view.

### Pass 2

- Post-fix evidence: `qa/masterdeck-local-parity.png` and `qa/navexa-masterdeck-comparison.png`.
- No actionable P0, P1 or P2 visual findings remain.

## Functional evidence

- `npm.cmd run typecheck`: passed.
- `npm.cmd run lint`: passed.
- `npm.cmd test`: 5 files / 13 tests passed.
- `npm.cmd run build`: passed.
- Production Vercel build: passed and aliased to `https://masterdeck-eosin.vercel.app`.
- Browser page identity, meaningful DOM, framework-overlay absence, console health and populated-demo interaction checks: passed.
- Production browser console warnings/errors: zero.

## Findings

- No actionable P0/P1/P2 findings remain.
- [P3] Holding avatars remain independent initial markers until a licensed security-logo source is chosen.

## Final result

final result: passed
