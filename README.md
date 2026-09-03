# Law-Tech

> 公开个人站点 + 私人认知工作台 + 内容与自动化控制面

- Production：<https://law-tech.dev>
- Repository：`Curacao914/my-blog`
- Runtime：Vercel + Supabase + Tencent OpenClaw
- Framework：Next.js 14 / React 18 / NotionNext compatibility

Law-Tech 已不再是单纯的 Notion 博客。它保留公开内容与旧文章兼容，同时建设 Today、Reading、Course、Writing、Content、Tools、System 等私人工作台，并通过微信/OpenClaw 提供自然语言控制入口。

当前第一产品主线是重建 **model-first 微信 AI Agent 控制平面**：模型负责理解自然语言、选择能力和解析上下文，代码负责读取真实对象、权限校验、安全执行和审计。不得继续以正则表达式作为主要意图分类器。

## 项目文档

| 文档 | 用途 |
|---|---|
| [`docs/project/README.md`](docs/project/README.md) | 文档索引、状态词汇和维护规则 |
| [`docs/project/PROJECT-OVERVIEW.md`](docs/project/PROJECT-OVERVIEW.md) | 产品定位、模块和技术边界 |
| [`docs/project/CURRENT-STATUS.md`](docs/project/CURRENT-STATUS.md) | 当前已验证事实、运行边界和 P0 风险 |
| [`docs/project/ROADMAP.md`](docs/project/ROADMAP.md) | 完整未来路线、优先级和明确暂缓项 |
| [`docs/project/AGENT-ARCHITECTURE.md`](docs/project/AGENT-ARCHITECTURE.md) | 微信 AI Agent 产品宪法与目标架构 |
| [`docs/project/DECISIONS.md`](docs/project/DECISIONS.md) | 已冻结的产品与架构决策 |
| [`docs/project/LESSONS-LEARNED.md`](docs/project/LESSONS-LEARNED.md) | 发布、脚本、运行和产品教训 |
| [`docs/project/OPERATIONS.md`](docs/project/OPERATIONS.md) | 环境、发布、变量、备份和一键包规范 |
| [`docs/project/PROJECT-LOG.md`](docs/project/PROJECT-LOG.md) | 重要 PR、发布、事故和阶段日志 |
| [`docs/project/HANDOFF.md`](docs/project/HANDOFF.md) | 新窗口/新维护者续接入口 |

## 开发原则

1. 不直接修改或 force-push `main`。
2. 代码存在、测试通过、Preview 成功、Production 上线和自然周期验收是不同证据等级。
3. 每次只完成一个可独立使用、可验收、可回滚的闭环。
4. 生产发布必须保留 exact SHA、备份、回滚锚点和 smoke 证据。
5. 模型不得直接执行 SQL；所有写入必须落到真实对象 ID，并通过受控工具执行。
6. 紧急精确时刻提醒继续使用 iOS 提醒事项；Law-Tech 不新增精确到点的微信提醒功能。
7. 任何改变项目状态、路线、架构或运维流程的 PR，必须同步更新对应项目文档。

## Upstream

本项目基于 [NotionNext](https://github.com/tangly1024/NotionNext) 演进，并继续保留其必要的公开博客兼容能力。原项目与第三方依赖的许可证继续适用。
