# Public Workspace Entry Design

## Decision

Keep account management and workspace navigation as separate controls. Public pages expose a persistent, one-click workspace link in the upper-right action group; the avatar continues to open account and identity controls.

## States

- Active signed-in profile: direct link to `/desk/today` labelled `工作台`.
- Pending or suspended profile: direct link to its account-status route with an appropriate label.
- Signed-out profile: retain login and registration actions; do not imply workspace access.
- Clerk signed in while the workspace session is resolving: retain a stable workspace link instead of replacing the action group with an anonymous skeleton.
- Mobile: retain an icon-led but explicitly labelled workspace link without relying on the horizontally scrollable Dock.

## Accessibility

The account popover returns focus to its trigger after Escape. The popover has menu semantics and focuses its first actionable control when opened. The direct workspace link remains outside the popover and therefore requires no disclosure step.

## Verification

Render the account controls in signed-in, signed-out, loading and restricted-profile states. Assert that the public header owns a direct workspace entry rather than merely containing the route elsewhere in source. Preserve Clerk sign-out, impersonation and permission behavior.
