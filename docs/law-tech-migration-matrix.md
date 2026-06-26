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
| Workspace shell | `components/DeskShell.js`, `lib/domain/navigation.js` | Build verified + component covered | Desktop sidebar remains stable with all existing entries preserved; mobile uses folded navigation. No route behavior changed. |
| Today page | `pages/desk/today/index.js`, `components/TodayBoard.js` | Build verified + component/CSS covered | Focus capped at two active items; card content now uses an explicit content column plus optional actions column, fixing the single-focus vertical Chinese title regression; default view uses independent main/flexible stacks; completed items collapse into compact history. |
| Reading page | `pages/desk/reading/index.js`, `components/ReadingBox.js` | Local integration verified + component covered | Active reading list/detail implemented; read items collapse into compact history with restore action; metadata placeholders are filtered; Reading → NoteDraft POST creates or returns a real draft locally. Not publicly verified. |
| Inbox page | `pages/desk/inbox/index.js`, `components/NotesDesk.js` | Local integration verified + component covered | No longer reuses Today. Supports real notes list/editor, optional title, Markdown body, save, archive, delete, and direct `?noteId=` selection through `/api/notes`. Not publicly verified. |
| Tasks page | `pages/desk/tasks/index.js` | Code exists, not verified | Route exists; behavior not audited here. |
| Courses page | `pages/desk/courses/index.js`, `components/CourseTextPackDesk.js` | Unit tested + component/API covered | Browser-local SRT/PPTX/DOCX/TXT/Markdown parsing, productized import UI, course overview, workflow detail, structured preferences, outline editor, node workbench, source inspector, pause/resume, capability display, and final Markdown surface exist. Full live Supabase/browser visual pass still needs fresh verification. |
| Materials page | `pages/desk/materials/index.js` | Code exists, not verified | Route exists; behavior not audited here. |
| Writing page | `pages/desk/writing/index.js` | Code exists, not verified | Route exists; behavior not audited here. |
| Publish page | `pages/desk/publish/index.js` | Partial / unfinished | Content access/publish UI is not complete. |
| System page | `pages/desk/system/index.js` | Code exists, not verified | Route exists; settings behavior not audited here. |
| `desk/active` / `desk/library` | Redirect or compatibility routes | Code exists, not verified | Routes exist; meaning should be audited before removal or renaming. |

## Schedule, Reading, and WeChat

| Scope | Current target | Status | Evidence / caveat |
| --- | --- | --- | --- |
| Web natural language parse | `pages/api/schedule/parse.js` | Code exists, previously locally exercised | Uses AI model env and normalization; parse contract now allows up to three optional reading topic tags stored via `ai_trace.tags`. No fresh model call in this handoff. |
| Web schedule persistence | `pages/api/schedule/items.js`, `lib/server/supabase.js` | Code exists, not strictly auth-verified | Anonymous Preview GET returned 200; auth behavior needs audit. |
| Frontend fallback cleanup | `components/TodayBoard.js` | Build verified | `52ed7d47` removed sample input and client split fallback writes. |
| Ignored/not_actionable | `pages/api/schedule/parse.js`, `pages/api/schedule/capture.js` | Code exists, not freshly tested | Code returns ignored for no actionable content. |
| Duplicate messageId idempotency | `pages/api/schedule/capture.js` | Code exists, previously locally tested | `captureKeyFor`/`findExistingCapture` implement duplicate handling. Fresh public test not run here. |
| Reading classification | `components/ReadingBox.js`, `lib/domain/schedule.js`, `lib/domain/metadata.js` | Build verified + component covered | Current code uses `contentType` and reading markers, not `links.length` alone; active/read presentation is status-driven; `none/null/undefined` are filtered from displayed metadata/tags. |
| Note draft API | `pages/api/notes/index.js`, `lib/server/supabase.js` | Local integration verified + unit tested | GET/POST/PATCH/DELETE implemented for current owner. Local API verification created/patched/archived a quick note and created/found an idempotent reading draft. Anonymous Preview GET previously returned 200, so strict public auth remains unproven. |
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
| Notes data model | `notes` table, `metadata` JSON | Local integration verified | Existing `notes` table is reused. NoteDraft semantics are carried by `title`, `body_markdown`, `note_type`, `status`, and metadata keys (`originType`, `sourceReadingId`, `sourceUrl`, `tags`, `excerpt`). No new migration was added. |
| Reminder runner | `pages/api/reminders/run.js`, `vercel.json` | Public unauthorized verified | Anonymous Preview request returned 401. Email send not tested. |
| Resend email reminders | `pages/api/reminders/run.js` | Code exists, not verified | Requires `RESEND_API_KEY` and `REMINDER_TO`; not present in local `.env.local` audit. |
| Course TextPack API | `pages/api/courses/textpack.js`, `lib/courseRepository.js`, `lib/course/textpack.js` | Unit tested | GET/POST/DELETE route uses server-derived profile, validates normalized course text, initializes workflow JSON, imports pure text to `course_jobs.preprocess_result` and `course_lessons`, and avoids raw/base64 file upload. Live Supabase import not freshly verified. |
| Course material parsers | `lib/course/materialParsers.js`, `lib/course/pptxText.js` | Unit tested | Supports SRT, PPTX, DOCX, TXT, Markdown, plus OCR-required PDF/images. Text formats stay browser-local; low-density decks and scans are routed to online OCR. |
| Course capability API | `pages/api/courses/capabilities.js` | Unit tested | Returns only whether online OCR and course writing are configured plus non-sensitive model names/service URL. It does not expose API keys, signing secrets, or full prompts. |
| Course workflow API | `pages/api/courses/jobs/[id]/workflow.js`, `lib/course/workflowState.js` | Unit tested | Saves preflight, outline, node drafts/reviewer reports, approvals, pause/resume/cancel, and final assembly through server-side gates. |
| Optional legacy local tools | `scripts/course-worker/build-pack.js`, `scripts/course-worker/run-job.js`, `scripts/course-worker/temp-safety.js` | Unit tested + local sample verified | `build-pack` creates TextPack from a local course dir using a controlled temp root and haoke-notes deterministic scripts. `run-job` polls worker-step API and calls model adapter or deterministic verification mode. Cleanup safety is tested. |
| Course AI workflow | `lib/course/aiAdapter.js`, `pages/api/courses/jobs/[id]/worker-step.js` | Unit tested | Role-based adapter and token-protected worker-step route exist. Real model calls require env and were not run in this handoff. |
| Full-course integration | `docs/course-workflow-spec.md` | Partial / unfinished | Knowledge graph, statute deep-reading tables, comparison tables, case bank, course Q&A, writing and publish integration are documented interfaces only. |
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

## 课程整理模块（2026-06-26）

| 能力 | 当前状态 | 数据位置 | 后续 |
|---|---|---|---|
| SRT/PPTX/DOCX/TXT/Markdown 浏览器解析 | 已完成 | 浏览器内存；仅纯文字入库 | 旧 PPT/DOC 仍需手动转换 |
| PDF/图片/图片型课件在线 OCR | 已完成代码与单测，待线上实测 | HF Space 临时文件；PaddleOCR；Supabase 仅文字 | 推送 Space 后用真实文件验收进度与清理 |
| 在线逐步骤课程处理 | 已完成代码与单测，待真实模型验收 | Vercel API + Supabase workflow JSON | 配置模型后以一节真实课程校准 Prompt |
| 课程偏好与大纲 | 已完成 | Supabase workflow JSON | 真实模型校准 Prompt |
| 结构化大纲编辑与批准 | 已完成 | 版本化 outline | 可继续增加拆分/合并的快捷交互 |
| 单节点 Writer/Reviewer/Revision | 已完成程序链路 | 版本化节点与审查报告 | 使用真实课程校准阈值 |
| Final Review 回流 | 已完成 | 最终报告与节点修改要求 | 真实模型验证 nodeId 定位质量 |
| 多课次顺序推进 | 已完成 | 每课独立状态 | 全课程整合尚未实现 |
| 知识图谱、法条表、案例库、问答 | 未实现 | — | 单课闭环稳定后再进入 |
