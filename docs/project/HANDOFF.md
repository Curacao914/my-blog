# 续接与交接

## 阅读顺序

新窗口、新维护者或新的 AI 对话必须按顺序阅读：

1. `docs/project/README.md`；
2. `docs/project/CURRENT-STATUS.md`；
3. `docs/project/PROJECT-OVERVIEW.md`；
4. `docs/project/AGENT-ARCHITECTURE.md`；
5. `docs/project/ROADMAP.md`；
6. `docs/project/DECISIONS.md`；
7. `docs/project/LESSONS-LEARNED.md`；
8. `docs/project/OPERATIONS.md`；
9. `docs/project/PROJECT-LOG.md`；
10. `docs/project/CURRENT-STATE.json`。

## 接手第一步

不要立即改代码。先核验：

- origin/main 和开放 PR；
- Vercel exact Production；
- Supabase schema、关键表和数据；
- 腾讯云三个 user services 与 readyz；
- 当前本地工作区；
- 文档与现实的差异。

先输出：

- 当前 Git / Production / Database / Tencent 事实；
- P0 风险；
- 文档过时项；
- 当前唯一主线；
- 下一独立 PR 的文件边界、验收和明确不做。

## 当前唯一主线

按照 `AGENT-ARCHITECTURE.md` 重建 Schedule / Reading / Course 的 model-first 控制平面。

禁止从补正则开始。第一阶段应包括：

- Router；
- Capability Registry；
- Resource / Tool；
- 实体解析；
- 课程简报 single/matching/all_unread；
- 基础结构化上下文；
- 风险策略；
- trace 和评估；
- Preview 与真机验收。

## 同时保留的等待线

- 课程最终 scheduler 的自然完整周期；
- 历史失败课程清理；
- 腾讯云迁移后硬化；
- CI 优化；
- 数据治理。

这些不能混入 Agent 第一 PR。

## 硬性约束

1. 不直接修改或 force-push main；
2. 不新增精确到点微信提醒；
3. 模型不得直接 SQL；
4. 不能把代码/测试/Preview/Production/自然周期混称完成；
5. 每次只完成一个可使用、可验收、可回滚闭环；
6. 用户本地运行一键包，不要求粘贴 secret；
7. 临时解压放 `/tmp`，审计和备份放 Documents，不放 Desktop；
8. macOS Bash 3.2 兼容；
9. 腾讯服务使用 `systemctl --user`；
10. 失败后 narrow resume，不盲目重跑；
11. 历史误创建 Reading 在 Agent 验收后单独清理；
12. 任何 Git/PR/Production 状态变化同步更新项目文档。

## 新对话开场模板

```text
请接手 law-tech.dev / Curacao914/my-blog。

先完整阅读 docs/project，不要立即改代码，也不要相信旧交接中的“当前状态”。先以 Git、GitHub PR、Vercel、Supabase、腾讯云 user systemd 和真实验收为准。

当前第一主线是按照 AGENT-ARCHITECTURE.md 重建 model-first 微信自然语言控制平面，不再给旧正则分类器补词。

请先输出：当前事实、文档差异、P0 风险、现有代码到目标架构的差距、稳定接口草案、第一独立 PR 的精确边界和验收矩阵。
```
