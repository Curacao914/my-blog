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

## API

### Discover all new replays

```http
POST /api/courses/pipeline
Authorization: Bearer $COURSE_WORKER_SECRET
X-Law-Tech-Owner-Id: <profile-id>
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
X-Law-Tech-Owner-Id: <profile-id>
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

## Required deployment changes

1. Run `supabase/migrations/20260629_course_pipeline_tasks.sql` in Supabase.
2. Add the same long random `COURSE_WORKER_SECRET` to Vercel and the remote
   Worker secret manager.
3. The Worker sends the target workspace profile ID in
   `X-Law-Tech-Owner-Id`.

## Next integration

The remote Worker will connect existing validated components to these
stages:

```text
discover → downloading → downloaded
→ transcribing → transcript_ready
→ building_textpack → textpack_ready
→ uploading → uploaded
→ awaiting_llm_window / writing
→ cleanup → completed
```
