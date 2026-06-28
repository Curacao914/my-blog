# Codex Handoff: law-tech.dev Reconstruction

Last audited: 2026-06-26 Asia/Shanghai.

This handoff is for continuing `Curacao914/my-blog` on branch `codex/homepage-phase1` without relying on prior chat history. Treat current code, Git state, deployed HTTP checks, and fresh test output as authoritative.

## 1. Git State

- Repository: `https://github.com/Curacao914/my-blog.git`.
- Upstream: `https://github.com/tangly1024/NotionNext.git`.
- Branch at audit time: `codex/homepage-phase1`, tracking `origin/codex/homepage-phase1`.
- Handoff baseline for the notes/reading phase: `54b0e7a6 Refine desk today and reading layouts`.
- This phase modified workspace frontend files, the existing notes API, schedule parse/domain normalization for reading tags, the course TextPack v1 import flow, focused tests, and status docs.
- No Supabase table rewrite, Clerk middleware, WeChat/OpenClaw, cron/reminder, production, public blog routing, or `main` changes were made.

Recent relevant commits:

| Commit | Purpose |
| --- | --- |
| `39f8b0af` | Documented the handoff baseline for this frontend phase. |
| `54b0e7a6` | Refined desk Today and Reading layouts with collapsed history sections. |
| `188617ae` | Fixed Today single-focus title layout so Chinese titles no longer collapse into vertical characters. |
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
- Reading parse can now carry up to three optional topic tags into `ai_trace.tags`. Tags are cleaned before storage/display and empty placeholders such as `none`, `null`, and `undefined` are ignored.

### Notes / NoteDraft Chain

Current code path:

```text
/desk/inbox
→ components/NotesDesk.js
→ /api/notes
→ Supabase notes

/desk/reading
→ components/ReadingBox.js
→ POST /api/notes with scheduleItemId
→ verify schedule_items owner/source
→ find existing notes.metadata.sourceReadingId or legacy scheduleItemId
→ create NoteDraft only when missing
→ /desk/inbox?noteId=...
```

Notes:

- `pages/desk/inbox/index.js` no longer reuses `TodayBoard`; it renders a real notes draft list/editor.
- The existing `notes` table is used without a new migration. Minimum NoteDraft semantics are carried by `title`, `body_markdown`, `note_type`, `status`, and `metadata` keys such as `originType`, `sourceReadingId`, `sourceUrl`, `tags`, and `excerpt`.
- `/api/notes` now supports GET list/single, POST quick note, POST reading-to-draft, PATCH title/body/status/tags, and DELETE.
- Owner isolation is enforced by deriving the profile from `getScheduleOwnerUserId(req)` and filtering all note reads/writes by `owner_id`. Client-supplied owner values are ignored.
- Reading-to-draft is idempotent by `owner_id + metadata.sourceReadingId`, with legacy fallback to `metadata.scheduleItemId`. Existing drafts are returned without overwriting user-edited body content.
- Non-UUID/local-only reading items remain disabled in the Reading UI rather than pretending to create a persistent draft.

### Course TextPack Chain

Current code path:

```text
/desk/courses
→ components/CourseTextPackDesk.js
→ browser File API parses SRT locally
→ JSZip reads PPTX slide/notes XML locally
→ lib/course/textpack.js builds TextPack v1
→ POST /api/courses/textpack
→ server resolves current profile
→ lib/courseRepository.importCourseTextPack
→ Supabase course_jobs.preprocess_result.textPack + course_lessons rows
→ course_jobs.preprocess_result.workflow
→ /api/courses/jobs/:id/workflow
→ components/CourseTextPackDesk.js single-lesson workbench
```

Local worker fallback:

```text
npm run course:worker:build-pack -- --course-dir <local-course-dir> --output <textpack.json>
→ copy allowed files into /tmp/law-tech-course/<job-id>/raw
→ run haoke-notes deterministic scan/parse/extract/split scripts in temp dir
→ write pure TextPack JSON
→ remove temp dir on success
```

Notes:

- `docs/course-workflow-spec.md` records the full target architecture: TextPack, CourseSpec, outline approval, node queue, node writing/review, assembly, consistency checks, versioning, and resumability.
- Current implementation covers the single-lesson MVP path in code shape: preflight preferences, outline save/edit/approval, forced node planning, node draft/reviewer report save, node approval, final Markdown assembly, pause/resume/cancel, and error recording.
- Real model calls are executed by local worker path only when course AI env vars are configured. Worker offline is displayed as waiting; the UI does not claim work has run.
- Raw SRT/PPT/PPTX files are not uploaded by the new TextPack path. `pages/api/courses/assets.js` and old storage-backed course asset helpers still exist for the previous partial workflow; do not use them for the TextPack v1 path unless the product boundary is revisited.
- Owner is derived server-side from the current Clerk/local profile and stored in `preferences.web_adapter.ownerProfileId`; TextPack routes filter and delete against that value. A first-class `course_jobs.owner_id` column remains a future hardening step.
- `.ppt` is rejected with a save-as-PPTX warning. Low-text PPTX decks are marked `ocrRequired`; the UI/API do not invent slide text.
- Token-protected worker route: `/api/courses/jobs/:id/worker-step`, requiring `COURSE_WORKER_TOKEN`.
- Local worker commands: `npm run course:worker:build-pack` and `npm run course:worker:run-job`.

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

- `CRON_SECRET`: preferred Vercel Cron bearer secret; server-only and at least 16 random bytes.
- `RESEND_API_KEY`: Resend email API key.
- `REMINDER_FROM`: verified sender, for example `Law-Tech <reminders@law-tech.dev>`.
- `REMINDER_RUN_TOKEN`: optional manual/external scheduler token.
- `TASK_REMINDER_TOKEN`: legacy reminder token and fallback.
- `REMINDER_TO`: optional legacy recipient fallback; new user settings live in `reminder_preferences`.

The current reminder implementation uses `schedule_items`, `reminders`, `reminder_events`, and the new `reminder_preferences` table. `/desk/system` saves private settings and sends a test email. `/api/reminders/run` creates one owner-isolated digest containing daily work, pending next-24-hour reminders, reading, and optional Monday review. Vercel schedule is `0 1 * * *` UTC. Production Cron does not run on a Preview deployment; follow `docs/REMINDER_EMAIL_SETUP.md` for manual Preview verification.

Local environment presence remains unverified in this handoff. Do not infer delivery readiness from source code or `vercel.json` alone.

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
| Supabase persistence | Local integration verified for notes; schedule code exists | Fresh local API requests created, read, patched, and archived a real note. Schedule/read/reminder server code also uses Supabase REST. |
| Edit/complete/delete schedule items | Code exists | `TodayBoard` mutates local state and PUTs `/api/schedule/items`; delete uses `deletedIds`. Fresh UI test not run. |
| Content classification | Code exists | `contentType`, section, `sectionKey`, importance, urgency, and pinning normalize through parse/domain. |
| Workspace shell | Build verified + component covered | `DeskShell` keeps full left navigation on desktop, adds mobile folded nav, and uses a lighter page frame. |
| Focus area | Build verified + component covered | `TodayBoard` computes up to two active focus items; completed items are excluded from focus. |
| Today default layout | Build verified + component covered | Active main/flexible stacks are independent; completed/history items move to a collapsed cross-page section. |
| Four-quadrant view | Build verified + component covered | `TodayBoard` keeps `matrix` as an independent view with compact editable cards. |
| Reading box | Build verified + component/API covered | `ReadingBox` uses active reading list + detail, read items collapse into compact history, and Reading → NoteDraft returns a real inbox link after POST. |
| Clerk page permissions | Not proven strict | Anonymous Preview `/desk/today` returned 200. Current code checks cookies only when Clerk env exists. |
| API permissions for schedule/notes | Not proven strict | Anonymous Preview `/api/schedule/items` and `/api/notes` returned 200. |
| Capture API token permission | Code exists; route reachable | `/api/schedule/capture` checks bearer token for POST. Anonymous GET returns 405. |
| Reminder/Cron | Code prepared; live send unverified | Owner-isolated digest, private preferences, Resend test route and production Cron are implemented. Migration, secrets, verified sender, Preview manual run and eventual Production execution are still required. |
| NoteDraft | Local integration verified + unit/component tested | `/api/notes` supports quick notes and reading drafts. Fresh local API verification created/patched/archived a quick note and created/found an idempotent reading draft. |
| Publishing/content access system | Partial code/docs | Content snapshot docs and content pages exist; full DB-backed publish/access workflow unfinished. |
| Blog fusion | Partial | New public pages coexist with NotionNext routes. Full gradual Notion independence unfinished. |
| Course single-lesson MVP | Code exists + unit/API/component covered | Browser/local TextPack generation, preview, import API, workflow state machine, preferences, outline, node planning/draft/review/approval, final assembly, worker-step route, and worker runner exist. Full live Supabase/model/browser visual pass still needs fresh verification. |
| Course AI workflow | Partial / env-dependent | Role adapter and worker polling exist. Real outline/writer/reviewer/final review calls require `COURSE_AI_*` env and were not run here. |
| Full-course integration | Partial / unfinished | Knowledge graph, law tables, comparison tables, case bank, course Q&A, writing and publish handoff are documented only. |
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
- Local dev API checks used `ALLOW_LOCAL_DESK_FALLBACK=true` to exercise the existing owner fallback. This did not change code.
- Local browser responsive checks were blocked by the browser tool security policy for `localhost:3015`; do not claim fresh visual browser evidence from this run.
- The dev server printed Watchpack `EMFILE` watcher warnings, but production build passed.

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

- Course work is a workflow over local SRT/PPTX transformed into TextPack pure text, not a static page or a raw-file storage dump.
- Multiple SRT files may represent multiple classes and should run sequentially while preserving cross-lesson context.
- Multiple PPT/PPTX files may correspond to one or more SRT files. Mapping should be explicit or model-assisted, but not hidden from the user.
- The web version adapts the current `haoke-notes` strategy but must not mutate the original local skill source unless explicitly requested.
- The current MVP path is local deterministic preprocessing, TextPack import, preflight, CourseSpec confirmation, outline save/generation, user confirms outline, forced node planning, node writing/review, node approval, single-lesson assembly, final Markdown review/export.
- The later path extends this to full-course integration, writing, content library, and optional publish controls.

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
- Note draft action remains connected to `/api/notes` only for UUID-backed schedule records. Local-only items show a disabled "需要真实来源" action.
- Reading metadata display now filters placeholder values (`none`, `null`, `undefined`, empty strings) through `lib/domain/metadata.js`; the Reading page no longer repeats the generic `阅读` content-type tag.
- Today cards also clean display metadata before rendering, so `"none"` time/place values do not become pills or fixed-time layout signals.
- Today single-card vertical-title regression is fixed at the outer card-grid branch in `components/TodayBoard.js`. The prior structure put title/meta content and optional actions in the same flexible head, while focus-specific CSS also overrode the head layout. That allowed the title/meta column to collapse toward min-content while the card shell stayed wide. The card now renders a stable `today-card-layout` with `minmax(0, 1fr) auto`, a dedicated `today-card-content`, and an optional actions column that is not rendered when empty.
- Today layout invariants are covered by component and CSS-contract tests: focus and standard cards expose stable test ids, the content column must exist, focus head is no longer overridden into a shrinking grid, and empty actions do not reserve a column.
- `随手记` is now a real NoteDraft workspace with list/editor, optional title, Markdown/plain text body, save status, archive, delete, and `/desk/inbox?noteId=...` selection.
- Reading parse can now request up to three optional content-derived topic tags in the existing AI parse response; these are stored in `ai_trace.tags` and reused by Reading/Today display when present.
- Visual direction remains warm white / pale blue-green / deep ink green / serif / large-radius / soft-shadow, with restrained static glass.
- Course workspace now has browser-local parsers for SRT, PPTX, DOCX, TXT, and Markdown. Legacy `.ppt` and `.doc` are rejected with conversion guidance. Raw files stay local; only normalized text/material metadata are submitted for import.
- Course import UI now uses user-facing language such as "课程资料", "在线文字识别", and "课程写作服务"; ordinary workspace pages are guarded by a product-copy test against rough implementation wording.
- Course capability API exists at `/api/courses/capabilities` and returns only non-sensitive configuration state/model names for course writing and local processing.
- Focused component/API coverage exists in `__tests__/components/DeskWorkspace.test.js`, `__tests__/api/notes.test.js`, and the course tests listed in `docs/course-workflow-e2e-report.md`.

Fresh checks from this phase:

- `npm test -- __tests__/components/DeskWorkspace.test.js __tests__/api/notes.test.js --runInBand`: passed 9/9.
- `npm test -- __tests__/components/DeskWorkspace.test.js __tests__/components/TodayCardCss.test.js __tests__/components/ProductCopy.test.js __tests__/components/CourseTextPackDesk.test.js __tests__/lib/courseMaterialParsers.test.js __tests__/lib/courseTextpack.test.js __tests__/lib/courseWorkerTemp.test.js __tests__/lib/courseWorkflowState.test.js __tests__/lib/courseAiAdapter.test.js __tests__/api/courseCapabilities.test.js __tests__/api/courseTextpack.test.js __tests__/api/courseWorkflow.test.js --runInBand`: passed 32/32.
- Local API verification against `http://localhost:3014` with `ALLOW_LOCAL_DESK_FALLBACK=true`: quick note create/list/patch/get/archive passed; quick note did not appear in schedule items; Reading → NoteDraft created one real draft and a second POST returned the same note ID with `existing: true`.
- `npm run build`: passed with existing large page-data warnings.
- Browser computed-style measurement for the Today card was attempted locally, but the sandbox terminated Chrome before measurements could be collected. Rely on the DOM/CSS audit and component/CSS invariant tests until a manual Preview inspector check is done.

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

## 2026-06-26 手工接管修订

- Today Focus 卡片竖排的真实根因是外层 `.today-card` 始终保留 28px checkbox 列，而 Focus 卡片没有渲染 checkbox。现已通过 `has-check/no-check` class 在无 checkbox 时改为单列布局。
- 课程前端已改为按当前阶段展示，不再同时铺开偏好、大纲、节点和最终笔记。
- 大纲已改为结构化编辑器；浏览器硬编码 Reviewer 90 分的旁路已删除。
- Worker 已拆分 Writer、Reviewer、Revision、Final Review 任务，带任务租约、幂等键、暂停恢复和多课次推进。
- Final Review 的 `revise` 与 `human_review` 均为正常质量状态，不再变成技术失败。
- 16 个相关测试套件、44 个测试通过；真实模型和 Vercel Preview 仍需在有环境变量的部署环境验收。


## 9. Online Course/OCR Update (2026-06-26)

- The normal course path has no local daemon requirement. `OCR_SERVICE_URL` points to `https://curacao914-law-ocr.hf.space`; `LAW_TECH_OCR_SIGNING_SECRET` is shared server-side only.
- Browser-local parsers handle SRT, text PPTX, DOCX, TXT, and Markdown. PDF/images/low-density PPTX use the signed OCR Space API; raw binaries never enter Supabase.
- File selection is additive and deduplicated. The import wizard is Select materials -> Confirm lessons -> Confirm import. Grouping suggestions use dates, ordinals, internal titles/text, and similarity, but remain manually editable.
- Course UI is compact: course library, import wizard, then a per-course workbench with lesson rail, progress stepper, one current stage, collapsible service state, and expandable diagnostics/source material.
- Online processing uses `POST /api/courses/jobs/:id/run-next`, one model step per request. It reuses repository leases, idempotency, owner checks, structured output validation, Writer/Reviewer separation, revision limits, and final-review routing.
- Today excludes reading records in every schedule view. Focus cards include completion and edit controls. Reading Box owns reading materials and can explicitly create a linked schedule action via “安排阅读”.
- Relevant tests include OCR session signing, online-runner ownership/one-step execution, repeated file selection/drop, multi-lesson grouping, Today/Reading separation, and deterministic course workflow gates.


## 2026-06-28 Workbench Identity and Reminder Update

- The sidebar header uses `/curacao-avatar.png`, browser-local date/time, `看到我记得喝口水`, and authenticated status chips. Weather is intentionally absent.
- Apply `lib/db/migrations/20260628_reminder_preferences.sql` before opening reminder settings against a live database.
- New APIs: `/api/desk/status`, `/api/reminders/preferences`, `/api/reminders/test`; `/api/reminders/run` is now the owner-isolated digest runner.
- Required live checks are documented in `docs/REMINDER_EMAIL_SETUP.md`.
- After reminder verification, the next large phase is Writing Studio; secure sharing and deeper settings follow.
