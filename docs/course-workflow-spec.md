# Course Workflow Spec

This document defines the long-term course workflow for law-tech.dev and the first implemented TextPack v1 boundary.

## Data Boundaries

Raw course files stay local by default. The web app and Supabase must not persist raw `.srt`, `.ppt`, `.pptx`, slide images, OCR temp images, extracted working folders, model temp input packs, base64 file payloads, or large internal logs.

The system may persist pure text and workflow state:

- transcript text and line/source maps
- PPT extracted text, slide numbers, OCR-required markers, and text-density metadata
- segments JSON and lesson maps
- course preferences and CourseSpec/global context
- outlines, node plans, node drafts, review reports, user feedback, approved versions, final notes, and job status

Quotas are enforced before import: max lessons, per-lesson transcript chars, per-deck PPT chars, total course chars, segment count, node version count, and review report versions. The UI and API return explicit errors; no silent truncation.

## File Lifecycle

1. Browser mode: the user selects SRT/PPTX files. The browser reads them locally and builds TextPack JSON. Only after user confirmation is TextPack uploaded.
2. Local worker mode: `npm run course:worker:build-pack -- --course-dir <dir> --output <file>` copies allowed files into `<temp-root>/law-tech-course/<job-id>/raw`, runs deterministic preprocessing there, writes TextPack, and removes the temp folder on success.
3. `.ppt` files are rejected with a save-as-PPTX prompt. No LibreOffice conversion is done in the web flow.
4. Image-based PPTX is marked `ocrRequired`; the system does not invent slide text.

## TextPack v1

`schemaVersion: course-textpack.v1`.

Required top-level fields:

- `manifest`: created time, source hash, lesson/deck counts, character counts, quota snapshot
- `course`: name, teacher, lesson range
- `preferences`: deterministic preprocessing preferences
- `lessons`: ordered lesson records with transcript text, source file display name, line count, segments, and source map
- `ppt_text`: ordered deck records with slide count, text density, markdown text, and `ocrRequired`
- `source_maps`: transcript line maps and slide maps
- `checksums`: source, lesson, and deck checksums
- `warnings`: non-blocking import warnings

TextPack must contain only JSON, text, and Markdown. It must not contain base64, local absolute paths, or binary payloads.

## Course And Lesson Model

The durable workflow starts as a `course_jobs` row with a pure-text `preprocess_result.textPack`. `course_lessons` rows are created from TextPack lesson order and title. Raw file assets are not required for TextPack jobs.

Long term, course ownership should be a first-class column. In the current implementation, the API uses server-side profile resolution and stores the owner in `preferences.web_adapter.ownerProfileId`; routes filter and delete only against that server-derived value.

## Workflow State Machine

The complete workflow state machine is:

1. `imported`
2. `preflight_required`
3. `preflight_approved`
4. `outline_pending`
5. `outline_generating`
6. `outline_review`
7. `outline_approved`
8. `node_planning`
9. `node_pending`
10. `node_generating`
11. `node_review`
12. `node_revision_required`
13. `node_approved`
14. `assembly_pending`
15. `assembling`
16. `final_review`
17. `completed`
18. `failed`

Data-layer gates must prevent skipping required approvals. For example, node planning cannot start before outline approval; assembly cannot start before every required node is approved.

The current database still has the earlier coarse status check. This phase maps TextPack import to `status=preprocessing` and `current_node=imported`; the full state enum and gate enforcement remain a follow-up migration.

## CourseSpec And Global Context

CourseSpec is the user-approved global context:

- course name, teacher, dates, lesson range, and source conventions
- learning goal and expected output depth
- legal domain, terminology preferences, citation style, and table preference
- PPT reliance, transcript reliability, and OCR status
- allowed assumptions and explicit exclusions

CourseSpec is produced deterministically from user input and TextPack metadata first, then can be revised by the user before any AI writing.

## Outline Approval

Outline generation is per lesson. The model receives CourseSpec, one lesson transcript, relevant PPT text, source maps, and rolling context. The output is an editable outline with nodes, evidence references, and risk flags.

No node writing starts until the user approves the lesson outline.

## Node Task Queue

Approved outlines are split into node tasks. Each node task carries:

- lesson id and node id
- title and parent outline path
- target length and source spans
- transcript/PPT snippets by source map
- dependencies and rolling context
- version and review state

The queue is resumable; failed nodes can be retried without regenerating approved siblings.

## Forced Node Splitting

Nodes exceeding token or complexity thresholds must split before writing. Splitting is deterministic where possible and model-assisted only when source boundaries are unclear. Splits preserve parent outline references and source maps.

## Node Writing

Node writing is the first AI writing phase. The model receives only the node task, relevant source snippets, CourseSpec, and rolling context, not the whole course history. It must cite source line/slide references where available and leave uncertainty visible.

## Node Quality Review

Each node draft is reviewed for:

- source grounding
- legal concept accuracy
- missing PPT/transcript material
- hallucinated statutes/cases
- coherence with approved outline
- length and formatting compliance

Review reports are versioned and capped. Blocking review results move the node to `node_revision_required`.

## Local Revision

The user can edit node drafts locally in the web UI. User revisions become explicit versions and are never overwritten by model retries unless the user requests regeneration.

## Final Assembly

Assembly merges approved node drafts into a single lesson note. It resolves duplicate headings, creates a lesson summary, legal concept table, case/statute table when supported, and a rolling context summary for the next lesson.

## Consistency Check

Before completion, the system checks:

- every approved outline node has approved content
- source references are valid
- glossary terms are consistent
- course-level concepts are tracked across lessons
- no raw local path or binary payload leaked into persisted output

## Versioning

TextPack import, CourseSpec, outlines, node drafts, review reports, assembled notes, and final lesson notes are versioned. Version count limits prevent unbounded storage growth.

## Resumability

Every step records status, timestamps, current node, errors, and safe metadata. Local worker temp folders are controlled by validated job ids and may be cleaned on success or TTL expiry after failure.

## Deliverables

Phase deliverables:

- TextPack preview and import
- imported course job and lesson rows
- local `build-pack` fallback
- course workflow state JSON in `course_jobs.preprocess_result.workflow`
- workflow API for preferences, outline, node, review, assembly, final review, pause/resume/cancel
- worker-step API for token-protected local worker polling
- role-based course AI adapter for outline, writer, reviewer, and final review

Future deliverables:

- full-course knowledge map
- cross-lesson concept tracking
- law tables and case exercises

## Relation To Other Workspace Areas

- Today: scheduled course tasks and deadlines only.
- Reading: standalone reading materials; course source packs do not become reading items automatically.
- 随手记: user thoughts and drafts, including course-related notes not yet part of the course workflow.
- 写作: later transformation of approved course notes into articles.
- 发布: later publication controls for final content snapshots.

## Deterministic vs AI Phases

Deterministic preprocessing:

- SRT parsing, TXT/Markdown decoding, DOCX XML text extraction, line maps, lesson map, PPTX XML text extraction, text density, segmentation, normalized course-text validation.

Supported browser-local source formats:

- `.srt`: subtitle cues become normalized transcript lines with source timing.
- `.pptx`: slide text and speaker notes become page-mapped deck text; low text density is marked as requiring OCR.
- `.docx`: headings, paragraphs, lists, and table text are extracted. Embedded images are not uploaded; the UI warns that image text has not been recognized.
- `.txt`: UTF-8, UTF-8 BOM, and UTF-16 BOM are decoded; empty or likely garbled files are rejected with a user-facing message.
- `.md` / `.markdown`: Markdown structure is preserved as existing-note or supplementary material text.

Legacy `.ppt` and `.doc` are not silently accepted. The UI asks the user to convert them to `.pptx` or `.docx`.

User-facing terminology maps internal names as follows:

- TextPack -> 课程资料
- Job -> 处理任务
- Step -> 处理阶段
- Worker -> 本地处理服务
- Artifact -> 课程内容 / 处理结果
- AI Provider -> 课程写作服务

Single-lesson AI writing:

- outline proposal, node splitting if needed, node drafting, node review, local revision support, lesson assembly.

Full-course integration:

- macro knowledge graph, cross-lesson concept tracing, integrated notes, statute/case tables, and practice materials. This follows the existing `haoke-notes` integration skill direction but must use persisted, approved lesson outputs rather than raw files.

## Current MVP API Contract

### `GET /api/courses/textpack`

Lists current owner TextPack course jobs. Owner is derived server-side. The response includes course metadata and `preprocess_result.workflow` when present.

### `POST /api/courses/textpack`

Imports TextPack v1 after validation. The request body is `{ textPack }`. Raw files, base64, local absolute paths, and unsupported schemas are rejected. Import is idempotent by owner plus TextPack source hash.

### `DELETE /api/courses/textpack?id=<jobId>`

Deletes the current owner TextPack job and pure-text workflow data. The route verifies `preferences.web_adapter.ownerProfileId`.

### `GET /api/courses/jobs/:id/workflow`

Reads the current owner workflow. Returns `job` and `workflow`.

### `GET /api/courses/capabilities`

Returns the non-sensitive runtime state needed by the course UI:

- whether course writing is configured
- non-sensitive model names for outline/writer/reviewer/revision/final review roles
- whether local processing has enough configuration to connect

The route must not return API keys, worker tokens, full prompts, or internal request payloads.

### `PATCH /api/courses/jobs/:id/workflow`

Applies one user action through repository gates:

- `save-course-spec`
- `save-outline`
- `edit-outline`
- `approve-outline`
- `plan-nodes`
- `update-node-draft`
- `approve-node`
- `assemble`
- `complete-final-review`
- `pause`
- `resume`
- `cancel`
- `fail-step`

The server rejects illegal transitions such as generating outlines before preflight, node planning before outline approval, assembly before every node is approved, or completion before final review approval.

### `GET /api/courses/jobs/:id/worker-step`

Token-protected by `COURSE_WORKER_TOKEN`. Returns the next worker task: `generate-outline`, `plan-nodes`, `write-node`, `assemble`, or `idle`.

### `POST /api/courses/jobs/:id/worker-step`

Token-protected worker writeback for generated outline, planned nodes, node drafts/reviewer reports, assembly, final review reports, or failure records.

## Current MVP Worker

`npm run course:worker:build-pack -- --course-dir <dir> --output <textpack.json>` creates TextPack from local files in a controlled temp directory.

`npm run course:worker:run-job -- --job-id <id> --base-url http://127.0.0.1:3000 --token <token>` polls the app for pending steps and writes results back. With model env configured, it calls an OpenAI-compatible course AI adapter. Node writing uses a writer call followed by an independent reviewer call. Nodes marked for revision are claimed as `revise-node` and use the revision role with reviewer issues and current draft context, then run through reviewer again. Final Markdown assembly is followed by a separate final-review call; only an approving final review can mark the lesson completed. With `--deterministic`, it can run a local synthetic flow for verification; production UI does not claim deterministic output as AI success.

Environment variable names:

- `COURSE_WORKER_TOKEN`
- `COURSE_AI_API_KEY`
- `COURSE_AI_BASE_URL`
- `COURSE_AI_MODEL`
- `COURSE_OUTLINE_MODEL`
- `COURSE_WRITER_MODEL`
- `COURSE_REVIEWER_MODEL`
- `COURSE_FINAL_REVIEW_MODEL`
- `COURSE_AI_TEMPERATURE`

## Current MVP Limits

The implemented MVP covers one lesson at a time. Multi-lesson navigation is represented by data shape but not fully expanded in the UI. Full-course knowledge graph, statute deep-reading tables, comparison tables, case banks, course Q&A, writing workflow, and publishing integration remain architecture-only.
