# 001 — Add origin-aware menus and popovers

- **Status**: DONE
- **Commit**: 6f16556
- **Severity**: MEDIUM
- **Category**: Physicality and missed opportunities
- **Estimated scope**: 4 files, approximately 120 lines

## Problem

Trigger-anchored menus currently appear and disappear instantly, so their spatial relationship to the invoking control is lost.

```tsx
// src/components/AppShell.tsx:123 — current
{portfolioMenuOpen && <div className="portfolio-menu" role="menu">

// src/features/Overview.tsx:104 — current
{rangeOpen && <div className="control-menu range-menu" role="menu">
```

## Target

Create one reusable Framer Motion popover surface. Enter from `opacity: 0` and `transform: translateY(-4px) scale(0.97)` to the settled state in `160ms`; exit in `110ms`. Use `ease: [0.23, 1, 0.32, 1]`, animate only `opacity` and a full `transform` string, and set the transform origin to the trigger-aligned corner. Under reduced motion, keep the opacity transition but use `transform: none`.

Apply it to portfolio, notification, account, report-control, export, filter-builder, row-action, and landing feature menus. Do not animate the keyboard command palette. Under reduced motion, use an explicit identity transform so Framer Motion preserves opacity without spatial movement.

## Repo conventions to follow

- Shared UI primitives live in `src/components/ui.tsx`.
- Existing surface classes retain placement, borders, shadows, and roles; motion is an additive wrapper, not a redesign.
- Use `AnimatePresence initial={false}` so the first app paint does not animate.

## Steps

1. Add `MotionPopover` to `src/components/ui.tsx` using `AnimatePresence`, `motion.div`, and `useReducedMotion`.
2. Replace conditional popover divs in `src/components/AppShell.tsx` with `MotionPopover`, preserving roles and click handlers.
3. Replace conditional portfolio controls and row menus in `src/features/Overview.tsx` with the same primitive.
4. Apply it to the landing Features dropdown in `src/components/Landing.tsx` with `transformOrigin: top left`.

## Boundaries

- Do NOT animate command-palette opening or keyboard search.
- Do NOT animate charts, table rows, navigation links, or route changes.
- Do NOT change menu content, semantics, positioning, or information architecture.

## Verification

- **Mechanical**: `npm.cmd run typecheck`, `npm.cmd run lint`, `npm.cmd test`, `npm.cmd run build` all pass.
- **Feel check**: open and rapidly toggle each menu; it must retarget cleanly, grow from its trigger corner, and remain interactive immediately. In reduced-motion mode, movement disappears but the brief opacity bridge remains.
- **Done when**: all listed menus have a coherent spatial entrance and no keyboard-initiated surface animates.
