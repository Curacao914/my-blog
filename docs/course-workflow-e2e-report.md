# Course Workflow E2E Report

Last run: 2026-06-26 Asia/Shanghai.

## Input

The verification sample is synthetic and non-sensitive.

- Format: SRT text sample generated under `/private/tmp/law-tech-course-sample`
- Course: `证据法`
- Teacher: `张老师`
- Transcript scale: 1 lesson, 2 subtitle cues
- PPTX/DOCX/TXT/Markdown parser coverage: automated parser tests cover these formats with synthetic fixtures, including DOCX tables/images, UTF-8 BOM text, garbled text rejection, Markdown structure, and legacy PPT/DOC conversion guidance.

No raw course file is committed. The sample output was written to `/private/tmp/law-tech-course-sample-textpack.json` and checked for local absolute paths and base64 markers.

## Local File Handling

Verified command:

```bash
npm run course:worker:build-pack -- --course-dir /private/tmp/law-tech-course-sample --output /private/tmp/law-tech-course-sample-textpack.json --job-id sample-002
```

Result:

- `ok: true`
- `lessonCount: 1`
- `deckCount: 0`
- `tempDir: null`
- no `/private`, `/Users`, or `base64` found in the output TextPack

## Workflow Path

Automated tests cover:

- Today focus/standard card layout invariants so the content column cannot collapse into a one-character width while the shell remains wide
- TextPack validation and raw payload rejection
- server-derived owner for import and workflow APIs
- preflight gate before outline
- outline approval gate before node planning
- forced node splitting by threshold
- Reviewer approval gate before node approval
- assembly blocked until all nodes are approved
- assembly now moves to final review instead of completed
- final review approval is required before completion
- worker task planner hands assembled lessons to a final-review task
- node revision-required items are claimed as revision tasks instead of full ordinary write tasks
- failed step recording
- pause/resume/cancel state representation
- course capability API without secret leakage
- productized course page with local processing and course writing service states
- product-copy checks that ordinary desk pages do not expose rough implementation vocabulary

## Outline And Nodes

Synthetic workflow test:

- Outline nodes: 1 parent node
- Forced split threshold: 8 characters
- Planned nodes: more than 1 child node
- Reviewer revisions: 0 in approve-path test
- Final markdown: assembled only after every node is approved, then completed only after final review approval

## Error Recovery

Covered failures:

- missing course AI key results in explicit adapter error
- workflow `fail-step` stores retryable error details
- local processing service offline is displayed as waiting/not connected

## Current Limits

- Real model calls were not executed because no course AI key was used in this run.
- Fake/deterministic provider behavior is available only through explicit local worker development mode.
- The current UI focuses on one lesson at a time. Multi-lesson data shape exists, but full-course graph, law tables, comparison tables, case bank, course Q&A, writing, and publishing are not implemented.
- Browser-level computed-style measurement was attempted with local Chrome, but the sandbox terminated the browser process. CSS and DOM regressions are covered by component/CSS invariant tests.

Latest focused test command:

```bash
npm test -- __tests__/components/DeskWorkspace.test.js __tests__/components/TodayCardCss.test.js __tests__/components/ProductCopy.test.js __tests__/components/CourseTextPackDesk.test.js __tests__/lib/courseMaterialParsers.test.js __tests__/lib/courseTextpack.test.js __tests__/lib/courseWorkerTemp.test.js __tests__/lib/courseWorkerTasks.test.js __tests__/lib/courseWorkflowState.test.js __tests__/lib/courseAiAdapter.test.js __tests__/api/courseCapabilities.test.js __tests__/api/courseTextpack.test.js __tests__/api/courseWorkflow.test.js --runInBand
```

Result from the current expanded suite:

- 13 suites passed
- 34 tests passed

Latest state-machine/worker focused test command:

```bash
npm test -- __tests__/lib/courseWorkflowState.test.js __tests__/lib/courseWorkerTasks.test.js __tests__/lib/courseAiAdapter.test.js __tests__/components/ProductCopy.test.js __tests__/components/CourseTextPackDesk.test.js --runInBand
```

Result: 5 suites passed, 9 tests passed.
