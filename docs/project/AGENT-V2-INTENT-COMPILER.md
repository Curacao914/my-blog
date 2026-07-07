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
