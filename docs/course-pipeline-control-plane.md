# Course pipeline control plane

## Storage boundary

Supabase stores only:

- task identity and display metadata;
- current stage;
- attempt counters;
- retry time;
- sanitized error summaries;
- checksums, stable object keys and generated record IDs;
- stage history.

Supabase does **not** store raw replay video or extracted audio. The media
remains on the Worker scratch disk while a lesson is being processed. If
cross-run persistence is required, the intended object store is Cloudflare
R2 (or another S3-compatible store), and Supabase stores only the stable
object key.

Signed object URLs, playback tokens, cookies, authorization headers and
teaching-platform URLs are rejected by the payload validator.

## Worker authentication

Worker requests use:

```http
Authorization: Bearer $COURSE_WORKER_SECRET
```

Owner resolution follows this order:

1. `X-Law-Tech-Owner-Id`;
2. `COURSE_WORKER_OWNER_ID`;
3. `COURSE_WORKER_OWNER_EMAIL`;
4. the only active workspace owner.

The current single-owner workspace therefore needs only
`COURSE_WORKER_SECRET`. If the workspace later gains more than one active
owner, configure an explicit owner ID or email.

## API

### Discover all new replays

```http
POST /api/courses/pipeline
Authorization: Bearer $COURSE_WORKER_SECRET
Content-Type: application/json

{
  "replays": [
    {
      "replayKey": "semantic-hash",
      "courseKey": "platform-course-hash",
      "courseName": "国际法学",
      "title": "2026-06-03第5-6节",
      "startsAtText": "2026-06-03 13:00",
      "teacher": "教师"
    }
  ]
}
```

The endpoint is idempotent through the `(owner_id, replay_key)` unique key.
Every newly discovered replay is inserted; an existing task is never reset.

### Report a stage

```http
PATCH /api/courses/pipeline/<replay-key>
Authorization: Bearer $COURSE_WORKER_SECRET
Content-Type: application/json

{
  "stage": "transcript_ready",
  "artifacts": {
    "transcriptObjectKey": "courses/.../transcript.md",
    "checksum": "sha256:..."
  },
  "runtime": {
    "durationSeconds": 10773,
    "characters": 54713
  }
}
```

Use stable object keys, never signed URLs.

### List tasks

A signed-in workspace user can call:

```http
GET /api/courses/pipeline?limit=100
GET /api/courses/pipeline?stage=needs_attention
```

The server derives the owner from the Clerk workspace profile and ignores a
client-supplied owner ID.

### Retry

```http
POST /api/courses/pipeline/<replay-key>
Content-Type: application/json

{
  "action": "retry",
  "reason": "manual-retry"
}
```

A signed-in owner can retry their own task. A valid Worker may also retry.

## Worker client

The reusable client lives at:

```text
scripts/course-worker/pipeline-client.mjs
```

Required Worker environment:

```text
COURSE_CONTROL_PLANE_URL=https://<preview-or-production-domain>
COURSE_WORKER_SECRET=<same secret as Vercel>
```

Optional:

```text
COURSE_WORKER_OWNER_ID=<profile id>
COURSE_CONTROL_PLANE_TIMEOUT_MS=30000
```

## Scanner bridge

A safe V008/V009 platform catalog can be synchronized with:

```bash
npm run course:pipeline:sync -- \
  --catalog /path/to/platform-catalog.json
```

By default, only recordings with `isNew: true` are submitted. A baseline or
manual integration test may use:

```bash
npm run course:pipeline:sync -- \
  --catalog /path/to/platform-catalog.json \
  --all \
  --dry-run
```

The bridge strips `watchHref` and never submits teaching-platform URLs,
cookies, authorization headers or playback tokens.

## Deployment

1. Run `supabase/migrations/20260629_course_pipeline_tasks.sql`.
2. Configure the same `COURSE_WORKER_SECRET` in Vercel and the Worker.
3. Configure `COURSE_CONTROL_PLANE_URL` on the Worker.
4. Only configure `COURSE_WORKER_OWNER_ID` when the workspace has multiple
   active owners.

## Next integration

The scanner can now register every new replay. The next stage connects each
persisted task to the existing validated components:

```text
downloading → downloaded
→ transcribing → transcript_ready
→ building_textpack → textpack_ready
→ uploading → uploaded
→ awaiting_llm_window / writing
→ cleanup → completed
```
