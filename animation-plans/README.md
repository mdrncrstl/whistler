# Masterdeck animation pass

| # | Plan | Severity | Status |
| --- | --- | --- | --- |
| 001 | Origin-aware menus and popovers | MEDIUM | DONE |
| 002 | Dialog, drawer, and toast continuity | MEDIUM | DONE |
| 003 | Restrained press feedback and motion tokens | LOW | DONE |

Recommended order: 003 establishes the shared timing and easing tokens, 001 applies them to trigger-anchored surfaces, then 002 applies the same vocabulary to occasional overlays.

Deliberately excluded: route transitions, command-palette animation, chart drawing, number tickers, and table-row stagger. These are frequent or data-reading surfaces where movement would hinder rather than help.
