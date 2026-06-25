# 课程整理任务壳

## 当前状态

课程整理已经有第一版任务壳和材料上传入口：

- `/api/courses/jobs` 支持创建和读取课程整理任务。
- `/api/courses/jobs/[id]/assets` 支持上传课程材料到 Supabase Storage，并写入 `course_assets`。
- `/api/courses/jobs/[id]/lessons` 支持读取该 job 下的课次列表。
- `/api/courses/lessons/[id]/outline` 支持读取、更新和确认单课大纲。
- `/desk` 课程任务卡片内已加入逐课大纲确认区，可刷新课次、编辑 outline JSON、确认大纲。
- `/desk` 可以创建课程任务，并显示最近任务。
- `/desk` 可以为每个课程任务上传多份 SRT、PPTX 和补充材料。
- 任务写入 Supabase `course_jobs` 表，材料记录写入 `course_assets` 表。
- 材料上传按“材料包”处理，支持多份 SRT 和多份 PPTX。

当前不做的事：

- 不调用 `haoke-notes`。
- 不启动模型生成。
- 不写公开内容快照。

## 设计边界

这一层只负责把“我要整理某门课或一组连续课次”变成稳定 job：

```text
课程名 / 课次范围 / 教师
→ course_jobs.status = created
→ 上传多份 SRT / PPTX / 补充材料
→ 后续 Worker 接手
```

多份 SRT 会在预处理阶段生成 `course_lessons`：

```text
SRT 1 → lesson_order = 1
SRT 2 → lesson_order = 2
SRT 3 → lesson_order = 3
```

Worker 必须按 `lesson_order` 串行运行，并把上一课的摘要、概念、法条、案例等写入下一课的 `previous_context`。

## 第一版上传规则

建议上传：

- `.srt`：课堂转录稿，可多份；后续按课次顺序串行处理。
- `.pptx`：课件，可多份。`.ppt` 不支持，需用户手动另存为 `.pptx`。
- `.pdf` / `.md` / `.txt` / `.docx` / 图片：补充资料，先作为 `other` 或对应类型登记。

上传实现：

- 网页端使用 base64 JSON 上传，便于第一版快速跑通。
- API body size limit 当前为 `50mb`。
- 文件写入 Supabase Storage 的 `SUPABASE_STORAGE_BUCKET`。
- 数据库仅记录 `kind`、`storage_path`、`checksum`。
- 同时记录 `role`、`original_name`、`mime_type`、`size_bytes`、`sort_order` 和 `metadata`。

生产使用前需要在 Supabase 创建私有 bucket，例如：

```text
course-assets
```

并把 `.env.local` 中的 `SUPABASE_STORAGE_BUCKET` 设为该 bucket 名。

后续 Worker 可以按状态推进：

```text
created
→ preprocessing
→ outline-ready
→ outline-confirmed
→ generating
→ verifying
→ done / failed
```

## 后续接入点

- 材料包确认：确认多份 SRT、多份 PPTX 和补充材料属于同一课程批次。
- preflight 偏好确认：学习目标、PPT 类型、讲课风格和输出偏好。
- 课次映射：根据文件名和上传顺序生成 `lesson_map.json`。
- `haoke-notes` 包装器：从 job 读取材料，调用现有工作流。
- 大纲确认：每一课 `outline-ready` 后由用户在工作台确认，再进入生成。
- 发布按钮：生成 Markdown 后可选写入 `content_items`，再成为公开/私有内容。
