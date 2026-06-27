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
- Completed notes are displayed through the note library using the hierarchy `course → lesson → final note`.
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

Work should proceed in this order unless the user changes priorities:

1. Preview verification of final revision requests, completion state, task indicator cleanup, note library, and adding lessons.
2. Lesson-note soft deletion, recovery, and permanent deletion rules.
3. Course final note → publishing settings → Supabase content records → `/content` and homepage.
4. Optional one-way Notion mirror, while Supabase remains the source of truth.
5. Unified index for legacy NotionNext articles and new content.
6. Production Clerk variables and an explicitly approved merge to `main`.
7. Daily 09:00 Asia/Shanghai workspace digest email.

Performance optimization of large shared First Load JS is real debt, but it should not displace correctness, workflow durability, or publication continuity.

## Phase Update: Lesson Note Lifecycle

- Lesson-note deletion now follows `active → trash → restore or permanent delete`.
- Soft delete keeps final Markdown and all final-note versions.
- Permanent deletion requires an explicit confirmation phrase and removes only the final note and final-note versions.
- Source material, outline, nodes, and node reviews remain after permanent deletion.
- Permanent deletion must never automatically regenerate or spend model credits. Regeneration is a separate explicit user action.
- This phase supersedes the earlier note that lesson-level deletion was still pending.
- After local and Preview verification, the next product phase is course-note publishing into Supabase content records and `/content`.
