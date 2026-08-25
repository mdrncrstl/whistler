# MASTERDECK authenticated product parity QA

## Comparison target

- Source visual truth: authenticated Navexa routes captured live on 2026-08-25, the user-supplied `codex-clipboard-30b2e87c-405c-470b-8216-f1813b0802d5.png` AI screen, and the existing authenticated portfolio capture `qa/navexa-live-portfolio-2560.png`.
- Implementation: `qa/masterdeck-performance-parity-local.png` plus browser-rendered checks of every authenticated local route.
- Combined comparison input: `qa/navexa-masterdeck-comparison.png` (shared shell, typography and density).
- State: light theme; populated demo state for equivalent visual density; empty/live states checked separately without importing the user's Navexa data.
- Desktop evidence: source 2545 x 1214 px at DPR 1 and implementation capture 2880 x 1800 px, normalized to the same 1440 x 900 content region in the combined comparison.
- Responsive evidence: explicit 390 x 844 CSS viewport at DPR 2. Browser-reported document width was 750-780 physical px depending on the route, with no page-level horizontal overflow.

## Full-view comparison evidence

The combined comparison was opened as one side-by-side image. MASTERDECK preserves the aligned 239 px navigation rail, 48 px header, compact filter bars, horizontal summary strips, full-width report canvas and dense grouped tables. The new report and tax routes use the same hierarchy and visual rhythm as the captured Navexa workspaces while retaining MASTERDECK branding, independent icons, and independent data semantics.

## Focused region evidence

- Reports: all six report routes now include holdings search, period/status/group controls, summary metrics, chart or allocation analysis, detailed ledgers and populated/empty states.
- Tax: the overview now includes finalisation tasks, assessable-income and capital-gain summaries, six detailed report links and prior-year status. myTax, CGT, taxable-income, valuation, unrealised-gain and historical-cost views expose the source-equivalent field and table depth.
- Tools: Deck AI matches the captured title/welcome/suggestion/fixed-composer structure and returns deterministic portfolio-grounded answers. Inbox and custom groups now include setup, filtering, creation and empty states.
- Mobile: the navigation changes to the existing mobile shell; report controls wrap, metric grids reduce to two columns and dense tables remain internally scrollable.
- Assets: MASTERDECK retains its own mark and Lucide icon set. No Navexa logo, holding logo, copied SVG, hotlink, fake logo or photographic placeholder was introduced.

## Required fidelity surfaces

- Fonts and typography: passed. Bundled Inter 300-700 is used throughout; small UI text, report headings, tabular values and micro-labels keep source-like optical weights and hierarchy.
- Spacing and layout rhythm: passed. Shared filters, summary strips, cards, grouped table rows and report gaps maintain the compact source density without clipped controls.
- Colors and visual tokens: passed. Light slate surfaces, blue analytical emphasis, neutral rules and green/red financial states map to MASTERDECK-owned tokens.
- Image quality and asset fidelity: passed. These screens require interface icons rather than photographic imagery; library vectors remain sharp and no prohibited approximate asset was added.
- Copy and content: passed. Source-equivalent information architecture and report terminology are present while branding and explanatory language remain independent.
- Responsiveness: passed. Every tested authenticated route rendered meaningful content at 390 x 844 with no document overflow.
- Accessibility and interactions: passed. Inputs/selects are labelled, buttons are semantic, focusable controls work, dense tables use headers, and the browser console remained clean.

## Comparison history

### Pass 1 — portfolio shell

- [P1] Wrong typography and unrelated dashboard composition.
- Fix: bundled Inter and rebuilt the shared shell, filter/metric/chart/table composition.
- Post-fix evidence: `qa/navexa-masterdeck-comparison.png`.

### Pass 2 — authenticated product depth

- [P1] Reports and tax were shallow single-screen summaries and omitted multiple source routes.
- [P1] Deck AI, inbox and custom groups exposed placeholder interactions rather than complete primary states.
- Fix: added six deep report routes, seven tax routes, a tax finalisation workflow, field-level myTax reporting, grouped ledgers, income schedules, deterministic AI conversation, inbox onboarding/search, and custom-group creation/deletion.
- Post-fix evidence: browser-rendered route audit, `qa/masterdeck-performance-parity-local.png`, and the shared-shell combined comparison.
- No actionable P0/P1/P2 findings remain.

## Functional evidence

- `npm.cmd run typecheck`: passed.
- `npm.cmd run lint`: passed.
- `npm.cmd test`: 6 files / 16 tests passed.
- `npm.cmd run build`: passed.
- Desktop browser audit: 21/21 authenticated routes had meaningful DOM, zero page-level overflow and zero console errors.
- Mobile browser audit: 21/21 authenticated routes settled at 390 x 844 with meaningful DOM and zero page-level overflow.
- Production audit: all 16 rebuilt report, tax and tool routes rendered at `https://masterdeck-eosin.vercel.app` under the signed-in account, preserved their deep links, showed no demo portfolio state and had zero page-level overflow.
- Interactions: report holding filter, sale-allocation selector, Deck AI suggestion/response, custom-group creation and route navigation passed.

## Findings

- No actionable P0/P1/P2 findings remain.
- [P3] Holding avatars remain independent initial markers until a licensed security-logo source is selected.
- [P3] Projected income dates are clearly marked indicative because connected broker data does not expose forward company guidance.

## Final result

final result: passed
