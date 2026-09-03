# Law-Tech 分支与发布模型

更新时间：2026-07-01

## 目标架构

- `law-tech.dev` 的入口是新的 Law-Tech 公共首页与私人工作台。
- 原 NotionNext 博客作为兼容内容层保留，通过“个人博客”入口、旧文章路由和必要的阅读跳转继续访问。
- 课程自动化属于 Law-Tech 本体，不再作为独立产品线维护。
- GitHub Actions 的计划任务定义必须存在于默认分支；Worker 可以在发布前过渡性 checkout 经审核的集成分支。

## 分支职责

| 分支 | 职责 | 当前规则 |
| --- | --- | --- |
| `main` | Production、默认分支、计划任务发现入口 | 禁止直接开发、禁止 force-push；发布前必须备份、Preview 验收和回滚计划 |
| `codex/law-tech-integration-v1` | 唯一日常集成主线 | 新网页、旧博客兼容层、课程自动化和运维文档均在此收束 |
| `codex/homepage-phase1` | Preview 兼容别名 | 在 Vercel 改绑前仅由集成主线快进同步，不再独立开发 |
| `codex/course-worker-v009c` | Worker 运行兼容别名 | 在默认分支 Workflow 完成正式切换前仅由集成主线快进同步 |
| `codex/final-openclaw-automation-v1` | 冻结回滚快照 | 保持在 `d8b9701a8dfb...`，不得跟随日常开发移动 |

## 发布门禁

1. 工作区干净，远端 SHA 与审计基线一致。
2. 创建本地 Git bundle 和远端只读 archive 分支。
3. 完整 Jest、OpenClaw Relay 测试、课程核心测试和 Next.js build 全部通过。
4. Preview 验收公开首页、个人博客入口、旧文章、登录、Today、Reading、Courses、Writing 和 System。
5. 记录 Supabase schema、迁移 ledger、备份点与恢复方式。
6. 课程最终调度版本至少完成一次自然完整周期；历史简报补齐不得替代历史失败课次核验。
7. 发布需单独批准；本集成闭环不更新 `main`。

## 回滚

- 代码：保留发布前 SHA、Git bundle、archive 分支和 Vercel 前一部署。
- 数据库：先恢复兼容代码，再按已验证备份恢复；不得凭 migration 文件存在推定数据库可回滚。
- Worker：默认分支 Workflow 可临时继续 checkout 冻结的 `codex/final-openclaw-automation-v1`。
- OpenClaw：服务器迁移稳定前保留 Mac 配置，但任一时刻只能有一个 outbound consumer。
