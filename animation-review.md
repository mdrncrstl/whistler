# Animation review

Reviewed the motion change set against the animation standards after implementation and browser QA.

| Location | Severity | Finding | Resolution |
| --- | --- | --- | --- |
| `src/components/ui.tsx` motion surfaces | Resolved high | Framer Motion 13 interpreted `transform: none` as a zero-scale target in the production browser, leaving dialogs present but invisible after settling. | Replaced every animated identity with a full explicit transform such as `translateY(0px) scale(1)` and added a browser assertion for the settled matrix. |
| Popovers and overlays | Pass | Entrances are trigger- or edge-aware, use opacity plus transform only, and stay below 220ms. | Shared `MotionPopover` and `MotionDialogSurface` primitives keep the vocabulary consistent. |
| Reduced motion | Pass | Spatial movement is removed while a short opacity bridge remains. | `useReducedMotion` supplies identity transforms; CSS removes press movement. |
| Interaction continuity | Pass | Menus, dialog controls, outside dismissal, mobile drawer, and account actions remain interactive. | Covered by component tests and the dedicated browser motion suite. |
| Scope restraint | Pass | No route transitions, command-palette motion, chart drawing, number tickers, or table cascades were introduced. | Data-reading surfaces remain visually stable. |

Verdict: **SHIP**. The runtime scale regression was found and fixed; no blocking animation-standard violations remain.
