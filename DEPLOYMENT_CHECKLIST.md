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
- [ ] Uninvited signed-in users enter the pending state rather than the workbench.
- [ ] Invited active members can enter only their granted workbench modules.
- [ ] Configured owner can enter `/desk` and open owner-only settings.
- [ ] Account session endpoint returns actor, effective profile, role, status, permissions and impersonation state correctly.
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
- [ ] Preview has `CRON_SECRET`; owner environment fallback may additionally use `RESEND_API_KEY` and `REMINDER_FROM`.
- [ ] Each member saves a separate Resend API Key and verified sender in System; member accounts never use owner environment credentials.
- [ ] `/desk/system` can save profile-scoped email-provider settings, recipient and reminder toggles.
- [ ] “发送测试邮件” reaches the typed address without exposing the address or key in a public page.
- [ ] Manual authenticated `/api/reminders/run` returns one owner-isolated digest result.
- [ ] Re-running the same fixed local date does not resend the daily digest.
- [ ] Production Cron is not claimed verified while the feature exists only on a Preview branch.

## Multi-user workspace

- [ ] Query existing profiles and confirm exactly one existing `owner`; migration must stop if this precondition is not met.
- [ ] Apply `lib/db/migrations/20260628_multi_user_workspace.sql` after the reminder migration.
- [ ] Configure a stable `WORKSPACE_SESSION_SECRET` in Preview and Production.
- [ ] Configure a stable `USER_SECRETS_ENCRYPTION_KEY`; record it securely before any user saves credentials.
- [ ] Signed-out users see login and registration/application actions.
- [ ] Uninvited sign-up lands in pending state rather than receiving member or owner access.
- [ ] An invited email becomes an active member and sees only granted navigation.
- [ ] Suspended members cannot enter workbench APIs or pages.
- [ ] Owner can edit permissions, suspend/restore, delete and impersonate a member.
- [ ] Owner-only System sections disappear while impersonating.
- [ ] Member A cannot list, fetch, update or delete Member B's tasks, notes, schedule, reading, courses or content by guessed ID.
- [ ] Member browser caches use profile-specific keys and remain empty after identity switching.
- [ ] Member without a saved AI key cannot use the owner's environment key.
- [ ] Member without a saved Resend key cannot use the owner's email quota.
- [ ] Reminder runner sends each member only their own data using their own email provider configuration.
- [ ] Legacy task reminder scripts/API are pinned to `TASK_REMINDER_OWNER_PROFILE_ID` or the configured owner Clerk ID and never scan all members together.
- [ ] Member without `publish` may save private drafts but cannot publish or withdraw public content.
- [ ] RLS is enabled for personal parent tables and content/course child tables.
- [ ] Do not invite real users or merge `main` until the two-account matrix in `docs/MULTI_USER_WORKSPACE.md` passes.
