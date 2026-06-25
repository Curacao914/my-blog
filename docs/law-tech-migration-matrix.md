# law-tech → my-blog migration matrix

状态：

- 已迁移且验证通过
- 已迁移但未验证
- 尚未迁移
- 已废弃且有明确替代
- 存在于旧 Git 历史但当前版本缺失

| 范围 | law-tech 来源 | my-blog 目标 | 状态 | 验证 |
| --- | --- | --- | --- | --- |
| 首页 | `app/(public)/page.jsx` | `pages/index.js` | 已迁移且验证通过 | `yarn build` |
| 公开导航 | `components/PublicHeader.jsx`, `lib/domain/navigation.js` | `components/law-tech/PublicHeader.js`, `lib/domain/navigation.js` | 已迁移且验证通过 | `yarn build` |
| 关于页 | `app/(public)/about/page.jsx` | `pages/about/index.js` | 已迁移且验证通过 | `yarn build` |
| 内容页 | `app/(public)/content/page.jsx` | `pages/content/index.js` | 已废弃且有明确替代 | my-blog 内容快照页比 law-tech 占位页更完整 |
| 工具页 | `app/(public)/tools/page.jsx` | `pages/tools/index.js` | 已废弃且有明确替代 | my-blog 已保留 OCR / citation 入口 |
| 项目页 | `app/(public)/projects/page.jsx` | 无独立页 | 已废弃且有明确替代 | law-tech 当前版本仅重定向到 content |
| 工作台框架 | `components/DeskShell.jsx` | `components/DeskShell.js` | 已迁移且验证通过 | `yarn build` |
| 今日 | `app/(desk)/desk/today/page.jsx`, `components/TodayBoard.jsx` | `pages/desk/today/index.js`, `components/TodayBoard.js` | 已迁移且验证通过 | `npm run build`；本地 API 集成验证；新增焦点区/四象限/内容类型筛选 |
| 阅读箱 | `app/(desk)/desk/reading/page.jsx`, `components/ReadingBox.jsx` | `pages/desk/reading/index.js`, `components/ReadingBox.js` | 已迁移且验证通过 | `npm run build`；本地 API 集成验证；不再用 `links.length` 判定阅读 |
| 随手记 | `app/(desk)/desk/inbox/page.jsx` | `pages/desk/inbox/index.js` | 已迁移且验证通过 | `yarn build` |
| 课程整理页 | `app/(desk)/desk/courses/page.jsx` | `pages/desk/courses/index.js` | 已迁移且验证通过 | `yarn build` |
| 材料页 | `app/(desk)/desk/materials/page.jsx` | `pages/desk/materials/index.js` | 已迁移且验证通过 | `yarn build` |
| 事项页 | `app/(desk)/desk/tasks/page.jsx` | `pages/desk/tasks/index.js` | 已迁移且验证通过 | `yarn build` |
| 写作页 | `app/(desk)/desk/writing/page.jsx` | `pages/desk/writing/index.js` | 已迁移且验证通过 | `yarn build` |
| 发布设置页 | `app/(desk)/desk/publish/page.jsx` | `pages/desk/publish/index.js` | 已迁移且验证通过 | `yarn build` |
| 系统设置页 | `app/(desk)/desk/system/page.jsx` | `pages/desk/system/index.js` | 已迁移且验证通过 | `yarn build` |
| `desk/active` | `app/(desk)/desk/active/page.jsx` | `pages/desk/active/index.js` | 已迁移且验证通过 | `yarn build` |
| `desk/library` | `app/(desk)/desk/library/page.jsx` | `pages/desk/library/index.js` | 已迁移且验证通过 | `yarn build` |
| 分享页 | 旧历史 `app/(share)/s/[token]/page.jsx` | `pages/s/[token]/index.js` | 存在于旧 Git 历史但当前版本缺失；已恢复 | `yarn build` |
| 日程解析 API | `app/api/schedule/parse/route.js` | `pages/api/schedule/parse.js` | 已迁移且验证通过 | 中文日程 AI parse 200 |
| 日程读写 API | `app/api/schedule/items/route.js` | `pages/api/schedule/items.js` | 已迁移且验证通过 | GET 200，读到 Supabase 项 |
| 微信 capture API | `app/api/schedule/capture/route.js` | `pages/api/schedule/capture.js` | 已迁移且本地验证通过 | 本地 API 集成：capture 写入 `schedule_items`；重复 messageId 返回 duplicate；真实微信公网端到端待 Preview 公开后验证 |
| 阅读笔记 API | `app/api/notes/route.js` | `pages/api/notes/index.js` | 已迁移但未完整验证 | 构建通过；未执行笔记草稿写入 |
| 提醒 Cron API | `app/api/reminders/run/route.js` | `pages/api/reminders/run.js` | 已迁移且验证通过 | token 调用 200，count 0 |
| 日程领域模型 | `lib/domain/schedule.js` | `lib/domain/schedule.js` | 已迁移且验证通过 | API 读写使用 |
| 日程上下文选择 | `lib/domain/schedule-context.js` | `lib/domain/schedule-context.js` | 已迁移且验证通过 | capture 修改上下文可用 |
| 提醒规则 | `lib/domain/reminders.js` | `lib/domain/reminders.js` | 已迁移且验证通过 | 写入口会同步 reminders |
| Supabase 服务层 | `lib/server/supabase.js` | `lib/server/supabase.js` | 已迁移且适配 Pages Router | REST 方式验证 |
| 提醒服务层 | `lib/server/reminders.js` | `lib/server/reminders.js` | 已迁移且适配 REST | Cron 200 |
| 数据库 schema | `lib/db/schema.sql` | `lib/db/schema.sql` | 已迁移但需线上手动执行 | 本地构建通过；新增 `content_type/importance/urgency/is_pinned/*_source` 兼容列 |
| 数据库 migrations | `lib/db/migrations/*.sql` | `lib/db/migrations/*.sql` | 已迁移但需线上手动执行 | 新增 `20260625_schedule_semantics.sql`；代码仍兼容未执行 migration 的线上库 |
| OpenClaw relay | `integrations/openclaw/law-tech-wechat-relay` | 同路径 | 已迁移且本地验证通过 | `node --test` 4 passed；旧 `/api/tasks/inbox/wechat` 桥接到 `/api/schedule/capture` 本地 200 |
| OpenClaw 文档 | `docs/integrations/openclaw-wechat.md` | 同路径 | 已迁移 | 文件迁移 |
| 产品文档 | `docs/product-architecture.md`, `docs/product-constraints.md` | 同路径 | 已迁移 | 文件迁移 |
| 静态头像 | `public/avatar.png` | `public/avatar.png` | 已迁移且验证通过 | 首页构建 |
| Cron 配置 | `vercel.json` | `vercel.json` | 已迁移且验证通过 | build route includes `/api/reminders/run` |
| 环境变量样例 | `.env.example` | `.env.example` | 已迁移 | 文件迁移 |
| Clerk middleware | `middleware.js` | `middleware.ts` | 已迁移且验证通过 | `clerkMiddleware` 包住 NotionNext 兼容逻辑；未登录 `/desk/*` 307 到 sign-in；公开博客 200 |
| sign-in/sign-up | App Router Clerk pages | Pages Router Clerk pages | 已废弃且有明确替代 | 先前 build-safe auth pages |
| NotionNext 文章路由 | my-blog 原有 | 保留 | 已迁移且验证通过 | `yarn build` 生成 article/archive/category/tag |

当前链路审计：

- 网页工作台：`/desk/today` → `/api/schedule/parse` → `/api/schedule/items` → Supabase `schedule_items`。
- 微信新入口：OpenClaw relay 应调用 `/api/schedule/capture`，该 API 写入同一张 Supabase `schedule_items`。
- 微信旧入口兼容：`/api/tasks/inbox/wechat` 已桥接到 `/api/schedule/capture`，避免继续写旧 tasks 表。
- 当前本机 OpenClaw 实际配置仍指向 `http://localhost:3010/api/schedule/capture`，来源插件目录仍是独立仓库 `law-tech`；因此未完成 my-blog Preview 的真实微信公网端到端验证。
- “学工活动进入阅读区域”的根因已确认：旧前端把 `item.links.length` 作为阅读判据；已改为 `contentType=reading` 或旧阅读标记，不再用链接数量判定。

尚未完成或需要人工操作：

- 线上 Supabase 如需实体列，需要执行 `lib/db/migrations/20260625_schedule_semantics.sql`；当前代码已通过 `ai_trace` 兼容未执行 migration 的环境。
- Vercel 需要同步新增环境变量：`SCHEDULE_AI_*`, `WECHAT_*`, `RESEND_*`, `REMINDER_*`, `CRON_SECRET`。
- `pages/api/notes` 的“读完后存为笔记草稿”未执行写入验证。
- 课程整理页在 law-tech 当前版本本身仍是页面壳；my-blog 里已有课程 worker API，尚未与新版工作台课程页合并。
- 真实微信公网端到端：需要把 OpenClaw `captureUrl` 从当前 local 3010 改到公开可访问的 Preview/Production URL 后再测；本轮没有切换生产。
