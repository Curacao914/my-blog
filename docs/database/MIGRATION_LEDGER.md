# Law-Tech Database Migration Ledger

Updated: `2026-07-01T17:18:31Z`

## Governing rule

The migration-history relation `supabase_migrations.schema_migrations` was absent before the repair and remained absent afterward.

This ledger distinguishes structural evidence from execution history and does
not fabricate historical migration timestamps.

## Production project

- Project ref: `htbbkcxevcouwehpugwc`
- Existing full encrypted backup SHA-256:
  `0a8a3d80ed03f6719c3f2b338fd8b581af82ad8de5ea54e7a25cf4593bdbea1b`
- Immediate pre-repair encrypted backup:
  `/Users/curacao/Downloads/law-tech-backups/production-db-repair-20260702-005607/law-tech-production-db-repair-20260702-005607.tar.gz.enc`
- Immediate pre-repair backup SHA-256: `a542b9afb981973f49b857b8a5c4f87b9d031d1781a4963612d027fc6f411263`
- Isolated restore: `PASS=8 FAIL=0`
- Isolated application Preview: `PASS=6 FAIL=0`

## Evidence-based status

The migrations dated 2026-06-24 through 2026-07-01 were structurally
reconciled against the Production schema. Their historical execution order
remains unknown because no usable remote migration-history record was present.

`20260625_schedule_semantics.sql` was the only confirmed partial drift:
seven schedule semantic columns were absent.

`20260702_schedule_semantics_production_repair.sql` was executed or
idempotently verified on Production at `2026-07-01T17:18:31Z`
(`2026-07-02T02:18:31+0900` Asia/Tokyo). SQL SHA-256:
`c530bca58bcade665450af61a5e044766aa233cf1b7547f1f77bf41e514ceb93`. Postcheck passed.

## Repair boundary

The repair added or verified exactly:

- `content_type`
- `importance`
- `importance_source`
- `is_pinned`
- `priority_source`
- `urgency`
- `urgency_source`
- `idx_schedule_items_owner_type`
- six CHECK constraints

No RLS policy, routine, trigger, relation, or migration-history repair was
performed.

## Migration history

No migration-history table was created, repaired, or written by this closure.
Any future migration-history reconciliation requires a separate reviewed
closure.
