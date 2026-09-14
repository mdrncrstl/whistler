# Animation audit

Reviewed the app's meaningful state changes against the transitions.dev and find-animation-opportunities guidance. The implementation keeps motion for occasional state changes that help users understand what changed, while keeping data-reading surfaces stable.

| State change | Treatment | Purpose | Decision |
| --- | --- | --- | --- |
| Compact chart controls ↔ Pro graph controls | Shared `MotionExpand` reveal in the overview, reports, holding detail and stock research charts | Makes the toolbar and surrounding layout settle together instead of teleporting | Implemented |
| Chart period selection | Measured sliding selection pill in `SlidingTabs` | Preserves the relationship between the selected period and its control | Implemented |
| Technical indicator added or removed | Shared reveal around active indicator chips | Connects the menu choice to the new chart annotation | Implemented |
| CSV column mapping opened or closed | Height and opacity reveal | Keeps the import flow readable when recognition needs manual input | Implemented |
| Custom group details opened or closed | Height and opacity reveal | Shows which group card expanded | Implemented |
| Company suggestions and relationship evidence | Anchored popover and detail reveal | Preserves spatial continuity around search and selection | Implemented |
| Pricing FAQ opened or closed | Grid-row accordion with chevron rotation | Keeps the answer in document flow and makes the open state clear | Implemented |

The shared primitives use the existing motion tokens and include reduced-motion handling. The Pro graph wrapper keeps its stacking context above the chart so anchored menus remain visible while the toolbar is open. Period pills are measured after layout and reset without animation on resize to avoid a flash or misalignment.

The following states remain deliberately quiet: chart lines, areas, bars, candles and indicator paths; pointer tooltips and drag selections; command palette opening; table rows and sort results; and high-frequency search result filtering. Animating those surfaces would compete with values the user is reading, add noise to frequent interactions, or make the data appear to change independently of the source.

Validation covers the reduced-motion app flow, legacy route redirects, popover triangles, Escape dismissal, Pro graph menus, the no-preference Pro graph reveal, menu stacking, measured period pill and mobile overflow. The existing unit suite and lint/type checks also pass.
