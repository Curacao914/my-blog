# 数据库与认证底座设计

## 结论

下一阶段直接建立长期底座：

- 认证：Clerk。
- 数据库：Supabase Postgres。
- 文件存储：优先 Supabase Storage；如果后续部署更偏 Cloudflare，再考虑 R2。
- 文件型 snapshot：保留为迁移、导入、离线备份和静态部署兼容层，不再作为长期主存储。

## 不做的事

- 不在代码中写入真实密钥。
- 不自动创建外部服务。
- 不开放普通用户注册。
- 不把课程材料、PPT、SRT、OCR 中间产物塞进 Postgres。
- 不让 Notion adapter 直接发布公开内容。

## 认证边界

第一阶段只需要管理员登录：

```text
未登录
→ 可访问公开首页、内容、项目、工具、关于
→ 不可访问 /desk

已登录管理员
→ 可访问 /desk
→ 可编辑内容配置
→ 可触发同步、发布、课程 job、事项整理

普通访客
→ 可访问公开内容
→ 可通过链接 + 密码 + 有效期访问受限分享
→ 不需要注册账户
```

管理员判断优先使用 allowlist：

```text
CLERK_ADMIN_EMAILS=example@example.com
```

如果后续需要更稳定，可以改成 Clerk user id allowlist：

```text
CLERK_ADMIN_USER_IDS=user_xxx,user_yyy
```

## 环境变量

`.env.local` 需要由用户手动配置，不提交仓库：

```bash
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
CLERK_ADMIN_EMAILS=

DATABASE_URL=
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_STORAGE_BUCKET=

TASK_CAPTURE_TOKEN=
```

`SUPABASE_SERVICE_ROLE_KEY` 只能在服务端使用，不能暴露到浏览器。

`TASK_CAPTURE_TOKEN` 是给 iOS 快捷指令、外部快速收集入口使用的可选口令；配置后，请通过 `Authorization: Bearer <token>` 或 `x-law-tech-capture-token` 请求头传入。

## 最小数据模型

### 内容

```text
content_items
content_versions
content_access
content_display
share_links
```

设计原则：

- `content_items` 存基本身份：slug、title、type、status、source。
- `content_versions` 存正文版本和 checksum。
- `content_access` 存公开、私有、密码、索引、RSS、sitemap 权限。
- `content_display` 存类别、tag、文件夹路径和课程字段。
- `share_links` 存独立分享链接、密码哈希和有效期。

### 事项

```text
tasks
```

设计原则：

- iOS 快捷指令和 `/desk` 快速收集写入同一张表。
- 初始状态为 `inbox`，不强迫用户一开始填写完整字段。
- 解析失败不丢弃 raw text。

### 课程流水线

```text
course_jobs
course_assets
```

设计原则：

- worker 可以先本地运行，但 job 状态必须写数据库。
- 课程材料文件写 Storage，数据库只存路径、类型和 checksum。
- 输出笔记只有在用户选择发布后才进入 `content_items`。

## 发布与快照

数据库是主存储。

发布流程：

```text
draft content
→ validate metadata
→ render markdown
→ validate assets
→ mark version publishable
→ public pages read published records
→ optional export to data/content-snapshots/live
```

兼容导出用于：

- 保留现有 `/content` 的静态 fallback。
- 在数据库不可用时有最后一次成功版本。
- 迁移期间对比 Notion/Markdown adapter 输出。

## 下一步实现顺序

```text
1. 添加 Clerk 与数据库环境变量样例
2. 写 Supabase schema
3. 写服务端数据库 client
4. 写管理员判断 helper
5. 保护 /desk
6. 把内容配置台改为读取数据库
7. 把现有 live snapshot 导入数据库草稿
```

任何涉及真实 Clerk/Supabase 项目创建、密钥使用、远程数据库迁移的步骤，都需要再次确认。

## 当前代码落地状态

已落地：

- `.env.example` 已加入 Clerk、Supabase、数据库和 Storage 的占位环境变量。
- `lib/db/schema.sql` 已写入最小数据库 schema。
- `lib/db/client.js` 已加入服务端数据库配置读取和 Supabase REST 配置骨架。
- `lib/auth/admin.js` 已加入管理员 allowlist 判断。
- `middleware.ts` 已把 `/desk` 纳入 Clerk 登录保护范围；没有配置 Clerk 时仍保持本地开发可访问。
- `pages/desk/index.js` 已从静态页改为服务端渲染；配置 Clerk 后会校验登录状态和管理员 allowlist，非管理员返回 404。
- `pages/api/admin/health.js` 已加入只读健康检查，只返回配置布尔值，不暴露密钥。
- `pages/api/admin/health.js` 已升级为真实 Supabase 表连通性检查。
- `scripts/content-snapshot/import-live-to-db.js` 已加入 live snapshot 到数据库的导入脚本，支持 `--dry-run`。
- `lib/contentRepository.js` 已加入已发布内容的数据库读取层，暂未接入页面。
- 当前 live snapshot 种子数据已导入数据库。
- `/content` 列表页、`/content/[...slug]` 详情页、`/desk` 内容配置台已改为数据库优先读取；数据库不可用时回退到 live JSON。
- `pages/api/content/config.js` 已加入内容配置写入接口，只允许管理员修改元数据和访问控制，不允许修改正文。
- `lib/contentConfig.js` 已加入内容配置校验和数据库写入逻辑。
- `/desk` 内容配置台已从只读预览升级为可保存类别、tag、访问方式、密码有效期和公开索引权限。
- `/desk` 内容配置台已支持为密码访问内容设置/更换访问密码；留空则不修改旧密码。
- `lib/passwordHash.js` 已加入服务端密码哈希与校验逻辑，数据库只保存哈希，不保存明文密码。
- `pages/api/content/access.js` 已升级为数据库优先校验密码访问；数据库不可用且没有对应数据库记录时，仍回退到 live JSON 快照。
- 公开内容页已收紧权限边界：数据库和 live JSON fallback 都不会把 `private` 条目列入公开列表；公开详情页也不会输出 `private` 正文。
- 内容配置台已支持保存文件夹路径、课程名、课次、教师和课程日期。
- `lib/auth/serverAdmin.js` 已抽出服务端管理员校验，供页面和 API 复用。
- `pages/api/tasks/capture.js` 已加入事项快速收集 API，可由工作台登录态调用，也可由 iOS 快捷指令携带 `TASK_CAPTURE_TOKEN` 调用。
- `lib/tasksRepository.js` 已加入轻量事项解析：标题、链接、事项类型、优先级、时间、提醒、地点和文件位置线索，并写入 `tasks` 收集箱。
- `/desk` 快速收集弹窗已从纯交互壳升级为可保存到数据库的事项入口。
- `docs/tasks-capture.md` 已记录 iOS 快捷指令接入方式。
- `lib/courseRepository.js` 与 `pages/api/courses/jobs.js` 已加入课程整理 job 壳，写入 Supabase `course_jobs`。
- `pages/api/courses/jobs/[id]/assets.js` 已加入课程材料上传接口，写入 Supabase Storage 和 `course_assets`。
- `/desk` 已接入课程整理任务创建、最近任务列表和材料上传入口。
- `docs/course-jobs.md` 已记录课程 Worker 后续接入边界。
- `pages/api/courses/jobs/[id]/index.js` 已加入课程 job 设置接口，可保存材料包确认和 preflight 偏好。
- `/desk` 已接入材料包确认和 preflight 简表。
- `course_jobs` 和 `course_assets` 已扩展为课程批处理模型，支持多份 SRT、多份 PPTX、课次顺序和后续 `course_lessons`。
- `pages/api/courses/jobs/[id]/lessons.js` 和 `pages/api/courses/lessons/[id]/outline.js` 已加入逐课大纲读取/确认接口。
- `/desk` 已加入逐课大纲确认 UI，可读取课次、编辑 outline JSON 并确认。
- `docs/haoke-web-adapter.md` 已记录网页端 haoke-notes 适配策略：材料包、多份 SRT 顺序运行、一份/多份 PPTX 自动对齐、滚动上下文、用户确认点、单课节点撰写、渐进式披露和 Worker 兼容方式。

未落地，需再次确认：

- 批量编辑内容配置。
- 事项 AI 二次整理、提醒发送渠道和 iOS 快捷指令成品模板。
- 课次映射确认、haoke-notes Worker、节点级生成状态和输出发布。
