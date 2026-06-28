# Preview Deployment Checklist

Use this checklist before considering the durable-workflow/auth/refresh phase verified.

## Vercel project configuration

- [ ] Deployment is for `codex/homepage-phase1`, not `main`.
- [ ] Preview and Production variables are reviewed separately.
- [ ] `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` is present in Preview.
- [ ] `CLERK_SECRET_KEY` is present in Preview.
- [ ] `CLERK_ADMIN_EMAILS` or `CLERK_ADMIN_USER_IDS` contains the intended administrator.
- [ ] Supabase/database variables required by `/desk` and courses are present.
- [ ] Course AI variables are present only where course execution is expected.
- [ ] Vercel Fluid compute / Workflow support is enabled.
- [ ] No secret value is copied into Git, screenshots, or documentation.

## Build

- [ ] Build completes without `self is not defined`.
- [ ] `/.well-known/workflow/v1/step` is generated successfully.
- [ ] Route table prints normally.
- [ ] No `.next` output or generated logs are committed.

## Auth

- [ ] Signed-out visit to `/desk/today` redirects to sign-in.
- [ ] Signed-in non-admin is denied.
- [ ] Configured admin can enter `/desk`.
- [ ] Admin session endpoint returns the expected authenticated state.
- [ ] Private schedule, notes, course, and revalidate APIs reject unauthenticated requests.

## Durable course workflow

- [ ] Start a small course job.
- [ ] Record the job ID and current node/status.
- [ ] Close all site tabs for several minutes.
- [ ] Reopen the course page.
- [ ] Confirm the workflow progressed or reached a legitimate human-waiting state.
- [ ] Confirm no repeated sub-second `/workflow` and `/run-next` requests appear in browser network logs.
- [ ] Confirm only one durable run is associated with the job.
- [ ] Confirm pause/human review/completion stops automatic work.

## Notion refresh

- [ ] Refresh icon appears to the right of search and random article for the admin.
- [ ] It is absent for public users.
- [ ] Change a harmless article line in Notion.
- [ ] Click refresh on that article page.
- [ ] Confirm the changed content appears.
- [ ] Confirm related routes revalidate without rebuilding the entire site.
- [ ] Confirm repeated clicking is not creating an uncontrolled request loop.

## Today view

- [ ] A task dated tomorrow is not in the main Today lanes.
- [ ] The same task appears in `稍后` and `接下来`.
- [ ] Tomorrow displays `明天` and the next day displays `后天`.
- [ ] Overdue incomplete tasks remain visible on Today.
- [ ] Check behavior around Asia/Shanghai midnight if practical.

## Resource follow-up

Capture Vercel Usage before and 12–24 hours after testing:

- [ ] Fluid Active CPU.
- [ ] Function Invocations.
- [ ] Fast Origin Transfer.
- [ ] Provisioned Memory.
- [ ] Workflow Events.
- [ ] Workflow Data Written.
- [ ] ISR Reads and Writes.

Expected pattern: resource use should correlate with real course steps, not with an open or forgotten browser tab.

## Workbench identity and email reminders

- [ ] Pixel Link avatar, browser-local date/time and `看到我记得喝口水` render in expanded, collapsed and mobile navigation.
- [ ] `/api/desk/status` rejects signed-out requests and returns real Today / active / draft counts for the owner.
- [ ] `lib/db/migrations/20260628_reminder_preferences.sql` has been applied to the target Supabase project.
- [ ] Preview has `RESEND_API_KEY`, `REMINDER_FROM`, and `CRON_SECRET` for manual verification.
- [ ] `REMINDER_FROM` uses a verified Resend domain before Production rollout.
- [ ] `/desk/system` can save the recipient and reminder toggles.
- [ ] “发送测试邮件” reaches the typed address without exposing the address or key in a public page.
- [ ] Manual authenticated `/api/reminders/run` returns one owner-isolated digest result.
- [ ] Re-running the same fixed local date does not resend the daily digest.
- [ ] Production Cron is not claimed verified while the feature exists only on a Preview branch.
