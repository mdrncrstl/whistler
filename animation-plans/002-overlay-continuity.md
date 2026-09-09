# 002 — Add dialog, drawer, and toast continuity

- **Status**: DONE
- **Commit**: 6f16556
- **Severity**: MEDIUM
- **Category**: State indication and feedback
- **Estimated scope**: 3 files, approximately 100 lines

## Problem

Occasional overlays teleport in and out, including the reusable modal, mobile drawer, portfolio column settings, holding preview, and toast.

```tsx
// src/components/ui.tsx:79-82 — current
if (!open) return null
return (
  <div className="modal-backdrop">
    <div className="modal-dialog">

// src/components/AppShell.tsx:181 — current
{mobileOpen && <div className="mobile-drawer"><div className="drawer-panel">{nav}</div>
```

## Target

- Dialog backdrop: opacity `0 → 1` in `160ms`; surface `opacity: 0` + `transform: translateY(8px) scale(0.97)` to settled in `200ms`; exit in `140ms`.
- Mobile drawer: backdrop opacity in `160ms`; panel `translateX(-100%) → translateX(0)` in `220ms` using `[0.32, 0.72, 0, 1]`; exit in `170ms`.
- Toast: `opacity: 0` + `translateY(100%) → settled` in `200ms`; exit in `140ms`.
- Use full transform strings and keep motion interruptible with `AnimatePresence`. Reduced motion retains opacity while replacing movement with explicit identity transforms.

## Repo conventions to follow

- Reusable overlays live in `src/components/ui.tsx`; shell-only drawer and notice presence live in `src/components/AppShell.tsx`.
- Modal surface classes remain `.modal-dialog`, `.column-settings`, and `.holding-detail`.

## Steps

1. Convert `Modal` in `src/components/ui.tsx` to an `AnimatePresence` backdrop and motion surface.
2. Make `Toast` a motion surface and wrap shell notices in `AnimatePresence` so exit completes before unmount.
3. Convert the mobile drawer in `src/components/AppShell.tsx` to a backdrop and panel pair with asymmetric timings.
4. Convert the two portfolio-specific dialog backdrops in `src/features/Overview.tsx` to the same modal motion recipe.

## Boundaries

- Do NOT change modal dimensions, mobile drawer width, stacking order, or click-outside behaviour.
- Do NOT add bounce; Masterdeck is a crisp financial dashboard.

## Verification

- **Mechanical**: typecheck, lint, tests, and production build pass.
- **Feel check**: repeatedly open/close dialogs and the drawer before animations finish; they must reverse from their current state without flashing. Verify click-outside, Escape, focus semantics, and toast auto-dismiss. Toggle reduced motion and confirm only opacity changes.
- **Done when**: occasional overlays no longer teleport and all existing interactions remain intact.
