# law-tech.dev Project Status

Last updated: 2026-06-27, Asia/Shanghai

Repository: `Curacao914/my-blog`

Working branch: `codex/homepage-phase1`

Production branch: `main` — do not merge or promote without explicit user approval.

## Executive Summary

The current reconstruction phase moved the course processor away from browser-driven high-frequency polling and into a durable server workflow. The same phase tightened Clerk authorization, added administrator-triggered Notion revalidation, lengthened ISR caching, fixed calendar-day labels in the Today view, and moved future tasks into a subdued `稍后` list.

The code is integrated on `codex/homepage-phase1`. The user reported that the targeted tests completed and that `npm run build` passed locally after a server/client webpack chunking conflict was fixed. Preview deployment and deployed end-to-end behavior still need verification.

## Source of Truth and Safety

1. Current Git state and deployed behavior override this document.
2. Work on `codex/homepage-phase1` unless the user explicitly says otherwise.
3. `law-tech.dev` is production; `preview.law-tech.dev` is the test surface.
4. Do not merge `main`, promote Preview, change the production repository, or rotate secrets without explicit approval.
5. The user has disabled `rm -rf`; use path-checked cleanup or the repository's safe clean tooling.

## What Is Now in the Branch

### 1. Durable course processing

Key files:

- `workflows/courseProcessing.js`
- `lib/course/orchestrator.js`
- `lib/course/runBatch.js`
- `pages/api/courses/jobs/[id]/orchestrator.js`
- `pages/api/courses/jobs/[id]/workflow.js`
- `pages/api/courses/jobs/[id]/run-next.js`
- `components/CourseTaskManager.js`

Design:

- Vercel Workflow is the execution engine.
- The workflow persists its run ID and state in the course repository.
- One bounded batch executes per durable step.
- `run` continues immediately, `busy` sleeps with backoff, `done` finishes, and human/paused/error states wait on a hook.
- Closing the browser should not stop the workflow.
- The browser no longer drives the pipeline through a sub-second `/workflow` + `/run-next` loop.
- Workflow payloads should carry IDs and summaries, not full transcripts or drafts.

Status: code-integrated, unit-tested/build-passed locally; deployed close-page continuation still pending.

### 2. Resource-control reason for the redesign

Observed before the redesign, over a roughly 12-hour window:

- `/api/courses/jobs/[id]/workflow`: about 3.4K calls and 7 minutes Active CPU.
- `/api/courses/jobs/[id]/run-next`: about 3K calls and 7 minutes Active CPU.
- Vercel Fluid Active CPU reached 4h16m against a 4h Hobby allowance.

This was mostly idle client polling, not meaningful course work. Do not restore that mechanism.

After Preview deployment, monitor for at least 12–24 hours:

- Fluid Active CPU by function.
- Function invocations.
- Fast Origin Transfer.
- Provisioned Memory.
- Workflow Events and Workflow Data Written.
- ISR Reads and Writes.

### 3. Clerk authorization

Key files:

- `lib/auth/serverAdmin.js`
- `lib/auth/deskPage.js`
- `lib/auth/scheduleOwner.js`
- `pages/api/admin/session.js`

Behavior:

- Hosted Preview and Production require both Clerk keys and an admin allowlist.
- Real Clerk session identity is checked; cookie presence alone is not sufficient.
- Missing hosted configuration fails closed.
- `ALLOW_LOCAL_DESK_FALLBACK=true` is accepted only for deliberate non-Vercel development.
- Clerk is not placed back into Edge middleware because that previously caused `MIDDLEWARE_INVOCATION_FAILED`.

Required hosted environment variables:

- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- At least one of `CLERK_ADMIN_EMAILS` or `CLERK_ADMIN_USER_IDS`

Status: code-integrated and locally tested; Preview login/403/redirect behavior still pending.

### 4. Notion manual refresh and ISR

Key files:

- `components/NotionRefreshButton.js`
- `themes/hexo/components/Header.js`
- `pages/api/content/revalidate.js`
- `blog.config.js`
- `pages/content/[...slug].js`
- `pages/content/index.js`

Behavior:

- A refresh control appears to the right of search and random-article controls for an authenticated administrator.
- It calls `POST /api/content/revalidate` for the current path.
- The API also revalidates related home/archive/sitemap paths where appropriate.
- Public users cannot invoke the endpoint.
- Default ISR was increased to 21,600 seconds (six hours).
- ISR does not run continuously; an expired path is regenerated when requested. The button provides immediate administrator-triggered refresh.

Status: code-integrated and locally tested; Preview UI and actual Notion refresh still pending.

### 5. Today calendar correction

Key files:

- `lib/domain/calendarDate.js`
- `components/TodayBoard.js`
- `components/LawTechDeskStyles.js`

Behavior:

- Calendar dates use `Asia/Shanghai`.
- Day addition is performed on pure `YYYY-MM-DD` dates rather than mixed UTC/local timestamps.
- `2026-06-28` viewed on `2026-06-27` labels as `明天`, not `后天`.
- The main Today surface contains today and overdue items only.
- A subdued `稍后` section shows a small number of near-future items below the main content.
- `接下来` remains the complete future view.

Status: code-integrated and locally tested; Preview visual verification still pending.

### 6. Build compatibility fix

The first Workflow build failed while collecting `/.well-known/workflow/v1/step` with `ReferenceError: self is not defined`.

Cause: the custom production `splitChunks` override generated shared chunks for both browser and server compilation. A browser-oriented chunk was loaded by a Node server route.

Fix: keep the custom split-chunk override client-only and let Next.js manage server chunks.

Do not revert this condition in `next.config.js` unless the Workflow route is rebuilt and tested.

### 7. Dependency and generated-type changes

- `workflow` is pinned at `4.5.0`.
- `tsconfig.json` includes Next-generated type paths/plugins.
- `next-env.d.ts` changed as part of Next/App Route support.
- `yarn.lock` was updated.
- Vercel Fluid compute must be enabled for durable Workflow steps.

## Validation Evidence

Reported by the user during this phase:

- Targeted Jest tests completed.
- `git diff --check` produced no output.
- `npm run build` completed and printed the full route table.
- The Workflow route no longer failed with `self is not defined`.

The exact Jest pass count was not preserved in this document. Rerun tests before production promotion.

Recommended verification command:

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
```

Then run:

```bash
npm run build
git diff --check
git status --short
```

Restore `test-results/junit.xml` before committing if Jest modifies it.

## Known Remaining Work

### Immediate verification

1. Confirm the Vercel Preview deployment builds successfully.
2. Confirm unauthenticated `/desk` access redirects to sign-in.
3. Confirm a non-admin Clerk account is rejected.
4. Confirm the configured admin can enter `/desk` and use private APIs.
5. Start a course job, close the page, wait, reopen it, and verify progress continued.
6. Confirm manual Notion refresh updates a changed article on Preview.
7. Confirm Tomorrow/Day-after labels and the `稍后` list on Preview.
8. Compare Vercel usage after 12–24 hours with the old polling baseline.

### Next product phase: 09:00 daily email digest

The user wants one email every day at 09:00 Asia/Shanghai containing schedule and reading status.

Existing pieces:

- `pages/api/reminders/run.js` sends individual reminder emails through Resend.
- `RESEND_API_KEY`, `REMINDER_FROM`, `REMINDER_TO`, `REMINDER_RUN_TOKEN`, and `CRON_SECRET` already exist as configuration concepts.
- Current `vercel.json` cron is `0 0 * * *`, which is 08:00 Asia/Shanghai.

Still needed:

- A digest query for today, overdue items, upcoming items, and reading progress.
- One composed morning email rather than one email per reminder.
- Idempotency so one date produces at most one digest.
- A 09:00 Asia/Shanghai schedule, normally `0 1 * * *` in UTC.
- Preview/manual test mode that does not accidentally email the production recipient.

Do this as a separate phase after the current Preview verification.

### Performance debt

The successful build reported roughly 999 kB First Load JS shared by all pages, with most weight in `common` and `vendors`. This is not the Active CPU root cause and should not block the current deployment, but it is a future optimization target.

## Safe Cleanup Without `rm -rf`

Example for clearing only `.next`:

```bash
node <<'NODE'
const fs = require('fs')
const path = require('path')
const root = process.cwd()
const target = path.resolve(root, '.next')
if (target !== path.join(root, '.next')) throw new Error(`Refusing unexpected path: ${target}`)
if (fs.existsSync(target)) fs.rmSync(target, { recursive: true, force: true })
console.log('Safe .next cleanup complete')
NODE
```
