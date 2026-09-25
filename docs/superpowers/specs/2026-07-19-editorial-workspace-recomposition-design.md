# Editorial Workspace Recomposition

## Outcome

Make the redesign unmistakable without changing routes, permissions, data semantics, APIs, or workflows. The public site becomes an editorial workspace: one light system chrome layer, an open content canvas, and a deliberate secondary rail.

## Product rules

- The public header owns the permanent `工作台` link. Authentication controls may load, disappear, or fail without removing that link.
- Keep all existing destinations and actions. Recomposition changes hierarchy and layout, not capability.
- Do not add explanatory product copy or implementation commentary to the interface.
- Use solid reading and task surfaces; reserve translucency for floating global chrome.
- Preserve keyboard focus, press feedback, reduced motion, reduced transparency, and increased contrast behavior.

## Visual direction

- Home: open asymmetric editorial canvas instead of a large glass window. A dominant first shelf anchors the page; the remaining shelves form a compact index. Recent content becomes a dense reading ledger. The right rail has one visual lead and quieter supporting modules.
- Discovery: directory and content pages read as paper-like editorial layouts with fewer nested capsules and stronger typographic hierarchy.
- Desk: a restrained utility rail and a broad task canvas replace the nested desktop-window impression.
- Responsive: composition collapses to one reading flow without horizontal overflow; navigation and workspace entry remain reachable.

## Acceptance

1. `工作台` is visible in the public header before Clerk and workspace-session loading finishes.
2. At desktop width, the homepage macro composition is visibly different from the previous four-equal-cards plus widget-stack layout.
3. Discovery and desk shells use the same hierarchy rules while retaining every route and action.
4. Focus, Escape behavior, responsive layout, reduced-motion, transparency, and contrast fallbacks remain intact.
5. Focused tests and production build pass; Preview is visually inspected at desktop and mobile widths.
