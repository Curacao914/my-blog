# Public and Desk Unified Frontend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Unify the public site and `/desk` workbench into one restrained, product-grade visual and interaction system without changing routes, permissions, data semantics, APIs, or workflows.

**Architecture:** Keep the current Next.js Pages Router and all domain/API boundaries. Treat `styles/lawtech-system.css`, `PublicHeader`, and `DeskShell` as the shared presentation layer; keep business components responsible for their existing state and requests. Add small contract tests around structure, accessibility preferences, navigation, and product copy before changing presentation.

**Tech Stack:** Next.js 14 Pages Router, React 18, styled-jsx, scoped global CSS, Jest, Testing Library.

---

## File map

- `styles/lawtech-system.css`: scoped public/workbench tokens, surfaces, motion, responsive and accessibility preference rules.
- `components/LawTechDeskStyles.js`: desk-module styles; align conflicting foundations only when touched.
- `lib/domain/navigation.js`: navigation grouping only; route keys and hrefs remain unchanged.
- `components/law-tech/PublicHeader.js`: public menu bar, dock/mobile navigation and account entry.
- `components/DeskShell.js`: permission-filtered sidebar/drawer, current-location header and scroll shell.
- `pages/index.js` and existing public page/components: public discovery and reading composition.
- Existing Today, Tasks, Notes, Reading, Courses, Writing, Publishing and System components: presentation only, within current behavior.
- `__tests__/components/UnifiedFrontendFoundation.test.js`: scoped foundation/accessibility contract.
- `__tests__/components/UnifiedShellNavigation.test.js`: route, permission and mobile-shell contract.
- `__tests__/components/ProductCopy.test.js`: prohibited explanatory-copy gate.

## Closed loop 0: executable baseline

### Task 1: Verify the current baseline

**Files:**
- Modify: this plan (checkboxes only during execution)
- Generated but never commit: `test-results/junit.xml`

- [ ] Confirm branch and scope.

```bash
git status --short --branch
git rev-parse --short HEAD
git rev-list --left-right --count HEAD...origin/main
```

Expected: `codex/homepage-phase1`; HEAD includes `3ef9fc45`; branch contains current `origin/main`.

- [ ] Confirm Node 22+ and dependency availability.

```bash
test -d node_modules && node --version && npm --version
```

If dependencies are absent, run `npm ci` once.

- [ ] Run the baseline frontend contracts.

```bash
npm test -- __tests__/components/HomeDesktopRound3.test.js __tests__/components/HomeSurfacePolish.test.js __tests__/components/PublicBrowseSurfacePolish.test.js __tests__/components/PublicCoreSurfacePolish.test.js __tests__/components/SystemShellRound2.test.js __tests__/components/DeskWorkspace.test.js __tests__/components/ProductCopy.test.js __tests__/components/AuthStabilityAndPasskey.test.js --runInBand
```

Expected: PASS. Record any pre-existing failure before UI edits.

- [ ] Run `npm run build`. Expected: exit 0. If the known workflow page-data error reproduces, capture the exact route and prove it predates UI changes.

- [ ] Restore generated output and verify scope.

```bash
git restore test-results/junit.xml 2>/dev/null || true
git diff --check
git status --short
```

## Closed loop 1: foundations and both shells

### Task 2: Lock the shared visual/accessibility contract

**Files:**
- Create: `__tests__/components/UnifiedFrontendFoundation.test.js`
- Modify: `styles/lawtech-system.css`
- Modify: `components/LawTechDeskStyles.js`

- [ ] Write a failing test that loads the stylesheet and asserts:

```js
expect(css).toMatch(/--surface-solid:/)
expect(css).toMatch(/--surface-glass:/)
expect(css).toMatch(/prefers-reduced-motion: reduce/)
expect(css).toMatch(/prefers-reduced-transparency: reduce/)
expect(css).toMatch(/prefers-contrast: more/)
expect(css).toMatch(/:focus-visible/)
expect(css).toMatch(/:active/)
```

Also assert that new rules do not globally override NotionNext body/link/button/card behavior without a law-tech scope.

- [ ] Run the test and expect FAIL on the missing contract.

```bash
npm test -- __tests__/components/UnifiedFrontendFoundation.test.js --runInBand
```

- [ ] Define scoped tokens for solid/glass surfaces, text hierarchy, spacing, radius, shadow, focus ring and press scale. Add short transform/opacity feedback and three accessibility preference queries. Map touched desk styles to these variables without broad rewrites.

- [ ] Verify:

```bash
npm test -- __tests__/components/UnifiedFrontendFoundation.test.js __tests__/components/SystemLayerContract.test.js __tests__/components/SystemUIRound8Stability.test.js --runInBand
```

Expected: PASS.

### Task 3: Unify navigation without changing access

**Files:**
- Create: `__tests__/components/UnifiedShellNavigation.test.js`
- Modify: `lib/domain/navigation.js`
- Modify: `components/law-tech/PublicHeader.js`
- Modify: `components/DeskShell.js`
- Modify: `components/LawTechIcons.js` only if a retained route lacks an icon

- [ ] Write failing tests preserving every desk route and public destination:

```js
expect(allDeskHrefs).toEqual(expect.arrayContaining([
  '/desk/today', '/desk/tasks', '/desk/inbox', '/desk/reading',
  '/desk/materials', '/desk/courses', '/desk/writing',
  '/desk/publish', '/desk/system'
]))
expect(screen.getByRole('navigation', { name: '工作台导航' })).toBeInTheDocument()
expect(screen.getByRole('button', { name: '打开工作台导航' }))
  .toHaveAttribute('aria-expanded', 'false')
```

Render a member profile and verify disallowed course/writing/system links remain absent. Verify Content, Search, Tools, About and account/workbench access remain in the public shell.

- [ ] Run the new test and expect FAIL on the new grouping/structure, not setup.

- [ ] Reorder `deskNav` into the approved task model while preserving every key/href and `NAV_PERMISSION`. Simplify duplicate labels, retain current-location feedback, Escape close, account behavior and the existing scroll container.

- [ ] Verify shell/auth regressions:

```bash
npm test -- __tests__/components/UnifiedShellNavigation.test.js __tests__/components/SystemShellRound2.test.js __tests__/components/DeskWorkspace.test.js __tests__/components/AuthStabilityAndPasskey.test.js __tests__/lib/deskPageAuth.test.js --runInBand
npm run build
```

- [ ] Restore generated output, run diff checks, stage only actual closed-loop-1 files, and commit:

```bash
git commit -m "feat: unify public and desk interface foundations"
```

## Closed loop 2: public site

### Task 4: Recompose the homepage

**Files:**
- Modify: `pages/index.js`
- Modify: `lib/domain/publicHome.js` only when reordering existing real links
- Modify: `__tests__/components/HomeDesktopRound3.test.js`
- Modify: `__tests__/components/HomeSurfacePolish.test.js`
- Modify: `__tests__/components/ProductCopy.test.js`

- [ ] Add failing assertions that the first content region exposes search, featured/recent content and real quick links; all destinations remain; there is no profile billboard, decorative command grid, implementation explanation or frozen exploration copy.
- [ ] Run the three tests and confirm the intended failure.
- [ ] Recompose existing sections while keeping `loadPublicContentIndex`, generated covers, href helpers and search submission unchanged.
- [ ] Verify the three tests plus `PublicHomeCompatibility` and `HomeCardsAndWritingRace`.

### Task 5: Unify discovery, reading, About and tools

**Files:**
- Modify: `components/content/PublicDirectoryPage.js`
- Modify: `components/content/PublicContentCard.js`
- Modify: `pages/content/index.js`
- Modify: `pages/search/index.js`
- Modify: `pages/content/[...slug].js`
- Modify: `pages/about/index.js`
- Modify: `pages/tools/index.js`
- Modify: focused `Public*` and `ProductCopy` tests only where contracts change

- [ ] Add failing contracts for shared hierarchy, intact filters/search/access behavior, readable long-form navigation, real empty/error actions and no development/explanatory wording.
- [ ] Run:

```bash
npm test -- __tests__/components/PublicBrowseSurfacePolish.test.js __tests__/components/PublicCoreSurfacePolish.test.js __tests__/components/ContentReadingSurfacePolish.test.js __tests__/components/PublicContentDiscovery.test.js __tests__/components/PublicContentExperience.test.js __tests__/components/PublicFullTextSearch.test.js __tests__/components/ProductCopy.test.js --runInBand
```

- [ ] Change only hierarchy, layout, density, surface treatment, labels and responsive placement. Preserve public-index precedence, access flags, search fallback, canonical routes, password flow and reading navigation.
- [ ] Re-run focused tests and `npm run build`.
- [ ] Diff-check, stage only actual loop-2 files, commit as `feat: refine public discovery and reading surfaces`.

## Closed loop 3: workbench frame

### Task 6: Normalize page hierarchy and scrolling

**Files:**
- Modify: `components/DeskShell.js`
- Modify: `components/LawTechDeskStyles.js`
- Modify: `styles/lawtech-system.css`
- Modify: relevant `pages/desk/*/index.js` only to remove redundant title/kicker copy
- Modify: `UnifiedShellNavigation` and `SystemUIRound6LayoutHotfix` tests

- [ ] Add failing assertions for one title source, stable `.desk-page-content` scroll relationship, desktop sidebar, mobile drawer and absence of duplicate route descriptions.
- [ ] Adjust presentation only; keep SSR auth and page components untouched.
- [ ] Verify:

```bash
npm test -- __tests__/components/UnifiedShellNavigation.test.js __tests__/components/SystemShellRound2.test.js __tests__/components/SystemUIRound6LayoutHotfix.test.js __tests__/components/SystemUIRound8Stability.test.js __tests__/components/DeskWorkspace.test.js --runInBand
npm run build
```

- [ ] Ensure no API/domain behavior file entered the diff; commit as `feat: refine workbench navigation and page hierarchy`.

## Closed loop 4: core workflows

### Task 7: Today, Tasks and Notes

**Files:** `components/TodayBoard.js`, current task/note components selected by desk pages, `components/LawTechDeskStyles.js`, focused Today/Desk tests.

- [ ] Lock create/edit/complete/restore/archive actions and busy/error states in failing tests.
- [ ] Reorganize controls and density without changing requests or schedule/note semantics.
- [ ] Run `TodayCardCss`, `TodayReadingSeparation`, `TodayReminderUi`, `DeskWorkspace` and note API/component tests; then build.
- [ ] Commit as `feat: refine daily workbench workflows`.

### Task 8: Reading, materials and readers

**Files:** `components/ReadingBox.js`, `components/CourseNotesLibrary.js`, course note/brief reader components, focused Reading/Course reader tests.

- [ ] Lock bulk actions, cache states, note-draft action, hierarchy, previous/next navigation and scroll binding.
- [ ] Recompose without changing reading mutations, cache keys, `lesson.finalNote` or reader routes.
- [ ] Run all focused `Reading*`, `CourseLibraryUi`, `CourseNoteReaderUi`, and `CourseBriefReader*` tests; then build.
- [ ] Commit as `feat: refine reading and note library workflows`.

### Task 9: Courses, Writing and Publishing

**Files:** course workspace components selected by `pages/desk/courses/index.js`, `components/WritingDesk.js`, `components/WritingPublishDialog.js`, `components/ContentPublishingDesk.js`, focused tests.

- [ ] Lock outline/status/control, autosave, preview, archive, publication fields, busy/error and permission behavior.
- [ ] Reorganize controls without changing workflow state, autosave timing, publication source or payloads.
- [ ] Run focused Course/Writing/Publishing tests and build.
- [ ] Commit as `feat: refine course and publishing workflows`.

### Task 10: System, account and administration

**Files:** `components/SystemDesk.js`, rendered account/settings components, `components/WorkspaceAccountMenu.js` only for presentation/accessibility, focused System/Auth tests.

- [ ] Lock owner/member visibility, impersonation, security link, account actions and admin-only sections.
- [ ] Reorganize settings into concise task groups without changing auth or save APIs.
- [ ] Run `System*`, `AuthStabilityAndPasskey`, `DeskWorkspace` and auth tests; then build.
- [ ] Commit as `feat: refine system and account settings`.

## Closed loop 5: closure

### Task 11: Copy, accessibility and regression closure

**Files:** `ProductCopy.test.js`, presentation files only for concrete final defects, continuity docs only if verified state changes.

- [ ] Audit source for architecture, implementation, deployment, assistant and placeholder language. Review matches in context; retain legitimate product terms such as “系统” settings and “AI 生成”.
- [ ] Run the consolidated frontend suite:

```bash
npm test -- __tests__/components/UnifiedFrontendFoundation.test.js __tests__/components/UnifiedShellNavigation.test.js __tests__/components/HomeDesktopRound3.test.js __tests__/components/HomeSurfacePolish.test.js __tests__/components/PublicBrowseSurfacePolish.test.js __tests__/components/PublicCoreSurfacePolish.test.js __tests__/components/ContentReadingSurfacePolish.test.js __tests__/components/PublicContentDiscovery.test.js __tests__/components/PublicContentExperience.test.js __tests__/components/PublicFullTextSearch.test.js __tests__/components/DeskWorkspace.test.js __tests__/components/ProductCopy.test.js __tests__/components/AuthStabilityAndPasskey.test.js --runInBand
```

- [ ] Run all focused suites recorded in Tasks 7–10, then `npm run build`.
- [ ] Restore `test-results/junit.xml`, run `git diff --check`, and verify exact status.
- [ ] Push the development branch and verify Preview routes: `/`, `/content`, `/search`, `/about`, `/tools`, one public article, and every `/desk` route on desktop and mobile widths. Exercise one real save/restore path per affected workflow group without changing Production.
- [ ] Report exact commits, pushed branch, test/build results, Preview evidence, unverified external paths and deferred non-blocking polish. Do not merge to `main` or promote Production without explicit approval and rollback preparation.
