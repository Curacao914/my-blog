# law-tech.dev Platform Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 law-tech.dev 从 NotionNext 博客首页渐进重构为“公开个人主页 + 私人工作台 + 稳定内容中转层 + 课程笔记流水线 + 事项入口”的个人系统。

**Architecture:** 保留现有 NotionNext 文章路由作为兼容层，新公开层和工作台使用独立页面与数据入口。下一阶段直接建立认证、数据库、权限和任务状态底座；现有文件型 snapshot 作为迁移兼容层和离线备份，不再作为长期主存储。Notion、Markdown、课程流水线和事项入口都写入统一数据库模型，再由发布流程生成公开可读内容。

**Tech Stack:** Next.js Pages Router、Clerk（优先，项目已有依赖）、Supabase Postgres（推荐数据库）、Supabase Storage / S3/R2（文件存储）、Notion/Markdown adapters、Node.js worker、模型 API、iOS Shortcuts webhook、文件型 JSON/Markdown snapshot 迁移兼容层。

---

## 当前状态

已经落地的第一版骨架：

- `pages/index.js`：新公开首页，独立于 NotionNext 主题首页。
- `pages/_app.js`：支持 bare layout，允许新页面绕开 NotionNext 主题壳。
- `data/content-snapshots/staging` 与 `data/content-snapshots/live`：文件型中转层雏形。
- `scripts/content-snapshot/schema.js`：快照字段校验。
- `scripts/content-snapshot/promote.js`：staging 校验通过后发布 live。
- `lib/contentSnapshots.js`：公开内容页读取 live snapshot。
- `pages/content/index.js` 与 `pages/content/[...slug].js`：新内容入口与详情页。
- `pages/tools/index.js`：工具总览页。
- `pages/desk/index.js`：工作台壳、快速收集面板、内容配置台只读视图。
- `docs/law-tech-redesign-spec.md`：总体规格与已确认边界。

本计划从这里继续，但后续功能代码必须在确认后分阶段执行。

## 总体确认点

已经确认的方向：

1. 新系统继续使用现有 Next.js Pages Router，不在这一轮迁移 App Router。
2. Notion 继续作为笔记编辑来源之一，但不再作为前端实时依赖。
3. 下一阶段直接上认证与数据库底座，避免文件型临时方案以后整体推翻。
4. 私人工作台第一阶段做单用户管理员后台，不开放普通用户注册。
5. 文件型 snapshot 保留为导入、导出、离线备份和部署兼容层。
6. 课程流水线和事项系统先接统一数据库模型，再逐步接模型 API、提醒和云端任务。

如果以上任一项改变，应先更新本计划，再执行代码。

---

## Task 1: 双层主页与信息架构收敛

**Purpose:** 明确公开层和私人层的边界，避免首页继续堆功能。

**Files:**

- Modify: `docs/law-tech-redesign-spec.md`
- Modify: `pages/index.js`
- Modify: `pages/desk/index.js`
- Create after confirmation: `docs/navigation-map.md`

**Target architecture:**

```text
公开层
├─ /                 首页：身份、栏目、最近更新
├─ /content          内容入口：文章、课程笔记、读书记录、公开分享
├─ /projects         项目入口：网站、课程整理、研究/语料项目
├─ /tools            工具入口：OCR、引注、后续工具
├─ /about            关于
└─ /desk             私人工作台入口

私人层
├─ /desk#today       今日
├─ /desk#tasks       事项
├─ /desk#courses     课程
├─ /desk#library     资料
├─ /desk#writing     写作
├─ /desk#sharing     分享
└─ /desk#settings    设置
```

**Implementation steps after confirmation:**

- [ ] Step 1: Create `docs/navigation-map.md` with the final public/private navigation map above and route ownership notes.
- [ ] Step 2: Review `pages/index.js` and remove any link that duplicates a long-term section as a one-off homepage button.
- [ ] Step 3: Review `pages/desk/index.js` and ensure every sidebar item has exactly one stable target.
- [ ] Step 4: Run `npm run lint -- --file pages/index.js --file pages/desk/index.js`.
- [ ] Step 5: Run `npm run build`.

**Acceptance criteria:**

- 首页只负责导向和表达个人风格。
- 工具不在首页分散堆叠。
- 课程笔记只是内容/工作台中的一个栏目，不支配首页。
- `/dashboard` 保留兼容，不在确认前删除或覆盖。

---

## Task 2: 认证与数据库底座

**Purpose:** 先建立最终系统会长期使用的登录、数据库、权限和存储边界，避免先做文件型临时后台再整体迁移。

**Files:**

- Create after confirmation: `docs/database-auth-design.md`
- Create after confirmation: `lib/auth/admin.js`
- Create after confirmation: `lib/db/client.js`
- Create after confirmation: `lib/db/schema.sql`
- Create after confirmation: `lib/db/types.js`
- Modify after confirmation: `pages/desk/index.js`
- Modify after confirmation: `.env.example`

**Recommended provider choice:**

```text
Auth: Clerk
Reason: 项目已经安装 @clerk/nextjs，管理员登录与长期会话成本最低。

Database: Supabase Postgres
Reason: 适合内容版本、事项、课程 job、分享链接、权限字段和后续 AI 索引。

File storage: Supabase Storage or S3/R2
Reason: PPT、SRT、OCR 中间产物、课程附件不应塞进 Postgres。
```

**Minimum database schema:**

```sql
create table content_items (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  type text not null,
  status text not null default 'draft',
  source text not null default 'manual',
  source_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table content_versions (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references content_items(id) on delete cascade,
  version integer not null,
  body_markdown text not null,
  checksum text not null,
  created_at timestamptz not null default now(),
  unique (item_id, version)
);

create table content_access (
  item_id uuid primary key references content_items(id) on delete cascade,
  mode text not null default 'private',
  password_hash text,
  expires_at timestamptz,
  allow_indexing boolean not null default false,
  allow_rss boolean not null default false,
  allow_sitemap boolean not null default false
);

create table content_display (
  item_id uuid primary key references content_items(id) on delete cascade,
  category text,
  tags text[] not null default '{}',
  folder_path text[] not null default '{}',
  course_name text,
  course_lesson text,
  course_teacher text,
  course_date date,
  pinned boolean not null default false,
  show_in_recent boolean not null default true
);

create table share_links (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references content_items(id) on delete cascade,
  token text unique not null,
  password_hash text,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);

create table tasks (
  id uuid primary key default gen_random_uuid(),
  raw_text text not null,
  title text not null,
  status text not null default 'inbox',
  type text,
  priority text,
  starts_at timestamptz,
  due_at timestamptz,
  remind_at timestamptz,
  place text,
  links text[] not null default '{}',
  file_refs jsonb not null default '[]'::jsonb,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table course_jobs (
  id uuid primary key default gen_random_uuid(),
  course_name text not null,
  lesson text,
  teacher text,
  status text not null default 'created',
  current_node text,
  output_content_item_id uuid references content_items(id),
  changelog jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table course_assets (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references course_jobs(id) on delete cascade,
  kind text not null,
  storage_path text not null,
  checksum text not null,
  created_at timestamptz not null default now()
);
```

**Implementation steps after confirmation:**

- [ ] Step 1: Create `docs/database-auth-design.md` with provider decision, schema, permission rules, and migration notes.
- [ ] Step 2: Add `.env.example` entries for Clerk and database credentials without adding real credentials.
- [ ] Step 3: Create `lib/db/schema.sql` with the minimum schema above.
- [ ] Step 4: Create `lib/db/client.js` that reads database URL from environment and refuses to run without it.
- [ ] Step 5: Create `lib/auth/admin.js` with an `isAdminUser(user)` helper using an allowlist email or Clerk user id.
- [ ] Step 6: Protect `/desk` behind admin auth only after Clerk environment variables are configured.
- [ ] Step 7: Add a database health check API that returns only `{ ok: boolean }`, never credentials.
- [ ] Step 8: Do not migrate content until schema and auth are verified.

**Acceptance criteria:**

- `/desk` can become a real private admin area without introducing ordinary user registration.
- Database schema can represent content, versions, access, sharing, tasks, course jobs, and course assets.
- No credential is committed.
- No external service setup is performed without explicit confirmation.

---

## Task 3: 数据库版 Notion/Markdown 内容中转层

**Purpose:** 渐进脱离 Notion 实时结构，保证 Notion 接口或格式异常时前端不崩。

**Files:**

- Modify: `scripts/content-snapshot/schema.js`
- Modify: `scripts/content-snapshot/promote.js`
- Modify: `lib/contentSnapshots.js`
- Create after confirmation: `lib/contentRepository.js`
- Create after confirmation: `lib/contentPublish.js`
- Create after confirmation: `scripts/content-snapshot/import-markdown.js`
- Create after confirmation: `scripts/content-snapshot/import-notion.js`
- Keep for compatibility: `data/content-snapshots/staging/.gitkeep`
- Keep for compatibility: `data/content-snapshots/errors/.gitkeep`

**Data flow:**

```text
Notion / Markdown / Manual
→ adapter writes draft content_items + content_versions
→ schema and render validation
→ publish creates public-readable version
→ optional export writes live JSON snapshot for static compatibility
→ public frontend reads database or exported live snapshot
```

**Required snapshot fields:**

```ts
type ContentSnapshot = {
  id: string
  slug: string
  title: string
  type: 'article' | 'course-note' | 'reading-note' | 'project' | 'page'
  visibility: 'private' | 'public' | 'shared'
  status: 'draft' | 'published' | 'archived'
  summary?: string
  tags: string[]
  category?: string
  access: {
    mode: 'public' | 'password' | 'private'
    password?: string
    passwordHash?: string
    expiresAt?: string
    allowIndexing: boolean
    allowRss: boolean
    allowSitemap: boolean
  }
  display: {
    category: '法律之上' | '法与算法' | '遇事不决' | '秘密花园'
    tags: string[]
    pinned?: boolean
    showInRecent?: boolean
  }
  course?: {
    name?: string
    lesson?: string
    teacher?: string
    date?: string
  }
  folder?: {
    path: string[]
  }
  date?: string
  updatedAt: string
  source: 'notion' | 'markdown' | 'manual'
  sourceId?: string
  bodyMarkdown: string
  assets: Array<{ url: string; alt?: string }>
  checksum: string
}
```

**Implementation steps after confirmation:**

- [ ] Step 1: Create `lib/contentRepository.js` with database reads/writes for `content_items`, `content_versions`, `content_access`, and `content_display`.
- [ ] Step 2: Create `lib/contentPublish.js` with a `publishContentItem(itemId)` function that validates metadata, renders Markdown, and marks a version as publishable.
- [ ] Step 3: Keep `scripts/content-snapshot/promote.js` as an export/compatibility command, but make database the source of truth after migration.
- [ ] Step 4: Add Markdown render validation using the same Markdown renderer used by `pages/content/[...slug].js`.
- [ ] Step 5: Add asset validation that rejects empty asset URLs and records failures in a database-visible error record or compatibility `data/content-snapshots/errors/last-error.json`.
- [ ] Step 6: Create `scripts/content-snapshot/import-markdown.js` to convert local Markdown files into database draft rows.
- [ ] Step 7: Create `scripts/content-snapshot/import-notion.js` as an adapter shell that writes database drafts only; it must not publish directly.
- [ ] Step 8: Add an export command that can regenerate `data/content-snapshots/live` from published database rows for static fallback.
- [ ] Step 9: Simulate a broken Notion import and confirm existing published rows remain unchanged.

**Acceptance criteria:**

- Notion 拉取失败不会覆盖 live。
- Markdown 导入失败不会覆盖 live。
- 私有内容不会进入公开 content list、RSS、sitemap 或搜索索引。
- 密码分享过期后显示过期状态，不泄露正文。

---

## Task 4: 内容配置台从只读到数据库草稿编辑

**Purpose:** 让用户能用直觉操作配置每篇内容的类别、tag、访问方式、密码和课程字段。

**Files:**

- Modify after confirmation: `pages/desk/index.js`
- Create after confirmation: `pages/api/content/config.js`
- Create after confirmation: `lib/contentConfig.js`
- Create after confirmation: `scripts/content-snapshot/hash-password.js`

**Interaction model:**

```text
/desk 内容配置台
→ 用户修改字段
→ POST /api/content/config
→ 写入数据库草稿/元数据表
→ validate
→ 用户点击发布
→ publishContentItem
→ 更新公开可读版本
```

**Implementation steps after confirmation:**

- [ ] Step 1: Extract content config UI from `pages/desk/index.js` into a focused component only if the file becomes difficult to maintain.
- [ ] Step 2: Create `lib/contentConfig.js` with functions `readContentConfig(slug)`, `updateContentConfig(slug, patch)`, and `listContentConfigs()`.
- [ ] Step 3: Create `pages/api/content/config.js` accepting only `POST`.
- [ ] Step 4: Validate API input: `slug`, `display.category`, `display.tags`, `access.mode`, `access.expiresAt`, `course`, and `folder.path`.
- [ ] Step 5: Reject any request that tries to write `bodyMarkdown` through this endpoint.
- [ ] Step 6: Hash password input before storing it as `access.passwordHash`.
- [ ] Step 7: Keep “保存配置” disabled until the API validation is in place.
- [ ] Step 8: Enable “保存配置” for one row after validation passes.
- [ ] Step 9: Run lint, type-check, build, and content snapshot validation.

**Acceptance criteria:**

- 页面可以改元数据，但不能通过配置接口改正文。
- 密码不以明文进入 live。
- 数据库写入失败时 UI 显示失败，不误提示成功。
- publish 仍然是独立动作，不在保存配置时自动发生。

---

## Task 5: 好课课程笔记云端流水线设计

**Purpose:** 把现有 `haoke-notes` 工作流从 Claude Code 本地执行，逐步产品化为可恢复、可确认、可发布的课程整理流水线。

**Files:**

- Create after confirmation: `docs/course-pipeline-design.md`
- Create after confirmation: `lib/coursePipeline/types.js`
- Create after confirmation: `scripts/course-worker/run-job.js`
- Store after confirmation: `course_jobs`
- Store after confirmation: `course_assets`
- Later after storage confirmation: cloud storage adapter for Supabase Storage / S3 / R2

**Workflow:**

```text
上传 SRT + PPT/PPTX
→ 建立 course job
→ 提取 PPT 文本 / OCR
→ 切分转录
→ 读取 preferences
→ 生成大纲
→ 用户确认大纲
→ 分节点生成笔记
→ verify_notes.py 校验
→ 输出 Markdown
→ 存入资料库
→ 可选发布为 ContentSnapshot
```

**Job model:**

```ts
type CourseJob = {
  id: string
  courseName: string
  lesson?: string
  teacher?: string
  sourceFiles: Array<{
    kind: 'srt' | 'ppt' | 'pptx' | 'pdf' | 'image'
    path: string
    checksum: string
  }>
  preferencesPath?: string
  status:
    | 'created'
    | 'preprocessing'
    | 'outline-ready'
    | 'outline-confirmed'
    | 'generating'
    | 'verifying'
    | 'done'
    | 'failed'
  currentNode?: string
  outputMarkdownPath?: string
  changelog: Array<{
    at: string
    event: string
    message: string
  }>
}
```

**Implementation steps after confirmation:**

- [ ] Step 1: Write `docs/course-pipeline-design.md` describing database-backed jobs first, local worker for execution first, cloud queue later.
- [ ] Step 2: Define `CourseJob` runtime validation in `lib/coursePipeline/types.js`.
- [ ] Step 3: Store course job state in `course_jobs`, not local JSON.
- [ ] Step 4: Wrap the existing haoke-notes workflow behind `scripts/course-worker/run-job.js`.
- [ ] Step 5: Persist job state after each stage so failed jobs can resume.
- [ ] Step 6: Add an outline confirmation state before any full note generation.
- [ ] Step 7: Run existing `verify_notes.py` before marking a job done.
- [ ] Step 8: Export completed Markdown to `content_items` / `content_versions` as `type: 'course-note'` only after user chooses publish.

**Acceptance criteria:**

- 不依赖长期打开 Claude Code 终端作为唯一运行方式。
- Worker 可以先本地运行，但 job 状态必须存在数据库中，后续可迁移到云端队列。
- 每个 job 可恢复、可查看 changelog。
- 用户确认大纲前不会批量生成最终笔记。

---

## Task 6: 事项系统与 iOS 快捷指令入口

**Purpose:** 替代“苹果提醒事项 + 微信置顶聊天”的随手记录痛点，先保证输入方便、整理清晰、提醒可接入。

**Files:**

- Create after confirmation: `docs/tasks-shortcuts-design.md`
- Create after confirmation: `lib/tasks/types.js`
- Create after confirmation: `pages/api/tasks/quick-capture.js`
- Modify after confirmation: `pages/desk/index.js`
- Later after confirmation: reminder adapter files

**Input paths:**

```text
iPhone 快捷指令
→ POST /api/tasks/quick-capture
→ create raw inbox item
→ optional parser extracts fields
→ item enters 待整理

/desk ⌘K
→ same API
→ same 待整理 queue

微信 / 企业微信
→ later adapter
→ same API
```

**Task model:**

```ts
type PersonalTask = {
  id: string
  rawText: string
  title: string
  status: 'inbox' | 'planned' | 'waiting' | 'done' | 'archived'
  type?: 'course' | 'student-work' | 'life' | 'research' | 'writing' | 'admin'
  priority?: 'low' | 'normal' | 'high'
  time?: {
    startsAt?: string
    dueAt?: string
    remindAt?: string
  }
  place?: string
  links: string[]
  fileRefs: Array<{
    label: string
    path: string
  }>
  notes?: string
  createdAt: string
  updatedAt: string
}
```

**Implementation steps after confirmation:**

- [ ] Step 1: Write `docs/tasks-shortcuts-design.md` with iOS Shortcut request format.
- [ ] Step 2: Define `PersonalTask` runtime validation in `lib/tasks/types.js`.
- [ ] Step 3: Create `pages/api/tasks/quick-capture.js` accepting `POST` with `rawText`, `source`, optional `links`, and optional `fileRefs`.
- [ ] Step 4: Store first-phase tasks in the `tasks` database table.
- [ ] Step 5: Change `/desk` quick capture modal from non-saving placeholder to posting raw inbox items.
- [ ] Step 6: Add an explicit “待整理” list in `/desk#tasks`.
- [ ] Step 7: Add parser interface `parseTask(rawText)` but keep the first parser deterministic unless model API use is confirmed.
- [ ] Step 8: Add reminder adapter interface without choosing final channel.

**Acceptance criteria:**

- iOS 快捷指令可以一键提交自然语言事项。
- 初始输入不强迫完整表单。
- 未解析事项进入待整理，不丢。
- 重要提醒渠道在确认前不擅自选择短信、企业微信或邮件。

---

## Task 7: 分享、权限与安全边界细化

**Purpose:** 在认证与数据库底座建立后，细化谁能访问分享内容，以及索引/RSS 如何遵守权限。

**Files:**

- Create after confirmation: `docs/auth-and-sharing-design.md`
- Modify after confirmation: `pages/desk/index.js`
- Modify after confirmation: `pages/content/[...slug].js`
- Modify after confirmation: `pages/api/content/access.js`

**Recommended first version:**

```text
管理员入口：Clerk
普通访问：无注册
分享访问：链接 + 密码 + 有效期
默认内容：private
公开发布：写入公开可读版本，可选导出 live snapshot
```

**Implementation steps after confirmation:**

- [ ] Step 1: Reuse Task 2 的 Clerk 管理员登录。
- [ ] Step 2: Confirm `/desk` is protected behind admin auth.
- [ ] Step 3: Store password hashes, not plaintext passwords.
- [ ] Step 4: Ensure private content never appears in live index.
- [ ] Step 5: Ensure password content appears as locked metadata only.
- [ ] Step 6: Ensure RSS、搜索索引、sitemap respect `access.allowRss`、`access.allowIndexing`、`access.allowSitemap`.

**Acceptance criteria:**

- 未登录不能访问工作台。
- 私有内容不进入公开索引。
- 密码分享过期后不能读取正文。
- 受限分享不需要完整注册系统。

---

## Confirmation Required Before Next Code Phase

建议下一次真正写代码前，先确认以下四项：

1. 登录优先使用 Clerk，复用项目已有依赖。
2. 数据库优先使用 Supabase Postgres。
3. 文件存储优先使用 Supabase Storage；如部署策略更适合 Cloudflare，再换 R2。
4. `/desk` 下一步先做认证与数据库底座，再做内容配置写入。
5. 事项系统第一入口优先做 iOS 快捷指令 webhook，微信/企业微信作为后续 adapter。

确认后推荐执行顺序：

```text
Task 2 认证与数据库底座
→ Task 3 数据库版内容中转层
→ Task 4 内容配置台写数据库草稿
→ Task 7 分享权限细化
→ Task 6 事项 quick capture
→ Task 5 课程流水线
```

这个顺序的原因是：认证、数据库和权限是全站底座；事项和课程都需要稳定的私有区、存储与任务状态，过早接 AI 或队列会增加返工。
