# law-tech.dev Project Status

Last updated: 2026-06-27, Asia/Shanghai

Repository: `Curacao914/my-blog`

Working branch: `codex/homepage-phase1`

Production branch: `main` — do not merge or promote without explicit user approval.

Preview: `https://preview.law-tech.dev`

Production: `https://law-tech.dev`

## Executive Summary

The current branch contains the new public-home/private-workspace reconstruction, durable course workflow, Clerk administrator authorization, manual Notion refresh, Today date corrections, and the newest course-note experience.

The course flow now reaches a human-controlled final state: material import and OCR, lesson grouping, preferences, outline approval, node writing, independent review, local revision, final assembly, rendered Markdown reading, direct editing, explicit user-requested final revision, and manual completion. Completed notes are exposed through a new note library organized as `course → lesson → final note`.

The latest targeted tests and production build were reported successful locally. The newest note-library/final-feedback phase still requires deployed Preview verification. Production remains unchanged.

## Source of Truth and Safety

1. Git state, current code, database state, deployed behavior, and explicit test output override this document.
2. Work on `codex/homepage-phase1` unless the user explicitly changes branches.
3. Do not merge or modify `main`, promote Preview, replace the production repository, rotate secrets, or force-push without explicit approval.
4. The user has disabled `rm -rf`; use safe path-checked cleanup.
5. Update continuity documents whenever a coherent phase materially changes architecture, status, or next steps.

## Current System State

### 1. Durable course processing

Key files include:

- `workflows/courseProcessing.js`
- `lib/course/orchestrator.js`
- `lib/course/runBatch.js`
- `lib/course/workerTasks.js`
- `lib/course/workflowState.js`
- `lib/course/onlineRunner.js`
- `lib/courseRepository.js`
- `components/CourseTaskManager.js`
- `components/CourseTextPackDesk.js`

Behavior:

- Vercel Workflow is the durable execution engine.
- The browser is a status and control surface.
- One bounded batch runs per durable step.
- Course state is persisted before the next step starts.
- Closing the browser should not stop processing.
- High-frequency browser polling must not return.
- Default concurrency is one writer, up to two reviewers, and one revision lane.
- Pause is soft: new task claims stop, while in-flight requests may complete and save results.

Status: code-integrated and locally tested; latest deployed close-page and pause/resume behavior still requires Preview verification.

### 2. Course review and final control

Current behavior:

- Model review scores are normalized from either 0–10 or 0–100 into 0–100.
- Only substantive blocking issues trigger automatic node revision.
- Low scores without a blocking issue go to human judgment instead of endless rewrite loops.
- Local revisions may run beside unrelated writing where dependency rules permit.
- Final automatic AI review is removed from the normal workflow.
- After final assembly, the user can:
  - read rendered Markdown;
  - inspect a restrained character count;
  - edit and save directly;
  - submit a concrete final revision request;
  - approve completion.
- A final revision model call runs only after explicit user feedback.
- Completed notes remain readable and editable.

Status: code-integrated, targeted tests and build passed locally; Preview verification pending.

### 3. Course and note hierarchy

Current data model:

```text
course_jobs row
  └─ workflow.lessons[]
       ├─ source/transcript/material mapping
       ├─ outline and versions
       ├─ writing/review nodes and versions
       ├─ finalNote
       ├─ finalNoteVersions
       └─ finalRevisionRequests
```

Current UI:

- `/desk/courses` is the workflow and import surface.
- `/desk/materials` is now labeled `笔记库`.
- The note library shows courses, lessons, status, approximate character count, summary, and direct links.
- Completed course cards show `查看笔记`.
- Existing courses can receive new material or lessons through `加课次`.

Important boundary:

- `lesson.finalNote` is the current canonical lesson note.
- The note library does not duplicate final Markdown.
- Lesson-level soft delete, restore, and permanent delete are not yet implemented.
- Course final notes are not yet connected to the public Supabase content records.

### 4. Clerk authorization

Behavior:

- Preview admin login is working.
- Server-side authorization directly verifies the Clerk session without relying on Clerk Edge middleware.
- Hosted Preview and Production fail closed if Clerk keys or the admin allowlist are missing.
- Production-scoped variables will still be required before rollout:
  - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
  - `CLERK_SECRET_KEY`
  - `CLERK_ADMIN_EMAILS` or `CLERK_ADMIN_USER_IDS`

Do not place Clerk back into Edge middleware casually; it previously caused `MIDDLEWARE_INVOCATION_FAILED`.

Status: Preview entry verified; Production not configured or verified for this branch.

### 5. Notion and public content

Current behavior:

- Existing NotionNext routes remain the compatibility layer for legacy articles and archive features.
- Administrator-only manual revalidation exists.
- Default ISR is six hours.
- New course final notes are not yet published to the Supabase content tables.
- Notion one-way mirroring is not implemented.
- The homepage does not yet unify legacy articles and new content records into one final index.

### 6. Today and workspace UI

- Date classification uses pure `Asia/Shanghai` calendar dates.
- Today and overdue items occupy the primary Today surface.
- Near-future items appear in a subdued `稍后` list.
- The design system remains warm white, pale blue-green, ink green, serif display type, large radius, and restrained glass.
- Course review surfaces use scrollable regions and a focus mode rather than hiding critical long content.

### 7. Build compatibility

- `workflow` remains pinned at `4.5.0`.
- The custom production `splitChunks` override must stay client-only.
- This prevents the Workflow server route from loading a browser-oriented chunk with `self is not defined`.
- `react-markdown` is ESM; Jest component tests mock it rather than changing the whole transform pipeline.

### 8. Temporary files and resource control

- Browser imports do not persist original raw files on Vercel.
- OCR completion requests deletion of the OCR task, but OCR service-side expiry cleanup still needs independent verification.
- Local course-worker temporary directories use safe, path-checked deletion.
- `npm run course:worker:cleanup-temp` removes expired local course temp directories.
- Default TTL is 24 hours.
- `prepare-local` performs opportunistic expired-temp cleanup.
- This is not a clock-scheduled daily cleanup job.

## Latest Validation Evidence

Reported by the user for the latest course note-library/final-feedback phase:

- targeted Jest suites passed;
- `git diff --check` passed;
- `npm run build` completed with the route table.

Do not upgrade this evidence to Preview-verified until deployed behavior is checked.

## Immediate Preview Checklist

1. Final revision request triggers one bounded revision task.
2. Revised final note returns to human confirmation.
3. Completion is reflected as `已完成 / 查看笔记`.
4. The floating course task indicator disappears after completion.
5. `笔记库` correctly shows course → lesson grouping.
6. Direct lesson links open the intended lesson.
7. `加课次` reuses the same course.
8. Pause/resume does not create duplicate or abandoned communication state.
9. No automatic final-review model spending occurs.

## Planned Work Order

1. Preview verification of the latest phase.
2. Lesson-note soft delete, restore, and permanent deletion.
3. Publish course final notes into Supabase content records and `/content`.
4. Optional one-way Notion synchronization.
5. Unified legacy and new content index.
6. Production Clerk configuration and explicitly approved merge to `main`.
7. Daily 09:00 Asia/Shanghai workspace digest.
8. First Load JS optimization after correctness and deployment stability.

## Recommended Session Start

```bash
cd "/Users/curacao/Script/个人主页/my-blog-main" || exit 1

git status --short
git branch --show-current
git fetch origin
git rev-list --left-right --count HEAD...origin/codex/homepage-phase1
```

If clean and behind:

```bash
git pull --ff-only origin codex/homepage-phase1
```

## Recommended Session End

Run relevant targeted tests, then:

```bash
npm run build
git restore test-results/junit.xml 2>/dev/null || true
git diff --check
git status --short
```

Stage only the real coherent change, inspect the staged diff, commit, and push:

```bash
git diff --cached --check
git diff --cached --stat
git status --short

git commit -m "<coherent message>"
git push origin codex/homepage-phase1
```

## Latest Phase: Lesson Note Lifecycle

Status: code patch prepared; local tests and Preview verification still required.

The note library now supports:

- soft deletion into a recoverable trash view;
- restoration without losing Markdown or final-note versions;
- guarded permanent deletion after an explicit confirmation phrase;
- preservation of source material, outline, node drafts, node reviews, and approved-node state;
- explicit regeneration from approved nodes, with no automatic model spending after deletion.

This supersedes the earlier statement that lesson-level deletion was not implemented. The next product phase after verification is course final note publishing into Supabase content records and `/content`.

## Current Large Phase: Course Publishing Core

Status: patch prepared; local tests, build, and Preview verification are required.

Scope included in this phase:

- completed course note → publishing desk;
- title, summary, category, collection, tags, slug, access and indexing settings;
- draft save, publish, update and withdraw;
- source linkage back to the course lesson;
- stale publication indicator after the course final note changes;
- public grouping by `栏目 → 合集 → 内容`;
- database + legacy live JSON compatibility with slug-level deduplication;
- default course-note hierarchy `遇事不决 → 课程名 → 单课笔记`.

The next phase after verification is broader Notion-source normalization and unified homepage/search/RSS exposure.


## Current Phase: Independent Course Note Reader

Status: code integrated in the handoff package; syntax/model contract checks passed in the review sandbox. Full dependency-backed Jest, production build and Preview verification remain required.

Implemented scope:

- `/desk/materials` uses the hierarchy `遇事不决 → 课程 → 课次`;
- courses are collapsed by default;
- search covers course, teacher, lesson title and note summary;
- sorting supports recent update and course name;
- clicking an available note opens `/desk/materials/[jobId]/[lessonKey]` rather than `/desk/courses`;
- the reader contains course breadcrumbs, an ordered lesson directory, Markdown rendering, a table of contents and previous/next lesson navigation;
- edit, publish and trash actions are hidden under `管理`;
- trash, restore and guarded permanent deletion remain available without duplicating `lesson.finalNote`.

Preview acceptance must confirm that the new dynamic page and `/api/courses/notes/[id]` are protected by Clerk admin authorization and can read the intended owner's note only.


## Course publication source compatibility

The deployed `content_items_source_check` accepts `course-worker`, not `course-workflow`. Browser course publication therefore persists `source = course-worker` and uses the namespaced `source_id = <jobId>:<lessonKey>` to distinguish workflow notes. Reads remain backward-compatible with both labels so any short-lived test records are still discoverable. Do not change the write label without an explicit Supabase constraint migration.

## Current Phase: Content Library and Reading Navigation

Status: code prepared in the current handoff workspace. TypeScript transpile parsing, `git diff --check`, taxonomy smoke tests, and Notion-normalization smoke tests pass. Dependency-backed Jest, production build, and Preview verification remain required.

Implemented scope:

- removed development-commentary copy from the note-library category panel;
- collapsible lesson directory and live table of contents in the independent course-note reader;
- active heading tracking and document reading percentage;
- shared Markdown heading ids and duplicate-leading-title removal;
- public content detail reading navigation and improved Markdown typography;
- editable category/collection suggestions and compact tag chips in the publishing desk;
- public content library search, category/type/tag filters, compact cards, and sidebar signature;
- gradual Notion inclusion by indexing published Notion metadata while preserving existing article routes;
- reusable animated Curacao signature component for new public and reading sidebars.

## Current Phase: Content Hierarchy and Reader Reliability

Status: code prepared in the current handoff workspace. Static syntax/transpile checks, `git diff --check`, taxonomy/Notion/public-card smoke checks, and patch-application checks are required before handoff; dependency-backed Jest, production build, and Preview verification remain local tasks.

Implemented scope:

- sticky `/content` filter sidebar without an overflow ancestor disabling `position: sticky`;
- four-category first view, followed by collapsible collection and content levels;
- Notion fallback collection `文章` instead of `独立内容`;
- persisted or deterministic generated covers, glass cards and hover lift;
- scroll-container-aware table of contents for both `.desk-page-content` and `window`;
- removal of active TOC `scrollIntoView`, which previously caused snap-back to the top;
- category-aware editable collection choices, dense inline tag chips and optional cover URL in publishing;
- bulk Supabase relation reads, Notion taxonomy caching and optimistic publishing refresh to reduce waiting.

## Current Phase: Unified Public Content Discovery

Status: code prepared in the current handoff workspace. `git diff --check`, changed-file JavaScript/JSX transpile parsing, public-content selection smoke tests, and revalidation-path smoke tests pass. Dependency-backed Jest, production build, and Preview verification remain required.

Implemented scope:

- one reusable public-content index merges published Notion metadata, live JSON snapshots, and Supabase content rows with database precedence by slug;
- the public homepage now presents recent opted-in content, category counts, reusable content cards, and a stable library map;
- `/search` searches the unified index across title, summary, category, collection, course metadata, and tags;
- legacy `/search/[keyword]` links redirect into the unified search page;
- RSS 2.0, Atom, and JSON Feed routes expose only public content with `allowRss = true`;
- the sitemap includes new public content only when `allowSitemap = true` and indexing is allowed, while existing Notion routes remain intact;
- publishing and withdrawal revalidate `/`, `/content`, `/search`, and the affected content detail route together;
- shared public cards preserve a real cover when available and generate a deterministic cover otherwise.

The next phase after verification is optional one-way Notion mirroring or broader homepage/content polish based on observed Preview behavior. Supabase remains the source of truth for new workbench publications.

## Current Phase: Site-wide Surface Audit and Product Consolidation

Status: implementation, local checks, build, and initial manual Preview traversal completed. The user reported no obvious frontend blocker; smaller visual issues are deferred for a later consolidated polish pass.

Main changes:

- one documented route map in `docs/SITE_SURFACE_AUDIT.md`;
- one shared public browsing model for content, archive, category, tag, and search;
- one workbench shell with functional Tasks, Writing, and System surfaces;
- administrator-controlled Notion/content synchronization with Notion body extraction for full-text search;
- progressive Algolia full-text search with local fallback;
- explicit shutdown of the unfinished OAuth exchange and removal of token-display UI;
- legacy routes redirected instead of maintaining parallel themes and workspaces.

The route traversal is recorded as initially accepted. Outstanding environment checks remain Algolia full-text mode, administrator content sync, and production-only scheduled email execution.


## Current Phase: Workbench Identity and Scheduled Email

Status: implementation prepared in the handoff workspace. The patch still requires dependency-backed Jest, `npm run build`, Supabase migration, Preview test email, and an authenticated manual runner call.

Implemented scope:

- the sidebar identity block now uses the existing pixel Link avatar rather than an ornamental initial;
- browser-local date/time and the exact hydration line `看到我记得喝口水` replace `law-tech / PERSONAL WORKSPACE`;
- authenticated status counts summarize today's actions, all active actions, and non-archived note drafts;
- `/desk/system` owns private email preference controls and test delivery;
- `reminder_preferences` stores one owner's recipient and daily / next-24-hour / Monday-review switches;
- `/api/reminders/run` accepts Vercel `CRON_SECRET`, groups data by owner, sends one digest per owner, records reminder outcomes, and prevents same-date daily/weekly repeats;
- the production schedule is `0 1 * * *` UTC, approximately 09:00 Asia/Shanghai;
- `docs/REMINDER_EMAIL_SETUP.md` is the deployment and verification source of truth.

The next major product phase after reminder verification is Writing Studio. Secure share links and deeper System settings remain after it. Automatic Cron delivery cannot be marked verified until this code is in Vercel Production.

## Current Phase: Multi-user Workspace and Private Service Configuration

Status: implementation prepared in the current handoff workspace. Changed-file syntax parsing and `git diff --check` pass; dependency-backed Jest, production build, database migration and two-account Preview security verification remain required.

Implemented scope:

- owner/member/pending/suspended workspace identities backed by Clerk and `profiles`;
- per-feature permissions for schedule, notes, reading, courses, writing, reminders, AI and publishing;
- owner member CRUD, invite allowlist, suspension, permission editing and signed identity switching;
- effective-profile isolation for schedule, tasks, notes, reading/materials, courses, content management, reminders and client caches;
- formal `owner_id` columns for tasks, content items and course jobs, with parent-inherited RLS policies for child tables;
- encrypted per-user OpenAI-compatible and Resend configuration;
- members never fall back to owner environment credentials;
- account avatar popover for login, registration/application, profile information, settings and impersonation;
- compact `/desk/system` settings navigation instead of large conceptual cards;
- repairs for identity-card truncation, Today focus overlap/duplication, and publishing/writing action alignment.

Required deployment work:

1. apply `20260628_reminder_preferences.sql` if still pending;
2. apply `20260628_multi_user_workspace.sql`;
3. configure stable `WORKSPACE_SESSION_SECRET` and `USER_SECRETS_ENCRYPTION_KEY`;
4. create a second Clerk account and execute `docs/MULTI_USER_WORKSPACE.md` isolation checks;
5. do not invite real friends or merge `main` until cross-user ID access and per-user credential tests pass.

The next feature phase remains Writing Studio, now built directly on the multi-user owner-scoped model.

## Current Phase Addendum: Workspace Polish and Profile Settings

Status: implementation prepared for local Jest/build and Preview review. No database migration or new environment variable is introduced by this addendum.

Implemented:

- removed the duplicated overdue-item strip that appeared between Today focus cards and grouped lanes;
- normalized action rows so Writing, Publishing, course and settings buttons stay aligned in normal flow;
- replaced native permission checkboxes with compact accessible switches;
- added self-service nickname and remote avatar URL editing at `/desk/system?section=account`;
- added owner-safe `/api/account/profile`, including HTTP(S)-only avatar validation and impersonation protection;
- preserved custom profile avatars instead of re-importing Clerk image URLs on every session;
- clarified that site connection secrets are managed in Vercel/Supabase while System exposes status, recheck and safe maintenance actions;
- added an explicit low-key return-to-home control in desktop and mobile workbench navigation.

Required next verification:

1. run focused and multi-user Jest suites plus `npm run build`;
2. verify Today has no clipped strip and action buttons do not drift at desktop/narrow widths;
3. save a nickname and hosted avatar URL, refresh, and confirm both the sidebar and account popover update;
4. verify an invalid or non-HTTP avatar URL is rejected;
5. complete the real two-account isolation matrix before inviting real users or starting Writing Studio.

## Current Phase: Notion Last-Known-Good Relay

Status: code prepared for local Jest/build, Supabase migration, Preview environment configuration and fault-injection verification.

The relay stores page metadata and record maps as deduplicated Supabase snapshots, mirrors temporary Notion images to Cloudflare R2, and uses one active batch pointer. Promotion occurs only after the complete staging batch succeeds. Old article routes prefer the active batch and fall back to live Notion before the first successful relay sync. Binary assets remain outside Supabase. Deployment source of truth: `docs/R2_NOTION_RELAY.md`.
