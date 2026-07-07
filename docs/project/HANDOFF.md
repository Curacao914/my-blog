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

PR #12 回退与治理闭环已由 PR #13 合并；Agent Studio 已由 PR #14 合并；default-off Shadow Runtime 已由 PR #15 合并并部署。当前只推进评估语义收敛与 published profile，不开始 Canary。

截至 2026-07-05：

- GitHub main 为 `b9110b1b17886f226b6d1ca9f97fbe3c79fa884f`；
- Production rollback redeploy `dpl_3DRvnp53MBjXdECgRd6nx87WVRCS` Ready，`OPENCLAW_AGENT_V1_ENABLED` 已在 Production 添加为 false；
- 当前 exact-main deployment `dpl_3RU5GHSpzEPZrBAvDyZGYR4L6dHJ` Ready；Preview/Production Supabase 凭据已拆为四条单环境变量，腾讯端 authenticated command 查询 HTTP 200 / 7 条结果；
- 真实微信 legacy 查询及可清理事项创建/删除已通过；
- main 已恢复保护：必须经 PR，required check 为 `build`，禁止 force-push/deletion；
- Supabase Production 已完成只读 live audit，项目 healthy，六个关键表均存在且可读；
- 腾讯云 SSH 已恢复，三个 user services active/running，readyz 为 true。

PR #14 已以 merge commit `9042a93641da292150040bd7ef933ec802be0599` 进入 main；PR #15 已以 merge commit `b9110b1b17886f226b6d1ca9f97fbe3c79fa884f` 进入 main。Production Studio/Shadow additive migrations 均在备份后应用，Shadow flag 显式为 false。Preview/Production 的 Supabase URL/service role 已从 Vercel 共用项彻底拆分；修复后腾讯端 authenticated 查询 HTTP 200 / 7 条，审计会话已清理，trace 为 0。strict Flash/Pro 仍未达发布门禁，因此没有 published profile，Shadow 尚未运行。下一步不是给失败原句添提示词，而是继续收敛严格 schema、ontology 与代码所有的语义映射，重跑 development + holdout 达标后才能 publish 并开启 Shadow。

禁止从补正则或修补 PR #12 Router 开始。实施顺序固定为：

1. 完整 Agent Studio + Evaluation Kernel；
2. 完整 default-off Production Shadow；
3. 严格自然样本门禁后的只读 Canary；
4. 单条可逆写 Canary；
5. matching/all_unread、上下文修改与 destructive confirmation。

模型只生成 UserIntent；确定性 Planner 与 Semantic Gate 生成并授权 RoutePlan。失败样例进入评估集，不进入 Production prompt 当个例补丁。

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

## PR #17 交接补充

当前开放 PR 为 #17 `feat: compile model semantics into UserIntent`。该 PR 不开启 Canary，不发布 profile，不改变 Production Shadow flag。它只收紧解释层边界：模型输出 `ModelIntentFrame v1`，代码编译最终 `UserIntent v2`。继续推进时不得把失败原句塞入生产 prompt，也不得回到 regex/关键词补丁。合并前必须完成 Preview 真实模型 development + holdout 评估；未达 overall ≥ 98% 且 safety = 100% 时保持 Draft。
