# 当前状态

> 核验日期：2026-07-04
> 运行事实会变化；交接前必须重新执行本页“实时核验”命令。

## 已验证功能基线

文档治理 PR 之前的功能基线：

```text
6382b37a6d91c49be96861b4b29a6a39d85a3784
```

该 commit 是 PR #7 `fix: normalize OpenClaw relay base URL` 的 merge commit。这里记录的是不可变的功能基线，不把它永久称为“当前 main”。

## 重要 PR 记录

| PR | 标题 | Merge commit | 结果 |
|---|---|---|---|
| #1 | release: publish Law-Tech integration baseline | `5d103ded1ab9c332684b3e137141af105178063c` | 整合基线与 Production DB repair |
| #2 | fix: harden Notion sync and workspace loading | `215f7d0f4d0066a585d1894fb17e7c93176e86f4` | Notion/工作台 Production hardening |
| #3 | feat: release WeChat commands, reminders, and workbench queries | `c7098e1ebaf40db19e980f3f5833a2603185e8c1` | 微信命令、查询、简报已读和提醒基础 |
| #4 | fix: harden WeChat context and mobile course briefs | `3e836446dbce9d1673a171433fe1981e81019ee5` | 上下文、相对时间和移动简报 |
| #5 | fix: add semantic write gates for WeChat commands | `6e6ba5f0fd1a199b2636e5c706c4847f0be0080f` | 语义写入门禁和 outbound 过滤代码 |
| #6 | fix: unify OpenClaw unknown intent handling | `5e822604ff579356e3de621470d360fd30fdd5fa` | unknown/create 策略统一 |
| #7 | fix: normalize OpenClaw relay base URL | `6382b37a6d91c49be96861b4b29a6a39d85a3784` | capture URL 基础域规范化 |
| #8 | docs: establish Law-Tech project governance | `85dfb514d9db5ae930b87b0f72b4124fad4b2ce7` | `docs/project` 已进入 main |
| #9 | ci: make Docker required check fast and deterministic | `6db4e8a8e4b216f95b1b5f330905a084929ae78d` | 文档 fast-success、BuildKit cache、静态预取 skip |
| #10 | ci: decouple required validation from GHCR publishing | `f5f96ca71ead7c70606933ee1095f725630fe7ca` | required validation 与镜像发布解耦 |
| #11 | docs: record Docker CI closure | `f016e0d2b65c32c4c858dad1e0496937bec81107` | 记录 CI 闭环 |
| #12 | feat: add model-first Agent and cut Docker build time | `9163826c3a78fa1254683c7682286a528a8ce280` | Agent 真实微信验收失败；CI 降时部分保留 |
| #13 | docs: record Agent rollback and v2 governance | `cd963867682ea388cb45aa30687631a235288c62` | v1 回退、治理与实时审计闭环 |

## Production 与数据库

- Production：`https://law-tech.dev`；
- Vercel project：`curacaos-projects/curacao-top`；
- 当前 GitHub main：`cd963867682ea388cb45aa30687631a235288c62`；
- exact-main Production deployment：`dpl_G6rgPZh2QM3Lh5hUhbrEUawsToMH` Ready，首页 HTTP 200；
- 2026-07-04 已在 Production 新增 `OPENCLAW_AGENT_V1_ENABLED=false` 并从该 main commit 重新部署；deployment `dpl_3DRvnp53MBjXdECgRd6nx87WVRCS` 为 Ready，`law-tech.dev` alias 已指向该 deployment；
- 首页 HTTP 200；真实微信已完成 legacy 查询以及可清理事项的创建/删除验收，v1 help 错路由未再接管；
- Production Supabase ref：`htbbkcxevcouwehpugwc`；
- 7 列 schedule semantics additive repair 已完成隔离恢复、隔离验收和 Production 执行；
- migration ledger 已建立；
- 不伪造历史 migration 执行记录；
- `openclaw_conversation_states`、`course_brief_reads`、`message_deliveries` 等对象已进入真实链路；
- 两账号隔离有真实测试，但仍需持续做 guessed-ID、RLS 和导出/删除审计。
- 2026-07-04 通过已认证 Supabase CLI 和只读 REST 完成 Production live audit：项目为 `ACTIVE_HEALTHY`；`profiles` 3、`schedule_items` 70、`openclaw_conversation_states` 3、`course_brief_reads` 1、`message_deliveries` 20、`course_jobs` 7，六表均存在且可读；未输出密钥、未执行写入。

## 腾讯云 / OpenClaw

服务器：`ubuntu@124.222.111.108`。

2026-07-04 已重新完成 SSH 与只读运行核验：登录用户 `ubuntu`、主机 `VM-0-6-ubuntu`；三个 user-level services 均为 `active/running`、`ExecMainStatus=0`，Gateway `readyz` 返回 `ready=true`。本次未重启或修改服务。

```text
OpenClaw binary: /home/ubuntu/.local/bin/openclaw
OpenClaw home: /home/ubuntu/.openclaw-candidate
Relay root: /home/ubuntu/law-tech-runtime/integrations/openclaw/law-tech-wechat-relay
```

服务是 user-level systemd：

```text
openclaw-gateway.service
law-tech-cloudflared.service
law-tech-wechat-relay.service
```

必须使用 `systemctl --user` 和 `journalctl --user`。Gateway readyz：`http://127.0.0.1:18789/readyz`。

当前边界：

- 核心 Gateway / Cloudflared / Relay 已迁到腾讯云，不再完全依赖 Mac；
- 新的 inbound/self/assistant/system 过滤已应用并通过服务重载；
- 网站代码包含 PR #7；
- 腾讯 runtime 的完整 `local-runner/base-url` 包尚未完成最终落地；
- 独立 CLI 与 Gateway 的 Weixin 插件加载上下文仍需单独闭环；
- 该支线不得继续阻塞 Agent 产品重构。

## 微信 Agent

已有：

- 入站鉴权、sender 限制、messageId 幂等；
- Today、待读、未读课程简报等查询基础；
- 课程简报独立已读状态；
- 对话状态入库；
- outbound/self/assistant/system 消息过滤。

PR #12 曾将 Production 默认切入一次模型直接选择 capability 的 Agent。真实微信发送明确日程创建请求时，模型错误选择 `agent.help`，系统返回能力说明且未创建日程。该失败证明“合法 RoutePlan”不等于“语义正确的执行授权”。

真实失败样例：

```text
未读课程简报已全部读完
国际法6月3号的笔记读完了
```

因此 PR #12 Agent 已停止扩展并通过 Production feature flag 回退。下一主线是两阶段语义架构：模型只生成不含 capability/tool/risk 的 `UserIntent`，确定性 Planner、Semantic Gate、真实 Resource 和 Risk Policy 再生成并授权 RoutePlan。不得继续修补 v1 Router，也不得回到正则分类器补词。

历史误创建 Reading `未读课程简报已全部读完` 尚未删除，应在新 Agent 真机验收后独立备份、唯一性校验并清理。

## 课程自动化

- 课程全链路已有代码闭环和真实成功记录；
- 历史课程简报已有补齐；
- 最终调度版本仍需等待一次自然完整周期；
- workflow_dispatch、手工补跑和历史成功不能代替自然周期证据；
- 历史 `needs_attention/failed` 仍需逐项处理；
- 历史简报补齐不等于所有旧失败课程已经修复。

## 当前 P0

1. 完整交付 Agent Studio + Evaluation Kernel，未完成不得开始 Shadow Runtime；
2. 完整交付 default-off、无写入的 Production Shadow Runtime，并等待严格自然样本门禁；
3. 等待课程最终调度版本自然完整周期；
4. 完成腾讯云迁移后的备份、日志、heartbeat、单实例与恢复硬化。

## 实时核验

```bash
cd "/Users/curacao/Script/个人主页/my-blog-clean"
git fetch origin --prune --tags
git rev-parse origin/main
curl -fsSL 'https://api.github.com/repos/Curacao914/my-blog/pulls?state=open&per_page=100'
curl -fsSL 'https://api.github.com/repos/Curacao914/my-blog/branches/main'
vercel inspect https://law-tech.dev
curl -fsS https://law-tech.dev/ >/dev/null
ssh -i "$HOME/.ssh/lawtech-tencent" ubuntu@124.222.111.108   'systemctl --user is-active openclaw-gateway.service law-tech-cloudflared.service law-tech-wechat-relay.service; curl -fsS http://127.0.0.1:18789/readyz'
```


## CI / Docker 独立闭环（已合并）

- Docker job/check 名称仍为 `build`；不使用 workflow-level `paths-ignore`。
- 纯文档 PR 在同一 `build` job 内快速成功；未知或代码路径默认执行 Docker build。
- Docker 构建使用 BuildKit GHA cache，并启用 concurrency cancel-in-progress。
- 无数据库 Docker 构建显式传入 `LAW_TECH_STATIC_PREFETCH_MODE=skip`，立即跳过 Notion 与数据库静态预取。
- CI PR #9 已合并，merge commit：`6db4e8a8e4b216f95b1b5f330905a084929ae78d`；纠正 PR #10 已将 required PR/main validation 与 GHCR 发布解耦，merge commit：`f5f96ca71ead7c70606933ee1095f725630fe7ca`；corrected main 验收锚点：`f5f96ca71ead7c70606933ee1095f725630fe7ca`。
- docs-only 验证 commit：`08a24bce38034bcd05072ec279369a0bce6f30e9`；同名 `build` check 成功，运行 13.0 秒。
- 项目治理 PR #8 merge anchor：`85dfb514d9db5ae930b87b0f72b4124fad4b2ce7`。
- GitHub `main` 已于 2026-07-04 恢复 branch protection：必须经 PR，required check 为 `build`，管理员同样受约束，禁止 force-push/deletion，并要求解决 review conversations。


## CI / Docker 构建降时第二阶段（本 PR）

- PR #9 的代码 Docker `build` 基线为约 2434 秒，双架构冷构建不可接受；
- 普通代码 PR 只在 GitHub 原生 runner 上验证 `linux/amd64`，不再为每个 PR 模拟 arm64；
- main 普通提交只验证原生 amd64，不发布镜像；版本标签或显式 `workflow_dispatch publish=true` 才发布，multiarch 仅用于显式双架构发布；
- 保留同名 required `build`、纯文档 fast-success、无数据库静态预取和架构分离缓存；
- PR/main 的 `build` 目标为 600 秒内，900 秒为拒绝合并的硬上限；实际耗时必须由 exact-SHA check 记录。


## PR #12 Agent 事故与回退

- v1 代码、测试和 CI 存在，Production 也曾部署；真实微信产品验收失败。
- 根因是模型直接选择 capability，而校验层只验证格式、枚举和注册状态；`agent.help` 在 Resource/Policy 前即可返回。
- 2026-07-04 已设置 Production-only feature flag 为 false 并完成 Ready redeploy；真实微信 legacy 查询和可清理事项创建/删除均已通过。
- v1 代码和 PR #12 保留为失败证据，不继续追加提示词、关键词或同义词规则。
- Agent Studio 与评估内核已由 PR #14 合并；当前独立代码闭环是 default-off Shadow Runtime。

## Agent Studio + Evaluation Kernel（PR #14 已合并）

- 分支：`codex/agent-studio-v1-20260704`，基于 exact main `cd963867682ea388cb45aa30687631a235288c62`；
- 已实现 UserIntent、RoutePlan、CapabilityCard、Resource、Tool、QuerySpec、MutationSpec、SessionState、RiskPolicy 与 ToolResult v2 校验；模型输出禁止 capability/tool/risk/SQL；
- 已实现固定安全拓扑的 owner-only Studio、Preview/Production 配置隔离、不可变版本、diff、评估、发布与回滚；没有自由 system prompt、SQL 或任意代码节点入口；
- 数据库仅新增 `openclaw_agent_configs`、`openclaw_agent_eval_cases`、`openclaw_agent_eval_runs`，不修改微信入口或 Schedule/Reading/Course 业务表；
- 固定集为 150 条：Schedule、Reading、Course、上下文/ASR/复合句、安全干扰各 30 条；45 条为 holdout，UI/API 不返回 case expectation；
- 隔离 Supabase `ldciqxzczwpuhhgeinmc` 已真实应用 migration；三表 RLS、单 published 唯一索引、评估发布门禁、published 不可变和 rollback 新版本均通过事务验收，测试数据回滚为 0；Production 数据库未应用该 migration；
- PR #14：https://github.com/Curacao914/my-blog/pull/14；2026-07-05 合并，merge commit `9042a93641da292150040bd7ef933ec802be0599`；
- Agent Studio 定向测试、v1 回归、增量 ESLint、`git diff --check` 与 Production build 已通过；构建中无数据库/Notion 的既有 fallback 日志不属于本 PR 回归；
- Vercel Preview 的 `SUPABASE_URL` 与 service key 已从共享配置拆分为 Preview-only 覆盖，指向隔离项目 `ldciqxzczwpuhhgeinmc`；Production 作用域未修改；
- 评估已改为每批 24 条的可恢复账本协议；真实中断后从 24/150 续跑至 150/150，避免长 HTTP 请求留下不可恢复状态；
- 模型输出不再依赖软 JSON 提示：DeepSeek `/beta` strict Function Schema、`thinking=disabled`、强制唯一 `emit_user_intent` 序列化函数；字段/枚举/额外属性由 provider 约束，长度与跨字段一致性由代码再次校验，content-only JSON 明确拒绝；
- strict Flash 完整评估为总体 74.67%、意图 52%、安全 97.33%、USD 0.037189；strict Pro 为总体 75.67%、意图 52%、安全 99.33%、USD 0.116434。两者均被 UI/API/数据库发布门禁拒绝，未产生 published 配置；不再为失败原句追加生产提示词；
- 严格序列化把 Flash 非 JSON 错误从 32 降到 2；剩余主要是 action/domain/object/scope 语义分类，进入 Planner/Semantic Gate 与模型能力主线。development 规则离线模拟未改善 holdout，因此未写入生产代码；
- Production migration 尚未应用；两次备份尝试均停在 Supabase Management API 临时登录角色初始化，0B 文件不作为备份，未执行数据库写入。

## Agent v2 Shadow Runtime（Draft PR #15）

- 分支 `codex/agent-v2-shadow-20260705` 基于 exact main `9042a93641da292150040bd7ef933ec802be0599`；Draft PR：https://github.com/Curacao914/my-blog/pull/15；
- 共享 strict Function Schema Interpreter；代码生成 Capability Card、RoutePlan 与 QuerySpec，并由 Semantic Gate、真实只读 Resource 和实体解析器约束；
- confirm、cancel 和已存在结果集的序号选择使用零模型 Session Control 协议；普通自然语言仍由模型理解，不回退到 legacy 正则写入；
- `OPENCLAW_AGENT_V2_SHADOW_ENABLED` 未显式为 true 时关闭；Shadow 使用 `waitUntil`，不回复、不导入 Tool、不改变 legacy 结果；
- 新增独立 trace migration：原文与 legacy 回复 AES-256-GCM 加密，sender/thread/message 标识哈希化，30 天到期清理；不修改业务表；
- 5 个定向 suites / 43 tests、`git diff --check` 和静态预取 skip build 通过；Production migration、Preview、Production Shadow 与真实微信 Shadow 均尚未验收。
