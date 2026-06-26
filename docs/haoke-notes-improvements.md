# haoke-notes Improvement Notes

The upstream `haoke-notes` Skill remains read-only for this repository. These notes record improvements that would make it easier to synchronize with the web course workflow without directly modifying the original Skill.

## Structured CLI Output

Current scripts mostly print human-readable progress. Add `--json` output for every deterministic script:

- `scan_files.py`
- `parse_srt.py`
- `extract_ppt.py`
- `split_transcript.py`
- `verify_notes.py`

Each result should include `ok`, `warnings`, `errors`, `outputs`, `checksums`, and `next`.

## Pipeline Manifest

Create a single `working/pipeline_manifest.json` that records:

- source files by display name and checksum
- generated text artifacts
- segment metadata
- OCR-required decks
- prompt/input/output versions
- current stage and resumable cursor

The web adapter can then convert the manifest to TextPack without guessing filenames.

## Checksum Breakpoints

Add checksum-based resume checks. A step should rerun only when its input checksum changed, not merely because an output file exists.

## Prompt Schema

Move outline, writer, reviewer, and final review prompts into versioned schema files. Each prompt should define:

- input fields
- output JSON schema
- validation rules
- failure handling

## Forced Node Tasks

Represent every outline node as a first-class task before writing. Large nodes should split deterministically by line/page span before any model call.

## Reviewer

Add an independent reviewer role with structured scores:

```json
{
  "coverage": 0,
  "grounding": 0,
  "logic": 0,
  "detail": 0,
  "sourceCoverage": 0,
  "issues": [],
  "decision": "approve"
}
```

The writer should revise only the failed node or subnode.

## Local Rewrite

Support local revision files or structured feedback records bound to outline/node/final-note versions. Regeneration should preserve locked or manually edited nodes.

## Model Adapter

Avoid binding the Skill to one model surface. Use a small adapter with role-specific model settings and JSON validation for outline, writer, reviewer, and final review.

## Source Maps

Carry transcript line/time maps and PPT page maps through every output. Final notes should be able to point back to the source span for each section.

## Golden Course Regression

Add a small synthetic course fixture:

- one SRT
- one text PPTX
- one image-like PPTX marker
- expected lesson map
- expected outline shape
- expected reviewer decisions

This fixture should run without model calls for deterministic stages and with mocked model responses for writing stages.

## Web Adapter Boundary

Keep web-specific code out of upstream. The repository should keep its adapter under `lib/course` and `scripts/course-worker`, with any upstream snapshot placed under a clearly marked `upstream/` directory only if needed.

## Browser Material Parser Registry

The web adapter now benefits from a registry-style parser boundary. Upstream could expose deterministic parsers as independent modules with stable outputs for:

- SRT transcript lines
- PPTX slide text and notes
- DOCX text blocks and image warnings
- TXT encoding checks
- Markdown structure-preserving text

Each parser should return normalized text, source maps, warnings, and a material role. Legacy `.ppt` and `.doc` should keep the current safe behavior: ask the user to convert manually instead of pretending conversion succeeded.

## Product Vocabulary Layer

Keep internal names such as TextPack, Job, Step, Worker, and Artifact in machine-readable manifests, but provide a small vocabulary map for user interfaces. This prevents web screens from exposing implementation terms while preserving precise debugging data for logs and diagnostics.

## 已落地的网页适配约束（2026-06-26）

当前仓库已经把原 Skill 中依赖 Agent 自觉执行的关键步骤改为程序门禁：大纲覆盖校验、人工批准、节点级任务、200 行拆分基线、Writer 与 Reviewer 分离、版本对应审查、局部修订、修订次数上限、最终审查回流和多课次顺序推进。原始 Skill 仍保持只读；网页适配层只消费其确定性预处理结果和写作规则。
