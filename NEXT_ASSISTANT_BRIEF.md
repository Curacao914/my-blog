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

1. Lesson-note soft delete, restore, and permanent delete rules.
2. Course note publishing into Supabase content records and `/content`.
3. Optional one-way Notion synchronization.
4. Unified legacy-blog and new-content index.
5. Explicitly approved Production rollout.
6. Daily 09:00 Asia/Shanghai schedule-and-reading digest.

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
