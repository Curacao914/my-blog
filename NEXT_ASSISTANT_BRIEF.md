# Next Assistant Brief

Use this as the first briefing for a new model or coding agent.

## One-paragraph context

`Curacao914/my-blog` is a NotionNext-based personal site becoming law-tech.dev. Work happens on `codex/homepage-phase1`; `main` and `law-tech.dev` remain production and must not be touched without explicit approval. Preview Clerk authentication is working. The course workflow now supports browser material import, OCR, lesson grouping, outline approval, node writing, independent review, local revision, final assembly, rendered Markdown reading, user-controlled final revision, and manual completion. A new note library presents `course → lesson → final note`. Local targeted tests and `npm run build` passed for the latest course-library phase; deployed Preview behavior still needs verification.

## Start every session with

```bash
cd "/Users/curacao/Script/个人主页/my-blog-main" || exit 1

git status --short
git branch --show-current
git fetch origin
git rev-list --left-right --count HEAD...origin/codex/homepage-phase1
git log -5 --oneline
```

Expected branch: `codex/homepage-phase1`.

If the worktree is clean and the branch is behind:

```bash
git pull --ff-only origin codex/homepage-phase1
```

Do not automatically reset, stash, discard, merge, rebase, push, or switch branches when the worktree is dirty. Explain the state first.

## Read before changing code

1. `AGENTS.md`
2. `docs/LAW_TECH_PROGRESS.md`
3. `PROJECT_STATUS.md`
4. The actual source files, current test output, and Preview logs relevant to the request

## Current invariants

- No production merge, promotion, repository swap, or force-push without explicit approval.
- Preview and Production are separate deployment/auth surfaces.
- Durable Workflow is the course execution path; browser UI is status/control only.
- Do not restore the former high-frequency `/workflow` + `/run-next` browser loop.
- Default course concurrency remains one writer, up to two reviewers, and one revision lane.
- Final AI review is no longer automatic.
- Final revision runs only after the user provides a concrete instruction.
- A completed note remains editable and versioned.
- `lesson.finalNote` is the current canonical lesson-note record.
- The note library is a view over course workflow data, not a duplicate note database.
- Pause blocks new task claims but may allow already in-flight model calls to finish.
- Hosted Clerk auth fails closed and uses direct server-side session verification.
- Clerk must not be casually moved into Edge middleware.
- Today uses `Asia/Shanghai` pure calendar dates.
- Notion manual refresh is administrator-only.
- Custom webpack split chunks remain client-only.
- The user has disabled `rm -rf`.
- Secrets must never be committed or copied into continuity docs.

## Latest implemented phase

The latest coherent phase added:

- final-note feedback text and explicit `request-final-revision`;
- a single bounded final revision call after user feedback;
- completed-course labels such as `查看笔记`;
- removal of stale floating task state after completion;
- `加课次` for an existing course;
- renaming the ambiguous `材料` area to `笔记库`;
- a note library grouped by course and lesson;
- local course-worker temp cleanup with a 24-hour default TTL;
- `docs/LAW_TECH_PROGRESS.md` as the Chinese product-progress handoff.

Reported local evidence:

- targeted Jest tests passed;
- `git diff --check` passed;
- `npm run build` completed.

Still unverified:

- the latest phase on deployed Preview;
- OCR service-side expiry cleanup;
- Production behavior.

## Verify next on Preview

1. Open a completed or final-confirmation lesson.
2. Submit a concrete final revision request.
3. Confirm only one revision task runs and the page returns to manual confirmation.
4. Confirm completion changes the course card to `已完成 / 查看笔记`.
5. Confirm the floating task indicator disappears after completion.
6. Open `笔记库` and verify course → lesson ordering, counts, summaries, and links.
7. Use `加课次` and confirm it adds to the same course rather than creating an unrelated course.
8. Observe that no final automatic review continues spending model credits.

## Next planned product work

Completed or code-complete foundations: lesson-note lifecycle, course-note publishing, unified public index, site-wide surface consolidation, and the first 09:00 Asia/Shanghai email-digest implementation.

Current order:

1. Apply and Preview-verify the reminder preference migration, Resend test email, and authenticated manual runner.
2. Build Writing Studio on the existing content/version model.
3. Complete validated share links and password access.
4. Deepen System settings and diagnostics.
5. Optionally evaluate one-way Notion synchronization.
6. Prepare an explicitly approved Production rollout and rollback plan.

## End every coding response with a complete handoff

After tests, include all of the following without waiting for the user to ask again:

```bash
git restore test-results/junit.xml 2>/dev/null || true
git diff --check
git status --short
```

Then provide exact `git add` paths based on actual changed files, followed by:

```bash
git diff --cached --check
git diff --cached --stat
git status --short

git commit -m "<coherent message>"
git push origin codex/homepage-phase1
```

Never include nonexistent test paths in `git add`. A failed pathspec aborts the whole staging command.

## Latest Phase Override: Lesson Note Lifecycle

The latest patch adds a recoverable lesson-note trash flow. Soft deletion retains the final note and versions. Permanent deletion requires typing `永久删除`, clears only the final-note layer, preserves source material, outline, approved nodes and node reviews, and leaves regeneration as a separate explicit action. After verification, the next phase is course-note publishing into Supabase content records and `/content`.

## Current Phase Override: Course Publishing Core

The current large phase connects completed course notes to the publishing desk and Supabase content records. Course notes default to `遇事不决 → 课程名 → 单课笔记`. The phrase `遇事不决` is intentionally the user's law-note category (“遇事不决，北大法学”), not a miscellaneous category. The public content index must merge database content with legacy live JSON / Notion-derived snapshots instead of replacing one source with the other.


## Current Phase Override: Independent Note Reading

The newest phase separates reading from production. `/desk/materials` now presents `遇事不决 → 课程 → 课次` with collapsed courses, search and sorting. An available lesson opens `/desk/materials/[jobId]/[lessonKey]`, where the user gets a dedicated Markdown reader, course directory, previous/next lesson navigation and a table of contents. Editing, publishing and deletion stay under a secondary `管理` menu. Full local Jest/build and deployed Preview verification are still required for this phase.


## Course publication source compatibility

The deployed `content_items_source_check` accepts `course-worker`, not `course-workflow`. Browser course publication therefore persists `source = course-worker` and uses the namespaced `source_id = <jobId>:<lessonKey>` to distinguish workflow notes. Reads remain backward-compatible with both labels so any short-lived test records are still discoverable. Do not change the write label without an explicit Supabase constraint migration.

## Current Phase Override: Content Library and Reading Navigation

The latest patch turns `/content` from a placeholder-like landing page into a compact searchable library. Published Notion post metadata is included alongside live JSON and Supabase content, while old Notion routes remain intact. Public detail pages and private course-note pages share stable Markdown heading ids, active-section navigation, and reading progress. Course and table-of-contents panels can be collapsed; on narrower screens they become floating panels. Publishing category and collection fields are writable datalist inputs, and tags are compact chips with reusable suggestions. The animated Curacao signature is reused in sidebar footers. Product copy must remain neutral and must not contain development jokes or assistant commentary.

## Current Phase Override: Content Hierarchy, Covers, Scrolling and Latency

The latest patch fixes the deployed content-library and reader defects reported from Preview. `/content` now begins with the four product categories and progressively reveals collections and cards. The filter sidebar is sticky, every card has a real or deterministic generated cover, Notion posts default to the `文章` collection, and card surfaces use restrained glass and hover lift. The shared reading navigator resolves the actual scroll container and no longer uses active-item `scrollIntoView`, preventing the course reader from snapping to the top and allowing active headings and clicks to track correctly. Publishing uses reliable editable menus, category-scoped collection choices, dense inline tag chips, and an optional cover URL. Content API reads bulk-load relations and cache Notion taxonomy to reduce multi-second waits. Dependency-backed Jest, `npm run build`, and Preview verification remain required.

## Current Phase Override: Unified Public Discovery and Syndication

The newest phase connects the stable content library back to the whole public site. A shared server-side index merges Notion metadata, live JSON, and Supabase publications. The homepage shows recent content and the four-category library map; `/search` uses the same index; RSS, Atom, JSON Feed, and sitemap exposure respect each publication's access and syndication flags. Publishing and withdrawal must refresh home, content, search, and the affected detail route together. Do not create a second content store or copy Notion bodies merely to support discovery. Full Jest, `npm run build`, and latest Preview verification remain required.

## Previous Phase: Site-wide Surface Audit and Product Consolidation

Status: implementation and local checks completed; the user finished a first manual Preview traversal and reported no obvious frontend blocker. Smaller visual issues are intentionally deferred.

Implemented scope:

- added `docs/SITE_SURFACE_AUDIT.md` as the route and product-state map;
- redesigned homepage recent content as one featured item plus four compact items;
- unified archive, category, and tag pages on the merged Notion/live-JSON/Supabase index and the new public visual shell;
- redirected legacy pagination, old search pagination, and the old dashboard into current surfaces;
- standardized 404, 500, generic error, OAuth result, and unfinished share-link states;
- disabled the unfinished legacy Notion OAuth exchange and removed all secret/token transport from that surface;
- replaced placeholder Tasks, Writing, and System pages with real task, writing-summary, health, and sync surfaces;
- added administrator content sync for Notion cache clearing, merged-index refresh, Notion body extraction, public discovery/detail revalidation, optional Algolia synchronization, and guarded stale-Notion-index cleanup;
- upgraded `/search` to progressive Algolia full-text search with the current local merged-index search as fallback;
- Notion body text and Supabase Markdown may be included in administrator indexing, while private, password-protected, withdrawn, and indexing-disabled content stay out;
- publication updates Algolia and withdrawal removes the corresponding object when Algolia is configured.

Future regressions should still be checked against every route listed in `docs/SITE_SURFACE_AUDIT.md`, not only the page changed most recently.


## Current Phase: Workbench Identity and Email Reminders

The workbench sidebar header now has product meaning: the existing pixel Link avatar, browser-local date/time, the exact line `看到我记得喝口水`, and authenticated counts for today, active tasks, and drafts. Weather is intentionally excluded.

The first reminder release adds administrator-only preferences, Resend test mail, a daily digest runner, next-24-hour reminder inclusion, and an optional Monday review. Preferences live in `reminder_preferences`; apply `lib/db/migrations/20260628_reminder_preferences.sql` before testing. The first release intentionally fixes `Asia/Shanghai`, 09:00, and Monday rather than pretending arbitrary schedules are already supported.

Vercel Cron is configured at `0 1 * * *` UTC. It runs only on Production deployments; Preview requires an authenticated manual call. Required production secrets are `RESEND_API_KEY`, a verified `REMINDER_FROM`, and `CRON_SECRET`. See `docs/REMINDER_EMAIL_SETUP.md`.

After this phase is Preview-verified, the next large feature is Writing Studio, followed by secure sharing/password access and deeper settings.
