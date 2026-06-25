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
| 今日 | `app/(desk)/desk/today/page.jsx`, `components/TodayBoard.jsx` | `pages/desk/today/index.js`, `components/TodayBoard.js` | 已迁移且验证通过 | 页面构建；API 读写验证 |
| 阅读箱 | `app/(desk)/desk/reading/page.jsx`, `components/ReadingBox.jsx` | `pages/desk/reading/index.js`, `components/ReadingBox.js` | 已迁移且验证通过 | 页面构建；`/api/schedule/items` 读到阅读项 |
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
| 微信 capture API | `app/api/schedule/capture/route.js` | `pages/api/schedule/capture.js` | 已迁移且验证通过 | OpenClaw 文本写入阅读项 200 |
| 阅读笔记 API | `app/api/notes/route.js` | `pages/api/notes/index.js` | 已迁移但未完整验证 | 构建通过；未执行笔记草稿写入 |
| 提醒 Cron API | `app/api/reminders/run/route.js` | `pages/api/reminders/run.js` | 已迁移且验证通过 | token 调用 200，count 0 |
| 日程领域模型 | `lib/domain/schedule.js` | `lib/domain/schedule.js` | 已迁移且验证通过 | API 读写使用 |
| 日程上下文选择 | `lib/domain/schedule-context.js` | `lib/domain/schedule-context.js` | 已迁移且验证通过 | capture 修改上下文可用 |
| 提醒规则 | `lib/domain/reminders.js` | `lib/domain/reminders.js` | 已迁移且验证通过 | 写入口会同步 reminders |
| Supabase 服务层 | `lib/server/supabase.js` | `lib/server/supabase.js` | 已迁移且适配 Pages Router | REST 方式验证 |
| 提醒服务层 | `lib/server/reminders.js` | `lib/server/reminders.js` | 已迁移且适配 REST | Cron 200 |
| 数据库 schema | `lib/db/schema.sql` | `lib/db/schema.sql` | 已迁移但需线上手动执行 | 本地构建通过；SQL 未自动写入线上 |
| 数据库 migrations | `lib/db/migrations/*.sql` | `lib/db/migrations/*.sql` | 已迁移但需线上手动执行 | 文件迁移 |
| OpenClaw relay | `integrations/openclaw/law-tech-wechat-relay` | 同路径 | 已迁移且验证通过 | `node --test` 4 passed |
| OpenClaw 文档 | `docs/integrations/openclaw-wechat.md` | 同路径 | 已迁移 | 文件迁移 |
| 产品文档 | `docs/product-architecture.md`, `docs/product-constraints.md` | 同路径 | 已迁移 | 文件迁移 |
| 静态头像 | `public/avatar.png` | `public/avatar.png` | 已迁移且验证通过 | 首页构建 |
| Cron 配置 | `vercel.json` | `vercel.json` | 已迁移且验证通过 | build route includes `/api/reminders/run` |
| 环境变量样例 | `.env.example` | `.env.example` | 已迁移 | 文件迁移 |
| Clerk middleware | `middleware.js` | `middleware.ts` | 已废弃且有明确替代 | my-blog 保留 NotionNext middleware；API 使用 owner fallback/token |
| sign-in/sign-up | App Router Clerk pages | Pages Router Clerk pages | 已废弃且有明确替代 | 先前 build-safe auth pages |
| NotionNext 文章路由 | my-blog 原有 | 保留 | 已迁移且验证通过 | `yarn build` 生成 article/archive/category/tag |

尚未完成或需要人工操作：

- 线上 Supabase 需要执行 `lib/db/schema.sql` 中新增的 law-tech workspace schema。
- Vercel 需要同步新增环境变量：`SCHEDULE_AI_*`, `WECHAT_*`, `RESEND_*`, `REMINDER_*`, `CRON_SECRET`。
- `pages/api/notes` 的“读完后存为笔记草稿”未执行写入验证。
- 课程整理页在 law-tech 当前版本本身仍是页面壳；my-blog 里已有课程 worker API，尚未与新版工作台课程页合并。
- 工作台 API 当前用 owner fallback 保证迁移链路可用；严格登录隔离需要后续把 Clerk middleware 与 NotionNext 兼容层重新合并验证。
