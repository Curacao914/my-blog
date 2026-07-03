# Law-Tech 项目文档

本目录是 Law-Tech 的长期项目管理入口。它用于维护产品定义、当前事实、路线、架构决策、运行经验和交接状态，不能被当作一次性聊天总结。

## 事实优先级

当文档、聊天或旧交接发生冲突时，按以下顺序判断：

1. 真实 Git / GitHub PR 与 commit；
2. Vercel exact deployment、Supabase 结构与数据、腾讯云服务和真实 E2E；
3. 本目录中标有核验日期的文档；
4. 更早的 migration matrix、handoff 和聊天结论。

任何文件中出现“当前 main”“已经上线”“全部完成”等表述，都必须附核验时间和证据范围。优先记录不可变的 PR/commit，而不是长期维护一个会在下一次合并后立刻过时的“当前 SHA”。

## 文档地图

- `PROJECT-OVERVIEW.md`：稳定的产品定位、模块和技术边界。
- `CURRENT-STATUS.md`：当前已核验事实、运行差异、P0 风险与下一主线。
- `ROADMAP.md`：按优先级维护未来规划和明确不做的内容。
- `AGENT-ARCHITECTURE.md`：微信 Agent 冻结的产品宪法与目标架构。
- `DECISIONS.md`：长期有效的产品/技术决策，采用简化 ADR 格式。
- `LESSONS-LEARNED.md`：事故、失败模式和强制规避规则。
- `OPERATIONS.md`：环境、变量、发布、备份、一键包与回滚标准。
- `PROJECT-LOG.md`：重要日期、PR、部署、事故和真实验收日志。
- `HANDOFF.md`：新窗口、新维护者和 AI 接手时的阅读顺序与启动要求。
- `CURRENT-STATE.json`：给脚本或 AI 使用的机器可读事实快照。

## 状态词汇

不得把以下状态混写：

- `Code exists`：代码存在。
- `Unit tested`：自动化测试通过。
- `Build verified`：相关 production build 通过。
- `Preview verified`：Preview 的真实路径通过。
- `Production deployed`：exact commit 已部署到 Production。
- `Production E2E verified`：真实用户路径完整验收。
- `Natural-cycle verified`：必须等待真实调度/自然事件的链路已经自然完成。

## PR 与文档同步规则

每个 PR 都必须判断文档影响：

| 变化 | 必须更新 |
|---|---|
| Production、数据库、腾讯云、课程或微信状态改变 | `CURRENT-STATUS.md`、`PROJECT-LOG.md`、`CURRENT-STATE.json` |
| 优先级、范围或未来功能改变 | `ROADMAP.md` |
| 产品原则、接口或架构改变 | `DECISIONS.md`；必要时更新 `AGENT-ARCHITECTURE.md` |
| 事故、脚本失败或新的规避规则 | `LESSONS-LEARNED.md`、`OPERATIONS.md` |
| 新的接手边界或重要未完成项 | `HANDOFF.md` |

若 PR 不需要更新文档，必须在 PR 模板中说明理由。合并后如需记录 merge commit，应使用同一发布闭环中的文档提交或紧随其后的 docs-only PR；禁止让交接文档长期引用“待合并”的状态。

## 维护节奏

- 每次功能/修复 PR：同步检查文档影响。
- 每次 Production 发布：更新状态与日志。
- 每次事故：记录根因、影响、回滚和强制规避。
- 每个大阶段结束：压缩已完成项，重排路线，不删除历史日志。
- 旧文档不再作为事实源时，必须在顶部标记 historical，而不是悄悄遗弃。
