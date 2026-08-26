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

### Pass 3 — expanded sidebar fidelity (2026-08-26)

- Source visual truth: `C:\Users\moder\AppData\Local\Temp\codex-clipboard-fbe34674-1c18-4ebf-835d-aaa34109fe53.png`, 257 x 1241 px at DPR 1.
- Implementation: `qa/masterdeck-sidebar-parity-local.png`, browser-rendered at a 1440 x 1241 CSS viewport and cropped to the same 257 x 1241 px sidebar region at DPR 1.
- Combined full-view and focused-region evidence: `qa/sidebar-parity-comparison.png`; both equal-density sidebar captures are placed side by side without scaling.
- State: light-theme demo portfolio, Portfolio route active, all report and tax branches expanded, MCP card visible.
- [P1] The prior sidebar flattened reports and tax into peer routes, omitted the source's parent rows and subgroup labels, and added Holdings and Connections to the primary rail.
- Fix: recreated the Performance and Tax Reporting parent hierarchy, Income/Tax Reports/Tax Planning subgroup labels, exact child ordering and indentation, source-density link geometry, separator, MCP promo and Feedback footer. Holdings and Connections remain functional through direct routes but no longer alter the reference sidebar IA.
- Fonts and typography: passed. Inter, 13 px navigation text, 11 px group labels, 10 px subgroup labels and regular optical weight match the reference hierarchy.
- Spacing and layout rhythm: passed. The 240 px rail, 32 px row height, active-row width, nested offsets, footer card placement and 16 px lower gutter align in the equal-size comparison.
- Colors and visual tokens: passed. Neutral slate rail, blue-grey labels, dark navigation copy, grey active row and fine separators match the source while retaining Masterdeck's blue mark.
- Image quality and asset fidelity: passed. The Masterdeck mark remains an independent vector asset; navigation uses the project's sharp library icons and does not copy the Navexa logo.
- Copy and content: passed. Source labels and hierarchy are preserved with only product-identity substitutions (`Masterdeck AI`, `Masterdeck MCP server`).
- Interaction evidence: nested links navigate to their existing deep routes; the MCP card dismisses; browser console reported zero warnings or errors.
- Post-fix comparison found no actionable P0/P1/P2 sidebar differences.

### Pass 4 — portfolio interaction parity and collapsible navigation (2026-08-26)

- Source inspection: live authenticated `https://www.navexa.com/n/portfolio`, including the nested Performance/Tax parents, bottom rail collapse control, portfolio picker, Ctrl+K search, filter builder, time/position menus, chart modes, holding grouping, group collapse, sortable headers, column settings and PDF export.
- Reference captures: `C:\Users\moder\.codex\tmp\navexa-portfolio-audit-2026-08-26\01-portfolio-main.png`, `02-performance-collapsed.png`, and `03-global-search.png`.
- Implementation captures: `04-masterdeck-expanded.png` and `05-masterdeck-collapsed.png` in the same temporary audit folder. `06-reference-comparison.png` places source and implementation into one visual comparison input.
- [P1] Performance and Tax Reporting looked expandable but were inert; the full rail had no collapse control.
- [P1] Portfolio picker, global search, range, positions, filter, Amount/Percent, Line/Bar, grouping, group rows, columns, sorting and row actions were static or incomplete.
- Fix: added persisted nested and whole-rail collapse states, a working portfolio menu and command palette, exact source-equivalent range/position choices, multi-filter builder, amount/percent and line/bar chart behavior, D/M/Y bar controls, four grouping modes, collapsible groups, sortable columns, searchable column settings, PDF/CSV export and holding detail/action menus.
- Browser interaction evidence: 17/17 assertions passed for sidebar sections, rail collapse, filter application, chart mode switching, D/M/Y visibility, group collapse, columns dialog defaults, sector grouping, both export actions, command search and holding details.
- Visual fidelity: passed for hierarchy, control density, source-like white/slate/blue palette, table rhythm and collapse states. Masterdeck retains independent branding, demo data and icons.
- Accessibility: passed. Collapse controls expose `aria-expanded`, group toggles expose state, menus/dialogs have roles and labels, sortable headers expose `aria-sort`, and every new input is labelled.

### Pass 5 — public conversion funnel (2026-08-26)

- Source inspection: live `https://www.navexa.com/au` desktop and mobile funnel, including sticky navigation, mobile drawer, feature dropdown, hero, proof, scope boundary, onboarding steps, product-led feature sections, pricing switch, comparison table, integrations, FAQ accordion, repeated CTAs and footer.
- Reference captures: `C:\Users\moder\.codex\tmp\navexa-home-audit-2026-08-26\desktop-00-hero.png`, desktop and mobile contact sheets, and interaction-state captures.
- Implementation capture: `C:\Users\moder\.codex\tmp\navexa-home-audit-2026-08-26\masterdeck-home-local-desktop.png`.
- Combined visual comparison: `C:\Users\moder\.codex\tmp\navexa-home-audit-2026-08-26\homepage-hero-comparison.png`, normalized to equal 1440 x 900 panels.
- [P1] The previous root route exposed only a single dark hero and capability strip; it did not provide a full marketing journey or let signed-in users inspect the public site.
- Fix: rebuilt `/` as a complete Masterdeck-owned funnel with independent copy and assets, accurate supported integrations, real Masterdeck product screenshots, shared billing data, accessible interaction states and direct app/auth conversion paths. Signed-in users now see `Open Masterdeck` while the public homepage remains accessible.
- Visual fidelity: passed. The implementation follows the source's white/slate/blue palette, centered product-led hero, large browser-framed preview, long-form section rhythm, pricing hierarchy and mobile stacking while retaining Masterdeck typography, mark and product imagery.
- Interaction evidence: desktop feature dropdown exposes three destinations; mobile navigation toggles `aria-expanded`; annual/monthly pricing changes Essential from $14 to $18; FAQ state changes and reveals the selected answer; demo CTA reaches `/app` with populated demo state.
- Responsive evidence: 1440 x 900 desktop and 390 x 844 mobile CSS viewports passed with no page-level horizontal overflow. All four product images loaded at natural resolution.
- Console evidence: zero browser warnings or errors after navigation, interaction and responsive checks.
- Automated evidence: landing tests cover the full section journey, shared pricing state, FAQ state and mobile menu behavior.

### Pass 6 — complete theme surface repair (2026-08-26)

- User reference: `C:\Users\moder\AppData\Local\Temp\codex-clipboard-1c3d470e-174c-4441-ada9-be719477e7e9.png`, showing dark Settings inputs and switch tracks leaking into the light workspace.
- Implementation capture: `C:\Users\moder\.codex\tmp\masterdeck-light-mode-2026-08-26\settings-after.png` at the same desktop state.
- Combined comparison input: `C:\Users\moder\.codex\tmp\masterdeck-light-mode-2026-08-26\settings-before-after.png`.
- [P1] Shared form fields, switch tracks, modal dialogs and toast notifications used hard-coded dark backgrounds in light mode. Mobile navigation also forced a light surface when dark mode was active.
- Fix: replaced hard-coded surfaces with `--surface`, `--surface-2`, `--surface-3`, line and semantic colour tokens; restored disabled-field contrast; added theme-aware switch geometry; and corrected dark sidebar/topbar/search contrast exposed during the reciprocal theme check.
- Light desktop evidence: editable input `rgb(255,255,255)`, disabled inputs `rgb(243,245,247)`, switch tracks `rgb(233,237,241)`, toast `rgb(255,255,255)`, no console warnings or errors.
- Dark desktop evidence: editable input `rgb(13,25,19)`, disabled inputs `rgb(17,31,24)`, toast `rgb(13,25,19)`, readable sidebar links and token-matched topbar/search surfaces.
- Mobile evidence: 390 x 844 light Settings view, theme-aware bottom navigation, no page-level horizontal overflow and no console warnings or errors.
- Interaction evidence: privacy switch changed checked state; Save preferences produced a visible token-correct toast; light/dark theme controls updated every audited surface.
- Automated evidence: eight test files / 25 tests passed, including shared theme-surface regression guards.

### Pass 7 — first portfolio onboarding (2026-08-26)

- Replaced the empty portfolio canvas with a clear first-run setup screen instead of zero-value metrics and vague import copy.
- Added explicit IBKR connection and Superhero report import choices, a three-step explanation, and read-only safety context.
- Reused the setup guidance on empty Holdings and Transactions screens.
- Deep-linked IBKR into its connection form and the import path into the focused Superhero upload action.
- Browser QA covered desktop and 390 × 844 mobile, the import navigation/focus loop, console health, and a mobile overflow regression found and fixed during testing.
- Automated regression coverage: 31 tests passed across 9 files; typecheck, lint, build, and `git diff --check` passed.

### Pass 8 — authenticated portfolio persistence (2026-08-26)

- Root cause: authenticated sessions initially rendered the bundled reference portfolio (`$139,854.61`) while the real account bundle loaded, then replaced it with the account's empty server response.
- Account baseline before the requested copy: 0 positions, 0 transactions, 0 cash balances, 0 snapshots and 0 broker connections.
- Persistence fix: saved the reference portfolio to the authenticated account as 8 positions, 12 transactions, 2 cash balances and 12 snapshots. The resulting database value is `$139,854.61`.
- Provenance: the copied rows and two disabled connection records are explicitly labelled as a static reference portfolio; they do not claim live broker access or store broker credentials.
- Hydration fix: live sessions now begin with an empty private bundle and show the shared loading screen until the authenticated Edge Function response arrives. Demo data is only initialized in explicit demo mode.
- Connection safety: reference IBKR and Superhero records now offer real connection/import replacement actions instead of a non-functional sync action.
- Production browser evidence: after a 3.2 second settled reload, `$139,854.61` and AAPL remained visible, first-run onboarding was absent, and the console contained zero warnings or errors.
- Automated regression coverage: 32 tests passed across 10 files, including an authenticated hydration test that proves no AAPL/reference-data flash occurs before the live bundle resolves; typecheck, lint, build and `git diff --check` passed.

## Functional evidence

- `npm.cmd run typecheck`: passed.
- `npm.cmd run lint`: passed.
- `npm.cmd test`: 6 files / 20 tests passed.
- `npm.cmd run build`: passed.
- Desktop browser audit: 21/21 authenticated routes had meaningful DOM, zero page-level overflow and zero console errors.
- Mobile browser audit: 21/21 authenticated routes settled at 390 x 844 with meaningful DOM and zero page-level overflow.
- Production audit: all 16 rebuilt report, tax and tool routes rendered at `https://masterdeck-eosin.vercel.app` under the signed-in account, preserved their deep links, showed no demo portfolio state and had zero page-level overflow.
- Interactions: report holding filter, sale-allocation selector, Deck AI suggestion/response, custom-group creation, nested/full sidebar collapse, command search, portfolio filters, chart modes, group/sort/column controls, exports, holding details and route navigation passed.

## Findings

- No actionable P0/P1/P2 findings remain.
- [P3] Holding avatars remain independent initial markers until a licensed security-logo source is selected.
- [P3] Projected income dates are clearly marked indicative because connected broker data does not expose forward company guidance.

## Final result

final result: passed
