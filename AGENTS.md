# AGENTS.md

This repository is `Curacao914/my-blog`. It is a NotionNext-based personal site that is being gradually rebuilt into law-tech.dev: a public personal home, a private workspace, and a stable content/workflow layer.

## Read Current State First

- Before changing code, read `PROJECT_STATUS.md` and `NEXT_ASSISTANT_BRIEF.md`.
- Treat those files as a navigation aid, not as stronger evidence than Git state, current code, test output, deployed behavior, or database state.
- If the docs are stale, update them in the same coherent change that makes them stale.

## Long-Term Architecture

- Keep NotionNext as the compatibility layer for existing articles, archive, category, tag, search, RSS, and sitemap routes until replacements are proven.
- The new public home is independent from the NotionNext theme home. It should introduce Curacao, public content, public tools, about, and the private workspace entry.
- The private workspace lives under `/desk`. It owns daily planning, reading, course work, materials, writing, publishing, settings, and future private workflows.
- Notion remains one editing source for notes, but the frontend should not depend on Notion's live response shape. Content should move through Notion/Markdown/manual adapters into validated snapshots or database records.
- Long term, data should flow through capture, normalized objects, workflows, views, and publish controls. Pages are views over data, not isolated data stores.

## Branch, Preview, and Production Safety

- Do not modify or merge `main` unless the user explicitly requests it.
- Do not promote a Vercel Preview to production unless the user explicitly asks and the production blast radius has been checked.
- Do not replace the production Vercel project with a different repository without an explicit migration plan and rollback path.
- Use `codex/homepage-phase1` for the current reconstruction work unless the user says otherwise.
- `law-tech.dev` is production. `preview.law-tech.dev` is the current test/Preview domain. Treat them as separate surfaces.
- Never call a local test a public end-to-end test. Localhost, direct API calls, OpenClaw relay tests, Preview API tests, and real WeChat public tests are distinct evidence classes.
- Batch related changes, test, build, commit, and push once per coherent phase. Avoid tiny commits that trigger frequent Preview deployments.

## Evidence Rules

- Repository code, Git state, deployed HTTP behavior, database state, and explicit test output override chat memory and older docs.
- Do not say a feature is complete because files exist. Record whether it is actually end-to-end verified, locally integrated, unit-tested, build-only, code-only, or unfinished.
- Do not claim old functionality is absent until Git history, branches, and relevant paths have been checked.
- Do not silently remove large areas of code. If deletion is needed, explain the replacement and migration path first.
- Do not use fallback, mock, sample, demo, or hardcoded example data to pretend a workflow succeeded.
- If documentation conflicts with code or current tests, update the documentation or state the conflict clearly.

## Auth and Data Safety

- Frontend changes must not alter data semantics. Do not change `contentType`, visibility, access, schedule status, importance, urgency, pinning, owner, or source behavior just to make a UI easier.
- Clerk must not be placed back into Edge middleware casually. It previously caused Vercel `MIDDLEWARE_INVOCATION_FAILED`.
- Hosted `/desk` pages and private APIs must fail closed when Clerk or the admin allowlist is missing. Local fallback is only for deliberate non-Vercel development.
- Page-level or API-level auth must be verified as real session verification, not just cookie presence, before being described as secure.
- Supabase service keys, Clerk secrets, AI API keys, WeChat tokens, Resend keys, and cron tokens must never be committed or printed in docs.
- All external capture endpoints must return success only after the intended write has succeeded.

## Resource and Workflow Safety

- Do not reintroduce browser-driven high-frequency course polling. The durable workflow is the production execution path; the page is a status and control surface.
- A course step must be idempotent, bounded, resumable, and persisted before the next step starts.
- Keep one writer lane, up to two reviewer lanes, and one revision lane unless the user explicitly approves a new concurrency model.
- Do not put large drafts, transcripts, or source files into workflow metadata or hook payloads. Persist them in the existing data layer and pass identifiers.
- The user has disabled `rm -rf`. Use the repository's safe clean script or a path-checked Node cleanup instead of asking them to re-enable it.

## Visual Direction

- Preserve the current warm white, pale blue-green, deep ink green, serif typography, large radius, and soft shadow direction unless the user explicitly approves a new direction.
- The desired feeling is restrained, personal, and static light glass. Do not turn it into a complex animated liquid-glass demo.
- Avoid product copy that reads like implementation notes, chain-of-thought, architecture explanation, or AI-generated filler.
- The private workspace should be practical first: clear scanning, efficient repeated use, and compact but graceful controls.
- Do not introduce a large UI library for the current frontend refinement unless the user approves it.

## Current Phase

- The course pipeline now uses a durable server workflow and must continue when the browser closes. Deployed end-to-end verification is still required before calling this complete.
- Notion content uses a six-hour ISR default plus an administrator-only manual refresh button in the header.
- Today uses `Asia/Shanghai` calendar dates. The main Today view contains today and overdue items; near-future items belong in the subdued `稍后` list.
- The immediate next phase is Preview verification, resource-usage observation, and the daily 09:00 Asia/Shanghai schedule-and-reading email digest.
- First Load JS is still large and should be optimized only after the current workflow/auth/refresh phase is verified.
