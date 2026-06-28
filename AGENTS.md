# AGENTS.md

This repository is `Curacao914/my-blog`. It is a NotionNext-based personal site being rebuilt into law-tech.dev: a public personal home, a private workspace, and a stable content/workflow layer.

## Start Here

Before changing code, read these files in order:

1. `AGENTS.md`
2. `NEXT_ASSISTANT_BRIEF.md`
3. `docs/LAW_TECH_PROGRESS.md`
4. `PROJECT_STATUS.md`
5. The actual files and current test/deployment evidence involved in the request

These documents are continuity aids. Current Git state, current code, database state, deployed behavior, and explicit test output are stronger evidence.

When a coherent change makes these documents stale, update the relevant continuity files in the same commit.

## Repository and Branch Safety

- Repository: `Curacao914/my-blog`
- Current development branch: `codex/homepage-phase1`
- Production branch: `main`
- Preview domain: `https://preview.law-tech.dev`
- Production domain: `https://law-tech.dev`
- Do not modify, merge, force-push, or promote `main` without explicit user approval.
- Do not promote a Vercel Preview to production without explicit approval and a rollback plan.
- Treat Preview and Production environment variables, Clerk instances, cookies, and deployment evidence as separate.
- Batch related changes, run tests and build, then commit and push once per coherent phase.
- Never force-push unless the reason and consequences are fully understood and explicitly approved.

## Git Synchronization Rules

At the beginning of a new coding session:

```bash
cd "/Users/curacao/Script/个人主页/my-blog-main" || exit 1
git status --short
git branch --show-current
git fetch origin
git rev-list --left-right --count HEAD...origin/codex/homepage-phase1
```

Only pull when the worktree is clean:

```bash
git pull --ff-only origin codex/homepage-phase1
```

If the worktree is dirty, do not automatically stash, reset, discard, switch, rebase, or pull. Explain the state first.

Before handing work back to the user, provide the complete sequence in one response:

1. validation commands;
2. `git diff --check` and `git status --short`;
3. exact staging commands based on real changed files;
4. commit command;
5. push command;
6. Preview verification targets.

The user should not need a second turn merely to ask for push instructions.

## Product Architecture

- Keep NotionNext as the compatibility layer for existing article, archive, category, tag, search, RSS, and sitemap routes until replacements are proven.
- The new public home is independent from the NotionNext theme home.
- The private workspace lives under `/desk`.
- Supabase is the intended source of truth for workflow state, permissions, versions, publishing, and new structured content.
- Notion may remain an editing source or optional mirror, but the frontend should not depend on Notion's live response shape.
- Pages are views over normalized data, not isolated data stores.

## Current Course Model

The course system is organized as:

```text
course job
  └─ lessons
       ├─ source material and transcript
       ├─ outline
       ├─ writing/review nodes
       ├─ final note
       └─ note versions
```

Important current behavior:

- Course processing uses a durable server workflow. The browser is a status/control surface.
- Do not reintroduce high-frequency browser polling.
- Closing the browser should not stop durable processing.
- One writer lane, up to two reviewer lanes, and one revision lane remain the default.
- Review scores accept model output on either a 0–10 or 0–100 scale and are normalized to 0–100.
- Final automatic AI review has been removed from the normal path.
- After assembly, the user reads the rendered Markdown, edits directly, submits a specific revision request, or approves completion.
- A final revision model call may run only after explicit user feedback.
- Completed notes are displayed through the note library using the hierarchy `遇事不决 → course → lesson → final note`.
- A note card opens the independent reader under `/desk/materials/[jobId]/[lessonKey]`; reading must not route through the course-production workbench.
- Editing, publishing, trash, restore, and permanent deletion remain secondary actions behind progressive disclosure.
- `lesson.finalNote` remains the current source of truth for a lesson's completed note.
- Do not create a second independent copy of a course note unless implementing the explicit publish/sync pipeline.
- Pause is currently a soft pause: it prevents new task claims, while already in-flight requests may finish and persist results.

## Auth and Data Safety

- Clerk must not be moved back into Edge middleware casually. It previously caused `MIDDLEWARE_INVOCATION_FAILED`.
- Hosted `/desk` pages and private APIs must fail closed when Clerk or the admin allowlist is missing.
- Real Clerk session verification is required; cookie presence is not sufficient.
- Local fallback is only for deliberate non-Vercel development.
- Never commit or print Supabase service keys, Clerk secrets, AI keys, WeChat tokens, Resend keys, or cron tokens.
- External capture endpoints must return success only after the intended write succeeds.
- Frontend changes must not silently change visibility, ownership, schedule, access, pinning, importance, urgency, or publication semantics.

## Resource and File Safety

- The user has disabled `rm -rf`.
- Use path-checked Node cleanup or repository cleanup scripts.
- Browser course imports do not persist original raw files in Vercel.
- Local course-worker temporary directories are cleaned with:

```bash
npm run course:worker:cleanup-temp
```

- The default local temp TTL is 24 hours.
- `prepare-local` also performs opportunistic expired-temp cleanup.
- Do not delete final notes, versions, transcripts, or source records as if they were cache.
- Lesson-level deletion should be implemented as soft delete and recovery before permanent deletion.
- OCR service-side expiry cleanup remains a separate system that must be verified independently.

## Visual Direction

- Preserve warm white, pale blue-green, deep ink green, serif typography, large radius, and soft shadow.
- The desired feeling is restrained, personal, practical, and lightly glass-like.
- Avoid large animated liquid-glass effects.
- Keep repeated work compact, but never hide critical text or controls.
- Prefer progressive disclosure, focus mode, drawers, details, and readable scrolling over tiny fixed boxes.
- Avoid implementation-note copy, architecture exposition, and generic AI filler in product UI.
- Do not add a large UI library without explicit approval.

## Evidence and Completion Rules

- Do not claim a feature is complete merely because files exist.
- Use explicit labels such as code-only, unit-tested, build-passed, Preview-verified, or Production-verified.
- Do not call localhost testing a public end-to-end test.
- Do not silently remove large areas of code.
- Do not use mock, fallback, demo, or hardcoded data to pretend a workflow succeeded.
- Restore `test-results/junit.xml` before commit if Jest changes it.

## Current Next Work

The current priority is the multi-user workspace foundation. Do not continue with Writing Studio until identity, ownership, private service configuration and two-account isolation have been verified on Preview.

Work should proceed in this order unless the user changes priorities:

1. Apply `20260628_reminder_preferences.sql`, then `20260628_multi_user_workspace.sql`.
2. Configure stable `WORKSPACE_SESSION_SECRET` and `USER_SECRETS_ENCRYPTION_KEY`; never rotate the latter after users have saved encrypted credentials without a migration plan.
3. Verify the repaired identity card, Today focus layout, and Writing/Publishing action alignment.
4. Create a second real Clerk account and execute the complete isolation matrix in `docs/MULTI_USER_WORKSPACE.md`, including guessed-ID access, browser-cache separation, AI/Resend separation, suspension, deletion and permission denial.
5. Verify owner identity switching matches the real member account but does not expose owner-only settings while impersonating.
6. Record whether Algolia, administrator content sync and production Cron are configured or merely code-ready; none may be described as production-verified without a real run.
7. Only after the multi-user phase is Preview-verified, continue with Writing Studio, then secure share links/password access and deeper settings.
8. Merge to `main` only after explicit approval, database backup, migration record and rollback plan.

Performance optimization of large shared First Load JS is real debt, but it should not displace correctness, workflow durability, or publication continuity.

## Phase Update: Lesson Note Lifecycle

- Lesson-note deletion now follows `active → trash → restore or permanent delete`.
- Soft delete keeps final Markdown and all final-note versions.
- Permanent deletion requires an explicit confirmation phrase and removes only the final note and final-note versions.
- Source material, outline, nodes, and node reviews remain after permanent deletion.
- Permanent deletion must never automatically regenerate or spend model credits. Regeneration is a separate explicit user action.
- This phase supersedes the earlier note that lesson-level deletion was still pending.
- After local and Preview verification, the next product phase is course-note publishing into Supabase content records and `/content`.

## Content Taxonomy and Publishing Invariant

- `遇事不决` is the user's law-note category, named after the joke “遇事不决，北大法学”. Do not infer that it is a miscellaneous or technical-troubleshooting category from the literal wording.
- The public hierarchy is `栏目 → 合集 → 内容`. For course notes, the default is `遇事不决 → 课程名 → 单课笔记`.
- Folder depth may remain technically recursive, but the product UI should encourage one collection layer rather than arbitrary nesting.
- New course-note publishing writes to Supabase content tables; legacy live JSON / Notion-derived snapshots remain readable and must be merged rather than hidden.
- A database item with the same slug takes precedence over the legacy snapshot, while unrelated legacy content remains visible.


## Phase Update: Independent Course Note Reader

- `/desk/materials` is a hierarchy and discovery surface, not the reading surface itself.
- Courses are collapsed by default and may be searched or sorted before opening their ordered lessons.
- Clicking an available note opens `/desk/materials/[jobId]/[lessonKey]`.
- The reader provides course breadcrumbs, lesson navigation, previous/next links, a Markdown article view, and a local table of contents.
- Workflow state, model execution, outline approval, and reviewer controls do not appear in the reader.
- Editing, publishing, and deletion are secondary actions under `管理`.
- The reader uses `lesson.finalNote`; it does not create a duplicate note store.


## Course publication source compatibility

The deployed `content_items_source_check` accepts `course-worker`, not `course-workflow`. Browser course publication therefore persists `source = course-worker` and uses the namespaced `source_id = <jobId>:<lessonKey>` to distinguish workflow notes. Reads remain backward-compatible with both labels so any short-lived test records are still discoverable. Do not change the write label without an explicit Supabase constraint migration.

## Phase Update: Content Library and Reading Navigation

- Product-facing copy must not expose implementation jokes, debugging commentary, deployment notes, or assistant-to-user banter. Internal explanations belong in docs and handoffs, not in the shipped UI.
- Course-note reading now uses collapsible local lesson and table-of-contents panels. The table of contents tracks the active heading and reading percentage while the document scrolls.
- Public Markdown detail pages use the same heading-id and reading-navigation model as the private course-note reader.
- Publishing taxonomy fields are editable comboboxes: existing categories and collections can be selected, while new values remain writable. Tags use compact removable chips and reusable suggestions.
- The public `/content` index federates three sources: published Notion post metadata, live JSON snapshots, and Supabase content rows. Existing Notion posts keep their current routes; a matching newer snapshot or database slug may override the card without breaking unrelated legacy routes.
- The animated Curacao signature is a reusable visual component. Use it sparingly in suitable sidebar footers; do not present it as a pet widget in the new product UI.

## Phase Update: Hierarchical Content Library and Scroll Reliability

- `/content` starts from the four product categories (`遇事不决`, `法与算法`, `法律之上`, `秘密花园`) and progressively discloses collections and content cards. Do not flatten all cards onto the first screen.
- Public and private reading navigation must bind to the actual scroll container. The workbench scrolls inside `.desk-page-content`, while public pages normally use `window`.
- Never call `scrollIntoView` on an active table-of-contents item when that item lives in a sticky sidebar; adjust only the sidebar nav's own `scrollTop`.
- Public content cards use a persisted cover when available and a deterministic generated cover otherwise. Supabase cover URLs are stored as `content_assets` rows with `alt = cover`.
- Notion posts without an explicit collection belong to the `文章` collection rather than an implementation-facing `独立内容` bucket.
- Publishing taxonomy is category-aware: collection suggestions are scoped by category, while category, collection and tag fields remain writable.
- Content-management reads must avoid per-item relation fetches. Fetch the item set first, then bulk-load versions, access, display and assets for those item IDs.

## Phase Update: Unified Public Content Discovery

- Public discovery surfaces must use the same merged index rather than independently rebuilding Notion, snapshot, and database lists.
- Merge precedence remains Notion metadata → live JSON → Supabase for matching slugs, so new database content wins without hiding unrelated legacy content.
- Homepage recent content respects `display.showInRecent`; pinned items sort first.
- RSS includes only `access.mode = public` items with `allowRss = true`.
- Sitemap inclusion requires public access, `allowSitemap = true`, and indexing not explicitly disabled.
- Password-protected content may remain discoverable by metadata, but it must not enter Algolia, RSS, or sitemap.
- Publishing or withdrawal must revalidate the homepage, `/content`, `/search`, and the affected new-content detail route.
- Legacy Notion article routes remain canonical until an explicit migration decision is made.

## Phase Update: Site-wide Surface Audit and Product Consolidation

- `docs/SITE_SURFACE_AUDIT.md` is the route-level product map. Check it before adding a new page shell, search surface, public directory, or workbench module.
- Minor visual issues accepted for later batching belong in `docs/DEFERRED_POLISH.md`; data loss, auth, save, navigation blockers, and major performance regressions must not be deferred there.
- Public archive, category, and tag pages use the merged public-content index and the shared law-tech visual system. Do not reintroduce a second Notion-only list UI for those routes.
- Notion article detail routes intentionally keep the mature NotionNext renderer until a block-complete replacement is proven.
- `/desk/tasks`, `/desk/writing`, and `/desk/system` are real product surfaces, not conceptual `DeskProductPanel` placeholders.
- Algolia is progressive enhancement. Local merged-index search must remain functional when Algolia is unconfigured or unavailable.
- Only published content with `access.mode = public` and indexing enabled may enter Algolia. Private, password-protected, withdrawn, and no-index content must be absent.
- Administrator content sync clears Notion and public-index caches, reloads merged content, reads Notion article bodies for full-text indexing, optionally updates Algolia, prunes stale Notion search records only after a successful Notion read, and revalidates public discovery/detail pages. It runs in a long-duration server function and must remain administrator-only.
- Public-facing copy describes product behavior rather than vendor configuration. Algolia, Supabase, cache, and synchronization diagnostics belong in `/desk/system`, not in public hero copy.
- The legacy Notion OAuth route is intentionally disabled. Never restore client-secret exchange, token logging, query-string token transport, or persistence without a reviewed server-side credential design.
- Legacy pagination and dashboard routes redirect into the current product surfaces. Do not rebuild parallel public or private navigation systems without explicit approval.
- Share-token rendering remains disabled until server-side token, expiry, revocation, and password checks are implemented.


## Phase Update: Workbench Identity and Email Reminders

- The ornamental `C / law-tech / PERSONAL WORKSPACE` sidebar block is retired. The workbench identity card uses `/curacao-avatar.png`, browser-local date/time, the fixed hydration line `看到我记得喝口水`, and compact Today / active / draft counts.
- Do not add weather to the identity card. The user explicitly preferred the hydration line over weather data.
- Status counts come from authenticated `schedule_items` and `notes`; the frontend may cache them briefly but must not substitute sample values.
- Reminder preferences are private, profile-scoped data in `reminder_preferences`. The first version fixes timezone to `Asia/Shanghai`, daily time to 09:00, and weekly review day to Monday.
- Vercel Cron runs `/api/reminders/run` at `0 1 * * *` UTC. Automatic execution belongs to Production; Preview validation uses test email and an authenticated manual runner call.
- `CRON_SECRET`, Resend keys, sender identity, and saved recipient addresses are server-only. Never expose them through public props, client configuration, logs, URLs, or diagnostics payloads.
- Daily digest, next-24-hour reminders, and Monday review are combined into at most one email per profile per run. Private, unrelated owners must never be combined in one message.
- This phase requires `lib/db/migrations/20260628_reminder_preferences.sql`; code presence alone is not deployment completion. Follow `docs/REMINDER_EMAIL_SETUP.md`.

## Phase Update: Multi-user Workspace, Permissions and Private Integrations

- The workbench is no longer administrator-only. `owner` and invited `member` profiles may enter; uninvited sign-ups remain `pending`, and `suspended` profiles are denied.
- `requireWorkspaceRequest` protects member features, `requireOwnerRequest` protects member/site administration, and system tokens protect cron/workers. Do not replace these with navigation-only checks.
- Personal records must be scoped by the effective `profiles.id` in both repository queries and Supabase RLS. This includes schedule, tasks, notes, reading/materials, reminders, course jobs, content drafts/publications and browser caches.
- The owner may impersonate an active member through a signed HttpOnly cookie for testing. Impersonation must hide owner-only settings and use the target member's data, permissions, AI provider and email provider.
- Members never fall back to the owner's global AI or Resend credentials. Only the real owner may use environment credentials as a compatibility fallback.
- Per-user secrets live in `user_integrations` and are encrypted with AES-256-GCM using `USER_SECRETS_ENCRYPTION_KEY`. Never return plaintext secrets, store them in logs, or rotate the encryption key without a credential migration.
- `/desk/system` is the single settings center. Personal account, AI, email and reminders follow the effective profile; member management and site maintenance appear only for the real, non-impersonated owner.
- Members default to private capabilities and `publish = false`. Public publishing must be granted explicitly.
- Apply `lib/db/migrations/20260628_multi_user_workspace.sql` before inviting a second user. Follow `docs/MULTI_USER_WORKSPACE.md` and perform a real two-account isolation test.
