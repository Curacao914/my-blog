# Public Workspace Entry Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore a persistent one-click workspace entry on public pages and close the related loading, responsive, focus and test gaps.

**Architecture:** Keep `WorkspaceAccountMenu` responsible for authentication and identity actions, but render navigation and account disclosure as separate sibling controls. Route restricted profiles through the existing status destinations and keep all Clerk/session behavior intact.

**Tech Stack:** Next.js 14, React 18, Clerk, Jest, Testing Library, scoped CSS.

---

### Task 1: Lock the public entry contract

**Files:**
- Modify: `__tests__/components/WorkspaceAccountMenu.test.js`
- Modify: `__tests__/components/UnifiedShellNavigation.test.js`

- [ ] Render public account controls for active, pending, suspended, loading and signed-out states.
- [ ] Assert an active profile has a direct `工作台` link to `/desk/today` without opening the account menu.
- [ ] Assert pending and suspended profiles link to their existing status pages.
- [ ] Assert the source-level navigation test cannot pass solely because the Dock contains `/desk/today`.
- [ ] Run the focused tests and confirm failure on the missing direct entry.

### Task 2: Separate workspace navigation from account disclosure

**Files:**
- Modify: `components/WorkspaceAccountMenu.js`
- Modify: `styles/lawtech-system.css`

- [ ] Add a public-only direct workspace/status link beside the account trigger.
- [ ] Keep login and registration unchanged for signed-out visitors.
- [ ] Keep a stable action during Clerk/workspace hydration.
- [ ] Add compact responsive styles that keep the action visible without depending on the Dock.
- [ ] Re-run the focused tests and confirm all states pass.

### Task 3: Close account popover focus behavior

**Files:**
- Modify: `components/WorkspaceAccountMenu.js`
- Modify: `__tests__/components/WorkspaceAccountMenu.test.js`

- [ ] Add trigger and popover refs.
- [ ] Focus the first popover action after opening.
- [ ] On Escape, close and return focus to the trigger.
- [ ] Verify pointer-close, sign-out and identity-switch behavior remain unchanged.

### Task 4: Regression and delivery

**Files:**
- Modify only concrete defects discovered by verification.

- [ ] Run account, auth, shell and product-copy suites.
- [ ] Run the consolidated frontend suite and production build.
- [ ] Run `git diff --check`, verify exact scope, commit and push PR #23.
- [ ] Verify the Preview header at desktop and mobile widths and confirm unauthenticated `/desk` routes still redirect to sign-in.
