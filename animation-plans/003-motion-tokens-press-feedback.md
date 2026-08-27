# 003 — Establish crisp motion tokens and press feedback

- **Status**: DONE
- **Commit**: 6f16556
- **Severity**: LOW
- **Category**: Cohesion and feedback
- **Estimated scope**: 1 file, approximately 30 lines

## Problem

The stylesheet repeats weak built-in easing and important pressable controls have no tactile press state.

```css
/* src/styles.css:54 — current */
.button { transition: background .18s ease, border-color .18s ease, color .18s ease, transform .18s ease; }
```

## Target

Add shared motion tokens:

```css
--ease-out: cubic-bezier(0.23, 1, 0.32, 1);
--ease-in-out: cubic-bezier(0.77, 0, 0.175, 1);
--ease-drawer: cubic-bezier(0.32, 0.72, 0, 1);
--duration-press: 140ms;
--duration-popover: 160ms;
```

Apply `transform: scale(0.97)` press feedback only to explicit action controls (`.button`, `.icon-button`, `.marketing-button`, toolbar buttons, and popover menu buttons). Gate hover movement behind `@media (hover: hover) and (pointer: fine)`. Under reduced motion, keep color/opacity feedback and remove press transforms.

## Repo conventions to follow

- Global design tokens are defined in `:root` at the top of `src/styles.css`.
- Never use `transition: all`; list exact properties.

## Steps

1. Add the five tokens to `:root`.
2. Replace weak repeated easing on deliberate transform/opacity transitions with the shared curve.
3. Add the restrained active selectors and a reduced-motion override.

## Boundaries

- Do NOT add motion to navigation links, table rows, chart points, form typing, or command search.
- Do NOT exceed `160ms` for press feedback.

## Verification

- **Mechanical**: lint and build pass; grep finds no `transition: all` or `ease-in` UI transition.
- **Feel check**: buttons acknowledge mouse/touch presses without visibly bouncing; holding and releasing retargets smoothly. Reduced motion keeps color feedback without scale.
- **Done when**: action controls feel responsive and all motion values come from a small coherent vocabulary.
