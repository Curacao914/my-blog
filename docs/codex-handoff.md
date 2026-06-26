# Codex Handoff: law-tech.dev Reconstruction

Last audited: 2026-06-26 Asia/Shanghai.

This handoff is for continuing `Curacao914/my-blog` on branch `codex/homepage-phase1` without relying on prior chat history. Treat current code, Git state, deployed HTTP checks, and fresh test output as authoritative.

## 1. Git State

- Repository: `https://github.com/Curacao914/my-blog.git`.
- Upstream: `https://github.com/tangly1024/NotionNext.git`.
- Branch at audit time: `codex/homepage-phase1`, tracking `origin/codex/homepage-phase1`.
- Handoff baseline for this frontend phase: `39f8b0af0006ea77f9242bb34a881047ebd72a92`.
- This phase modified only frontend workspace files, a focused component test, and status docs.
- No backend, API, Supabase schema, Clerk, middleware, WeChat/OpenClaw, cron/reminder, production, or `main` changes were made.

Recent relevant commits:

| Commit | Purpose |
| --- | --- |
| `39f8b0af` | Documented the handoff baseline for this frontend phase. |
| `52ed7d47` | Removed Today frontend sample/fallback writes and added a small status notice. |
| `869d6411` | Broadened OpenClaw/WeChat relay channel matching. |
| `b74fb720` | Removed Clerk from Edge middleware after Vercel middleware failures. |
| `615ae47c` | Earlier attempt to limit Clerk middleware to private routes. Superseded by removing Clerk from middleware. |
| `7e46d243` | Stabilized schedule capture, including authorization, parsing, idempotency, and Supabase write path. |
| `6ad1ade2` | Added migration audit material for law-tech workspace migration. |
| `87d396a2` | Migrated the law-tech desk/today workspace into my-blog. |
| `fdf21aa3` | Migrated law-tech homepage into my-blog while preserving NotionNext routes. |
| `8cf20d43` | Made Clerk sign-in/sign-up pages safer for Preview builds. |
| `f3894a3b` | Added law-tech workspace modules. |

## 2. Deployment State

- Current Vercel project cannot be verified with local Vercel CLI in this workspace because `vercel` is not installed. The known Preview deployment host indicates project name `curacao-top` under `curacaos-projects`, but this is inferred from the deployment URL rather than CLI output.
- Known branch Preview URL: `https://curacao-top-git-codex-homepage-phase1-curacaos-projects.vercel.app/`.
- Custom Preview/test domain: `https://preview.law-tech.dev/`.
- Production domain: `https://law-tech.dev/`.
- `preview.law-tech.dev` currently returns HTTP 200 for `/`, `/desk/today`, `/content`, and `/article/criminal-procedure-law`.
- `preview.law-tech.dev/api/schedule/capture` returns HTTP 405 to GET with `Allow: POST`, so the route is publicly reachable.
- `preview.law-tech.dev/api/reminders/run` returns 401 without token, as expected.
- Anonymous `curl` to `preview.law-tech.dev/api/schedule/items` and `/api/notes` returned 200 during this audit. Therefore strict Clerk session enforcement for these APIs is not proven and must not be claimed.
- Anonymous `curl` to `preview.law-tech.dev/desk/today` returned 200 during this audit. Therefore page-level strict Clerk session enforcement is not proven and must not be claimed.
- `preview.law-tech.dev` currently serves the reconstructed Curacao/law-tech public home by HTML markers.
- `law-tech.dev` currently serves the production NotionNext-style blog by HTML markers, including title `Curacao·Blog | 一起扒掉法人秋裤！`.
- Deployment Protection appears disabled or bypassed for `preview.law-tech.dev` based on anonymous HTTP 200/405 responses. The Vercel dashboard was not checked in this audit.
- Tests run before a deployment finished must not be used as evidence for the final deployed state. Only the HTTP checks above are current deployment evidence in this handoff.

## 3. Current Real Chains

### Web Input Chain

Current code path:

```text
/desk/today
→ components/TodayBoard.js
→ POST /api/schedule/parse
→ AI chat-completions compatible endpoint
→ normalizeItems / domain fields
→ PUT /api/schedule/items
→ lib/server/supabase.js
→ Supabase schedule_items
→ GET /api/schedule/items
→ Today/Reading pages
```

Notes:

- `TodayBoard` no longer seeds the input with sample text and no longer writes client-side split fallback items on AI/API failure.
- `/api/schedule/parse` still has a server fallback `fallbackItemsFromCommand` for some recognized action/reading inputs if the model returns no items. This is not the removed frontend demo fallback.
- The parse prompt asks for `contentType`, `importance`, `urgency`, `isPinned`, source fields, status, links, children, summary, note, and optional reminder.
- `toDbScheduleItem` stores newer semantic fields in `ai_trace` and reads physical columns when available, allowing partial migration compatibility.

### WeChat Chain

Current code path:

```text
WeChat
→ OpenClaw ClawBot
→ law-tech-wechat-relay plugin
→ LAW_TECH_CAPTURE_URL or live plugin config captureUrl
→ POST /api/schedule/capture
→ AI parse via /api/schedule/parse
→ Supabase schedule_items
→ /desk/today or /desk/reading reads same schedule_items source
→ plugin replaces bot reply with API replyText
```

Current OpenClaw local config audit:

- `/Users/curacao/.openclaw/openclaw.json` exists.
- `law-tech-wechat-relay` config currently has `captureUrl: https://preview.law-tech.dev/api/schedule/capture`.
- Token exists in OpenClaw config but is intentionally not recorded here.

Evidence classes:

- Code-level relay exists in `integrations/openclaw/law-tech-wechat-relay`.
- Unit test exists for normalization and relay handling.
- Preview capture API is publicly reachable.
- Prior chat reported a real WeChat test response for `明天上午10点检查微信入口 test-0625-2`, but this handoff did not re-run WeChat from the phone. Treat it as prior reported evidence, not a fresh test.
- Do not confuse "OpenClaw directly calls Preview API" with "the resulting record is visible in the page after a fresh browser read". Both must be checked for a fresh end-to-end claim.

## 4. Environment Variables

Only variable names and purposes are listed here. Never document values.

Clerk:

- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`: enables Clerk UI/client integration.
- `CLERK_SECRET_KEY`: enables server-side Clerk calls where used.
- `CLERK_ADMIN_EMAILS`: admin allowlist by email.
- `CLERK_ADMIN_USER_IDS`: admin/owner user id allowlist and fallback owner source.
- `NEXT_PUBLIC_CLERK_SIGN_IN_URL`, `NEXT_PUBLIC_CLERK_SIGN_UP_URL`, `NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL`, `NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL`: Clerk route behavior.

Supabase/database:

- `SUPABASE_URL`: Supabase project URL.
- `SUPABASE_SERVICE_ROLE_KEY` or `SUPABASE_SECRET_KEY`: server-side Supabase REST key.
- `DATABASE_URL`: direct Postgres URL for scripts that use it.
- `SUPABASE_STORAGE_BUCKET`: storage bucket for course/material uploads.

Schedule AI:

- `SCHEDULE_AI_API_KEY`: schedule parser model key.
- `SCHEDULE_AI_BASE_URL`: OpenAI-compatible base URL.
- `SCHEDULE_AI_MODEL`: schedule parser model name.
- Fallback names in code: `AI_API_KEY`, `OPENAI_API_KEY`, `AI_BASE_URL`, `AI_MODEL`.

WeChat/OpenClaw:

- `WECHAT_CAPTURE_TOKEN`: bearer token for WeChat/OpenClaw capture.
- `WECHAT_OWNER_USER_ID`: schedule owner for WeChat captures.
- `WECHAT_ALLOWED_SENDER_ID`: optional sender allowlist.
- `LAW_TECH_CAPTURE_URL`: OpenClaw relay capture endpoint when not provided by live plugin config.
- `TASK_CAPTURE_TOKEN`: legacy/general external capture token and fallback.

Reminder/Resend/Cron:

- `REMINDER_RUN_TOKEN`: token for `/api/reminders/run`.
- `TASK_REMINDER_TOKEN`: legacy reminder token and fallback.
- `CRON_SECRET`: accepted by reminder runner.
- `RESEND_API_KEY`: Resend email API key.
- `REMINDER_FROM`: reminder email sender.
- `REMINDER_TO`: reminder email recipient.

Local audit of `.env.local` found these configured locally: Supabase, database URL, Clerk keys and redirects, task/wechat tokens, WeChat owner, and schedule AI variables. `RESEND_*`, `REMINDER_*`, and `CRON_SECRET` were not present in the local `.env.local` audit output. Vercel Preview env configuration was not inspected via Vercel dashboard or CLI in this handoff.

## 5. Capability Status

| Capability | Status | Evidence / caveat |
| --- | --- | --- |
| Public reconstructed home on Preview | Public HTTP verified | `preview.law-tech.dev/` returned 200 and HTML markers for Curacao/law-tech. |
| Production NotionNext blog | Public HTTP verified | `law-tech.dev/` returned 200 and NotionNext-style blog title markers. |
| Existing NotionNext article route on Preview | Public HTTP verified | `/article/criminal-procedure-law` returned 200. |
| Web natural language input | Code exists; earlier build passed | `TodayBoard` calls parse/items APIs; no fresh browser submission in this audit. |
| AI parsing | Code exists; previously exercised | `/api/schedule/parse` uses schedule model env and normalization. No fresh model call in this handoff. |
| Ignored/not_actionable | Code exists | `/api/schedule/parse` and capture return ignored for no actionable items. Fresh test not run here. |
| Duplicate messageId idempotency | Code exists; previously tested | `captureKeyFor` and `findExistingCapture` implement duplicate handling. Fresh test not run here. |
| Supabase persistence | Code exists; previously tested | Schedule/read/note/reminder server code uses Supabase REST. Fresh DB write not run here. |
| Edit/complete/delete schedule items | Code exists | `TodayBoard` mutates local state and PUTs `/api/schedule/items`; delete uses `deletedIds`. Fresh UI test not run. |
| Content classification | Code exists | `contentType`, section, `sectionKey`, importance, urgency, and pinning normalize through parse/domain. |
| Workspace shell | Build verified + component covered | `DeskShell` keeps full left navigation on desktop, adds mobile folded nav, and uses a lighter page frame. |
| Focus area | Build verified + component covered | `TodayBoard` computes up to two active focus items; completed items are excluded from focus. |
| Today default layout | Build verified + component covered | Active main/flexible stacks are independent; completed/history items move to a collapsed cross-page section. |
| Four-quadrant view | Build verified + component covered | `TodayBoard` keeps `matrix` as an independent view with compact editable cards. |
| Reading box | Build verified + component covered | `ReadingBox` now uses active reading list + detail, with read items in a collapsed compact history section. Fresh note write not run. |
| Clerk page permissions | Not proven strict | Anonymous Preview `/desk/today` returned 200. Current code checks cookies only when Clerk env exists. |
| API permissions for schedule/notes | Not proven strict | Anonymous Preview `/api/schedule/items` and `/api/notes` returned 200. |
| Capture API token permission | Code exists; route reachable | `/api/schedule/capture` checks bearer token for POST. Anonymous GET returns 405. |
| Reminder/Cron | Route exists; unauthorized verified | `/api/reminders/run` returned 401 without token. No email send test run here. |
| NoteDraft | Code exists; not freshly verified | `/api/notes` and `ReadingBox.saveNote` exist. No fresh POST test. |
| Publishing/content access system | Partial code/docs | Content snapshot docs and content pages exist; full DB-backed publish/access workflow unfinished. |
| Blog fusion | Partial | New public pages coexist with NotionNext routes. Full gradual Notion independence unfinished. |
| Course workflow | Code and docs exist; not complete | Course job APIs and worker scripts exist. Full upload-to-final-note browser workflow not freshly verified. |
| WeChat input | Code exists; prior real test reported | OpenClaw currently points to Preview; this handoff did not re-run a real WeChat message. |

## 6. Known Incidents and Lessons

- Replacing the production Vercel project with the independent `law-tech` repository caused old NotionNext routes/blog access to disappear. Do not repeat this without a migration and rollback plan.
- Clerk in Edge middleware caused `MIDDLEWARE_INVOCATION_FAILED` on Vercel.
- Clerk was later removed from Edge middleware. Current `middleware.ts` only handles NotionNext compatibility redirects.
- The current desk/page auth helpers must be audited before claiming real security. `requireDeskPage` and `getScheduleOwnerUserId` currently check for Clerk-related cookies and configured owner fallback, not a fully verified Clerk session.
- Frontend sample content and client split fallback previously created fake-looking schedule data. `52ed7d47` removed the Today frontend sample/fallback write behavior.
- Older reading logic used link presence to classify reading. Current `ReadingBox` and domain logic use `contentType`, reading section/date markers, and `aiTrace`; verify code before making claims.
- Localhost, Preview, production, and real WeChat tests must be reported separately.
- Do not infer that a feature never existed because the current HEAD lacks it. Check Git history, old branches, and the independent `law-tech` repo when relevant.
- Local dev browser checks in this phase needed temporary local Clerk env clearing to avoid the existing desk redirect; this did not change code. The dev server also printed Watchpack `EMFILE` watcher warnings, but production build passed.

## 7. Current Product Plan

Overall plan:

- Preserve NotionNext compatibility while moving the public home and private workflows into independent pages.
- Keep content editing sources flexible: Notion, Markdown, manual editor, and course worker outputs.
- Use a stable content middle layer so failed Notion/Markdown sync never overwrites the last good public snapshot.
- Treat schedule, reading, course, notes, materials, and publishing as connected data/workflow surfaces, not isolated pages.
- Avoid "temporary now, fix later" product shortcuts that leave permanent rough edges.

Schedule/reading plan:

- Today is the daily command center. It should show today, overdue carry-over, near-future items, and high-priority focus without becoming an all-module dashboard.
- Natural language input should call the AI parser and write structured JSON fields, then persist to Supabase.
- Important, urgent, pinned, and user-overridden fields must remain distinct.
- Four-quadrant is an independent view, not the default layout.
- Reading is a reading list plus detail/editing surface. It should support visible links, longer summaries, excerpts/thoughts, and note draft export.
- WeChat/OpenClaw and web input must converge on the same `schedule_items` data source.

Course plan:

- Course work is a workflow over uploaded SRT/PPT/PPTX/materials, not a static page.
- Multiple SRT files may represent multiple classes and should run sequentially while preserving cross-lesson context.
- Multiple PPT/PPTX files may correspond to one or more SRT files. Mapping should be explicit or model-assisted, but not hidden from the user.
- The web version may adapt the current `haoke-notes` strategy, but should not mutate the original local skill source unless explicitly requested.
- The desired path is upload/collect materials, preprocess, confirm preferences, generate outline, user confirms outline, generate node notes, verify, save to library/content, optionally publish.

Content/publishing plan:

- Content permissions are per item, not separated by public/private sections.
- Support category, tags, access mode, password, expiry, indexing/RSS/sitemap flags, course metadata, and folder paths.
- "秘密花园" is a content category, not an access-control state.
- Private content must not enter public live snapshots, RSS, sitemap, or public search.

Design principles:

- No rough placeholder copy on user-facing pages.
- No visible implementation explanations, architecture lectures, or AI-ish filler in the frontend.
- No fallback or sample data that pretends success.
- Prefer one module completed properly over many half-built surfaces.
- Maintain a calm, personal, restrained visual system: warm white, pale blue-green, deep ink green, serif type, large radius, soft shadows.
- Current frontend target is restrained static light glass, not complex animated liquid glass.

## 8. Current Frontend Status

This frontend-only phase has implemented the confirmed Shell, Today, and Reading direction:

- `DeskShell` preserves every existing desk navigation route and makes the desktop sidebar stable while the main content scrolls.
- Mobile desk navigation is a folded top section; no route entries were removed.
- Today input is visually smaller and no longer uses example placeholder text.
- Today focus is capped at two active items, using existing pin/importance/urgency/time logic.
- Today default view uses independent main/flexible stacks only when that structure is useful. It no longer forces completed/history content into a heavy right column.
- Completed schedule items are in a keyboard-operable collapsed history section with `aria-expanded`; expanded content uses compact cards and can restore items.
- Four-quadrant remains an independent view and uses compact editable cards.
- Reading uses active reading list plus detail panel; read items are in a collapsed compact `已读` history section with restore action.
- Note draft action remains connected to `/api/notes` only for UUID-backed schedule records. Local-only items show a disabled "草稿后续接入" action.
- Visual direction remains warm white / pale blue-green / deep ink green / serif / large-radius / soft-shadow, with restrained static glass.
- Focused component coverage was added in `__tests__/components/DeskWorkspace.test.js`.

Fresh checks from this phase:

- `git diff --check`: passed.
- `npm test -- __tests__/components/DeskWorkspace.test.js --runInBand`: passed 4/4.
- `npm run build`: passed.
- Full `npm test -- --runInBand`: failed in pre-existing unrelated suites (`validation`, `LazyImage` theme alias, OpenClaw relay test environment response). The new workspace test passed.

## 9. Next Window Notes

If continuing after this phase, read first:

- `AGENTS.md`
- `docs/codex-handoff.md`
- `docs/law-tech-migration-matrix.md`
- `components/DeskShell.js`
- `components/TodayBoard.js`
- `components/ReadingBox.js`
- `components/LawTechDeskStyles.js`
- `lib/domain/navigation.js`
- `pages/desk/today/index.js`
- `pages/desk/reading/index.js`
- `docs/product-constraints.md`

Suggested first checks:

- `git status --short --branch`
- Check the latest Preview deployment before claiming public behavior.
- If doing auth/security work, audit Clerk page/API session verification separately; this frontend phase did not change it.
