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
