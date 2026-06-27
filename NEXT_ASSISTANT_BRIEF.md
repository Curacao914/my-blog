# Next Assistant Brief

Use this as the first briefing for a new model or coding agent.

## One-paragraph context

`Curacao914/my-blog` is a NotionNext-based personal site becoming law-tech.dev. Work happens on `codex/homepage-phase1`; `main` and `law-tech.dev` remain production and must not be touched without explicit approval. The latest phase replaced browser-driven course polling with Vercel Workflow, tightened Clerk admin authorization, added administrator-only Notion refresh with six-hour ISR, and fixed the Today view's Asia/Shanghai date classification. Local targeted tests and build were reported successful, but deployed Preview verification is still required.

## Start every session with

```bash
cd "/Users/curacao/Script/个人主页/my-blog-main" || exit 1
git status --short
git branch --show-current
git log -3 --oneline
git fetch origin
git rev-list --left-right --count HEAD...origin/codex/homepage-phase1
```

Expected branch: `codex/homepage-phase1`.

Do not automatically reset, stash, discard, merge, rebase, push, or switch branches when the worktree is not clean. Explain the state first.

## Read these files before changing code

1. `AGENTS.md`
2. `PROJECT_STATUS.md`
3. The actual files involved in the request
4. Current test output and Vercel Preview logs, if available

## Current technical invariants

- No production merge or promotion without explicit approval.
- No high-frequency browser loop that repeatedly calls both `/workflow` and `/run-next`.
- Durable Workflow is the execution path; browser UI is status/control only.
- One writer, at most two reviewers, one revision lane.
- Persist drafts and sources outside workflow payloads.
- Hosted Clerk auth fails closed and requires an admin allowlist.
- Do not move Clerk back into Edge middleware casually.
- Today calculations use `Asia/Shanghai` pure calendar dates.
- Future tasks may appear only in the subdued `稍后` list on Today.
- Notion manual refresh is administrator-only.
- Custom webpack split chunks remain client-only so the Workflow server route does not load a browser `self` chunk.
- The user has disabled `rm -rf`.

## What to verify next

1. Vercel Preview build and Workflow route.
2. Preview Clerk login, unauthenticated redirect, and non-admin rejection.
3. Close-page course continuation.
4. Manual Notion refresh against a real changed page.
5. Today/明天/后天 and `稍后` visual behavior.
6. Vercel resource usage after 12–24 hours.

Do not call any of these complete until deployed evidence exists.

## Next planned feature

Build a single daily 09:00 Asia/Shanghai email digest for schedule and reading status using Resend. Existing reminder code sends individual reminders and is not yet the requested digest. Treat this as a new coherent phase after Preview verification.

## Useful commands

Targeted validation:

```bash
npx jest --runInBand \
  __tests__/lib/calendarDate.test.js \
  __tests__/lib/deskPageAuth.test.js \
  __tests__/components/NotionRefreshButton.test.js \
  __tests__/components/CourseTaskManager.test.js \
  __tests__/components/DeskWorkspace.test.js \
  __tests__/api/contentRevalidate.test.js \
  __tests__/api/courseWorkflow.test.js \
  __tests__/lib/courseWorkflowState.test.js \
  __tests__/lib/courseWorkerTasks.test.js \
  __tests__/lib/courseWorkflowE2E.test.js
npm run build
```

Before commit:

```bash
git restore test-results/junit.xml 2>/dev/null || true
git diff --check
git status --short
```

Do not use the final `|| true` pattern for substantive tests or builds; it is only acceptable above for an optional generated test report file.
