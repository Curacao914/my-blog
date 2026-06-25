# law-tech → my-blog Migration Matrix

Last audited: 2026-06-26 Asia/Shanghai.

This matrix records implementation and verification status only. Do not treat "file migrated", "local API test", "build passed", and "real public end-to-end verified" as the same thing.

Status labels:

- `E2E public verified`: verified through the real public path, not localhost.
- `Public HTTP verified`: deployed public route returned the expected HTTP behavior.
- `Local integration verified`: verified locally or via direct API/tool call, not the full public user path.
- `Unit tested`: covered by an automated unit test.
- `Build verified`: `npm run build` or equivalent passed after the code existed.
- `Code exists, not verified`: implementation exists but current behavior has not been proven.
- `Partial / unfinished`: code or docs exist, but expected product behavior is incomplete.
- `Deferred / replaced`: intentionally not migrated because a current replacement exists.

## Public Layer

| Scope | Source / Intent | Current my-blog target | Status | Evidence / caveat |
| --- | --- | --- | --- | --- |
| New public home | Independent law-tech home | `pages/index.js`, `components/law-tech/PublicHeader.js` | Public HTTP verified | `https://preview.law-tech.dev/` returned 200 and Curacao/law-tech markers. |
| Production blog | Existing NotionNext site | `law-tech.dev` production | Public HTTP verified | `https://law-tech.dev/` returned 200 with NotionNext-style blog title markers. |
| About page | law-tech public page | `pages/about/index.js` | Build verified | Route exists; no fresh visual/browser audit in this handoff. |
| Content entry | Content snapshots / public content | `pages/content/index.js`, `pages/content/[...slug].js` | Public HTTP verified | `https://preview.law-tech.dev/content` returned 200. Full content UX unfinished. |
| Tools page | OCR/citation/public tools | `pages/tools/index.js` | Build verified | Code exists; no fresh public browser audit in this handoff. |
| Project page | Old law-tech concept | No standalone first-level route | Deferred / replaced | Product decision: projects fold into content/tools/workspace instead of a top nav item. |
| Existing article route | NotionNext compatibility | `pages/[prefix]/[slug]/index.js` | Public HTTP verified | `https://preview.law-tech.dev/article/criminal-procedure-law` returned 200. |
| Archive/category/tag/search | NotionNext compatibility | `pages/archive`, `pages/category`, `pages/tag`, `pages/search` | Build verified | `npm run build` previously generated these routes; not freshly browsed in this handoff. |

## Workspace Pages

| Scope | Current target | Status | Evidence / caveat |
| --- | --- | --- | --- |
| Workspace shell | `components/DeskShell.js`, `lib/domain/navigation.js` | Code exists, frontend refinement pending | Current shell is structurally thin; next phase must refine layout and navigation without backend changes. |
| Today page | `pages/desk/today/index.js`, `components/TodayBoard.js` | Code exists, frontend refinement pending | Uses schedule APIs and no longer writes frontend sample fallback. Visual/product layout still pending. |
| Reading page | `pages/desk/reading/index.js`, `components/ReadingBox.js` | Code exists, frontend refinement pending | Reading list/detail/note actions exist. Fresh note write not verified in this handoff. |
| Inbox page | `pages/desk/inbox/index.js` | Code exists, not verified | Route exists; not part of next frontend-only task. |
| Tasks page | `pages/desk/tasks/index.js` | Code exists, not verified | Route exists; behavior not audited here. |
| Courses page | `pages/desk/courses/index.js` | Partial / unfinished | Page and course APIs exist, but full upload-to-notes workflow is not proven. |
| Materials page | `pages/desk/materials/index.js` | Code exists, not verified | Route exists; behavior not audited here. |
| Writing page | `pages/desk/writing/index.js` | Code exists, not verified | Route exists; behavior not audited here. |
| Publish page | `pages/desk/publish/index.js` | Partial / unfinished | Content access/publish UI is not complete. |
| System page | `pages/desk/system/index.js` | Code exists, not verified | Route exists; settings behavior not audited here. |
| `desk/active` / `desk/library` | Redirect or compatibility routes | Code exists, not verified | Routes exist; meaning should be audited before removal or renaming. |

## Schedule, Reading, and WeChat

| Scope | Current target | Status | Evidence / caveat |
| --- | --- | --- | --- |
| Web natural language parse | `pages/api/schedule/parse.js` | Code exists, previously locally exercised | Uses AI model env and normalization. No fresh model call in this handoff. |
| Web schedule persistence | `pages/api/schedule/items.js`, `lib/server/supabase.js` | Code exists, not strictly auth-verified | Anonymous Preview GET returned 200; auth behavior needs audit. |
| Frontend fallback cleanup | `components/TodayBoard.js` | Build verified | `52ed7d47` removed sample input and client split fallback writes. |
| Ignored/not_actionable | `pages/api/schedule/parse.js`, `pages/api/schedule/capture.js` | Code exists, not freshly tested | Code returns ignored for no actionable content. |
| Duplicate messageId idempotency | `pages/api/schedule/capture.js` | Code exists, previously locally tested | `captureKeyFor`/`findExistingCapture` implement duplicate handling. Fresh public test not run here. |
| Reading classification | `components/ReadingBox.js`, `lib/domain/schedule.js` | Code exists | Current code uses `contentType` and reading markers, not `links.length` alone. |
| Note draft API | `pages/api/notes/index.js` | Code exists, not verified | Anonymous Preview GET returned 200. POST/write behavior not freshly tested. |
| OpenClaw relay plugin | `integrations/openclaw/law-tech-wechat-relay` | Unit tested | `node --test integrations/openclaw/law-tech-wechat-relay/tests/normalize-message.test.js` previously passed 6/6. |
| Current OpenClaw target | Local OpenClaw config | Public route configured | Audit found `captureUrl` set to `https://preview.law-tech.dev/api/schedule/capture`; token redacted. |
| WeChat public end-to-end | WeChat → OpenClaw → Preview → Supabase → page | Prior reported evidence only | User previously reported successful bot reply. This handoff did not re-run real WeChat or verify page visibility. |
| Legacy inbox bridge | `pages/api/tasks/inbox/[channel].js` | Code exists | WeChat-like channels forward to `/api/schedule/capture`; fresh POST not run here. |

## Auth, Middleware, and Security

| Scope | Current target | Status | Evidence / caveat |
| --- | --- | --- | --- |
| Middleware | `middleware.ts` | Public route compatible | Clerk is not in Edge middleware; middleware handles NotionNext UUID redirects. |
| Clerk sign-in/up pages | `pages/sign-in/[[...index]].js`, `pages/sign-up/[[...index]].js` | Public HTTP verified for sign-in | `/sign-in` returned 200 on Preview. Full login flow not tested here. |
| Desk page protection | `lib/auth/deskPage.js` | Not proven strict | Anonymous Preview `/desk/today` returned 200. Current helper checks cookie presence only when Clerk env exists. |
| Schedule owner/API protection | `lib/auth/scheduleOwner.js` | Not proven strict | Anonymous Preview `/api/schedule/items` returned 200. Needs real Clerk session audit. |
| Admin/capture token helper | `lib/auth/serverAdmin.js` | Code exists | Token and Clerk helpers exist. Fresh protected POST tests not run here. |

## Data, Course, Reminder, and Publishing

| Scope | Current target | Status | Evidence / caveat |
| --- | --- | --- | --- |
| Supabase schema | `lib/db/schema.sql`, `lib/db/migrations/*.sql` | Code exists, deployment state uncertain | SQL files exist. Whether all migrations are applied in Supabase was not checked here. |
| Reminder runner | `pages/api/reminders/run.js`, `vercel.json` | Public unauthorized verified | Anonymous Preview request returned 401. Email send not tested. |
| Resend email reminders | `pages/api/reminders/run.js` | Code exists, not verified | Requires `RESEND_API_KEY` and `REMINDER_TO`; not present in local `.env.local` audit. |
| Course job APIs | `pages/api/courses/**`, `scripts/course-worker/**` | Partial / unfinished | APIs and scripts exist. Full web workflow not end-to-end verified. |
| Content snapshot layer | `docs/content-snapshot-layer.md`, `lib/contentSnapshots.js`, scripts | Partial / unfinished | Snapshot validation/promote exists. Full DB-backed publishing remains unfinished. |
| Password/share route | `pages/s/[token]/index.js` | Code exists, not verified | Route exists. Access/security behavior not audited here. |
| Dify chat | `pages/api/dify-chat.js` | Code exists, not part of current path | Not verified. |

## Deferred or Replaced Items

| Scope | Status | Reason |
| --- | --- | --- |
| Standalone `law-tech` production replacement | Deferred / unsafe | Directly replacing production with independent repo broke NotionNext routes previously. |
| App Router migration | Deferred | Current project uses Next.js Pages Router and NotionNext compatibility. |
| Large UI library introduction | Deferred | Current frontend refinement should use existing components/styles and variants. |
| Complex animated liquid glass | Deferred | Confirmed direction is restrained static light glass. |
| Image/multimodal input in current frontend pass | Deferred | Explicitly out of scope for the next frontend-only phase. |

## Next Matrix Update Rules

- Move an item to `E2E public verified` only after testing the actual public user path.
- Move an item to `Local integration verified` only with a recorded command or local browser/API result.
- Move an item to `Build verified` only after a fresh successful build in the relevant change set.
- Keep `Code exists, not verified` when a route/component/API exists but behavior has not been checked.
- Record auth results separately from route availability.
