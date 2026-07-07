# Agent v2 Intent Compiler

> 状态日期：2026-07-07。本文记录 PR #17 `feat: compile model semantics into UserIntent` 的独立闭环边界。

## 背景

PR #13 已完成 PR #12 真实微信失败后的 feature-flag 回退与治理记录；PR #14 已交付 Agent Studio + Evaluation Kernel；PR #15 已交付 default-off Shadow Runtime；PR #16 已记录 Production Studio/Shadow migration、Shadow flag-off deployment、腾讯端 authenticated 查询恢复，以及 Preview/Production Supabase 凭据拆分。

Studio 真实模型评估仍未达到发布门槛。strict Flash/Pro 均被发布门禁拒绝，主要失败集中在 action、domain、object 和 scope 的语义分类。下一步不能把失败原句追加到生产 prompt，也不能回到正则/关键词补丁，而应继续把模型输出收窄为语义证据，并由代码编译稳定路由字段。

## PR #17 边界

PR #17 基于 main `7844aa3eef9b5267b9c010707571af8b73e29865`，分支为 `codex/agent-v2-intent-compiler-20260706`。

允许修改范围：

- `lib/openclaw/agent-v2/contracts.js`；
- `lib/openclaw/agent-v2/interpreter.js`；
- `lib/openclaw/agent-v2/intentCompiler.js`；
- `lib/openclaw/agent-v2/entityResolver.js`；
- 对应 Agent v2 单元测试；
- `docs/project/*` 项目文档。

不修改范围：

- 微信 command 入口；
- legacy classifier；
- PR #12 v1 Router；
- Schedule、Reading、Course 业务表；
- Tool 执行器；
- Production feature flag；
- Supabase migration；
- 腾讯云服务。

## 设计收敛

本 PR 将模型输出从完整 `UserIntent v2` 改为 `ModelIntentFrame v1`。模型仍负责自然语言理解，但不能直接输出以下字段：

- `domain`；
- `scope`；
- `intentId`；
- `capability` / `tool` / `risk` / `authorization`；
- SQL 或 QuerySpec / MutationSpec；
- confirm、cancel、select 等会话控制 action。

模型只输出：

- `operation`；
- `objectType`；
- `quantity`；
- `lookup`；
- `collectionState`；
- slots / contextReferences / uncertainties。

代码随后通过 `intentCompiler` 派生：

- `intentId`：由 messageId 或随机种子哈希生成；
- `domain`：由 objectType 映射；
- `scope`：由 operation、quantity、lookup、collectionState 编译；
- `read_state=unread`：由 collectionState 规范化为 Resource filter slot。

这一步继续把“模型理解”和“执行授权”拆开。模型可以理解语义，但不能决定 capability、risk、tool、SQL、session control，也不能直接控制最终路由 scope。

## 已验证的代码事实

- `MODEL_INTENT_FRAME_JSON_SCHEMA` 使用 strict Function Schema；
- provider 仍使用 DeepSeek `/beta/chat/completions`、`thinking=disabled`、强制唯一 `emit_intent_frame`；
- `validateModelIntentFrame` 拒绝 capability、tool、SQL、risk、authorization 等字段；
- `compileModelIntentFrame` 拒绝不一致 cardinality，例如 create + many；
- `mark_read` 只允许 `course_brief`；
- `course_brief` + `quantity=all` + `collectionState=unread` 才能进入 `all_unread`；
- filtered unread collection 不会被自动升级为 `all_unread`；
- confirm、cancel、ordinal session control 仍保持零模型调用。

## 2026-07-07 Preview 评估结果

PR #17 Preview 已完成一轮真实模型评估，结果为 150 条样本、overall 76.3%、safety 96.7%、status failed。失败聚合为 `intent_mismatch × 66`、`model_error × 5`、`unsafe_write × 4`，代表错误包括 `latest lookup quantity must be one`。

结论：PR #17 仍不合格，继续保持 Draft。不得发布 profile，不得合并，不得开启 Shadow。下一独立闭环改为 owner-only 失败明细查看/导出，用于定位 action/domain/objectType/scope/executionAllowed 的具体错位，避免回到正则补丁或失败样例 prompt。

## 2026-07-07 失败明细诊断与合并修正

失败明细导出 run `dabec3ca-7402-41ed-9bb5-4cbff4940bc3` 后，PR #17 的真实模型评估仍为 150 条样本、overall 76.33%、intent 56%、safety 96.67%、status failed，失败 67 条。失败分布显示主要裂缝集中在 `scope` 编译，其次是少量 session-control、state-only/hypothetical 语气与 course/course_brief 本体区分。

本次修正仍保持 PR #17 的核心边界：模型不输出 domain/scope/intentId/capability/tool/risk/SQL/session-control。修正集中在代码层：

- `intentCompiler` 将 identity-bearing slots（title/query/course_name/teacher_name）优先编译为 `matching`，避免 named target 被误压成 `single`；
- `course_brief` 的未读集合读取在无身份限定时编译为 `all_unread`，但带教师/课程/标题限定时保持 `matching`；
- `latest + many/all` 不再直接抛出 cardinality 错误，而是落回集合读取；
- hypothetical/state_only 语言态和 `mark_read + read` 二级动作优先降级为安全读取；
- 评估 harness 为 select/cancel/confirm fixed cases 注入最小 session state，使这些会话控制继续走零模型 deterministic path，而不是把 forbidden operations 放回模型 schema；
- read + help secondary action 被视为非写入，不再误判为 execution blocked。

本次修正仍不发布 profile、不合并 PR、不开启 Shadow。下一步必须在新的 PR #17 Preview exact head 上重跑完整 150 条真实模型评估，并以 exported failure detail 决定是否还需要 ontology 修正。

## 合并前门禁

PR #17 当前仍保持 Draft。合并前必须完成：

1. PR exact head 的 GitHub checks 成功；
2. Vercel Preview Ready；
3. Preview 真实模型 development + holdout 评估重跑；
4. 若未达 overall ≥ 98% 且 safety = 100%，继续保持 Draft，不发布 profile，不开启 Shadow；
5. 若达到门槛，更新 `CURRENT-STATUS.md`、`CURRENT-STATE.json`、`PROJECT-LOG.md` 与本文，再 Mark ready；
6. 仅在 PR 通过 required check 且文档记录清楚后合并；
7. 合并后仍不自动开启 Production Shadow，必须另按 published profile 与 flag 流程推进。

## 非目标

- 不给生产 prompt 塞失败样例；
- 不回到正则/关键词补丁；
- 不让模型直接选择 capability；
- 不让模型生成或执行自由 SQL；
- 不改变 legacy 微信回复；
- 不新增精确到点微信提醒。
