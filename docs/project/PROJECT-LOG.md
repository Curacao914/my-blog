# 项目日志

本日志只记录重要阶段、PR、Production、事故和真实验收，不替代 Git 历史或原始审计日志。

## 2026-06-25

- `law-tech.dev` 重新绑定 `Curacao914/my-blog`；
- 恢复旧博客 `/`、文章和 archive；
- 新工作台仍在独立分支，明确先保旧内容再逐步整合。

## 2026-06-26

- 形成 `docs/law-tech-migration-matrix.md`；
- Today、Reading、Inbox、课程、API、Relay、数据库和环境变量开始统一盘点；
- 课程模型 JSON、状态和重复错误提示等问题得到针对性修复；
- migration matrix 现在是 historical baseline，不再代表当前运行状态。

## 2026-06-27—2026-06-29

- 通过长篇产品访谈明确网站定位为个人操作系统和学习工作台；
- 确立轻知识、记忆锚点、理解性学习、阅读生长链和克制 resurfacing；
- 明确不做生产力羞耻、强制复习和全宇宙知识图谱；
- 设计液态玻璃导航、Q 弹形变、追光、移动 Dock 和性能降级策略；
- 首页/内容页偏好：层级折叠、固定侧栏、目录进度、封面和正式文案。

## 2026-06-30—2026-07-01

- 用户级 AI 配置从环境 fallback 修正为加密用户集成；
- owner/member、第二账号隔离、课程 AI 与成本控制继续验收；
- 完成全仓审计、数据库差距和发布接手文档；
- 明确事实优先级：Git/部署/数据库/真实 E2E 高于旧交接。

## 2026-07-02

### PR #1

`release: publish Law-Tech integration baseline`

- merge：`5d103ded1ab9c332684b3e137141af105178063c`；
- 发布整合基线；
- Production 数据库 7 列 repair 完成隔离与生产闭环；
- 保留自然课程周期和 OpenClaw 迁移为后续。

### PR #2

`fix: harden Notion sync and workspace loading`

- merge：`215f7d0f4d0066a585d1894fb17e7c93176e86f4`；
- 密码内容、稳定 slug、Notion 图片部分失败、工作台状态和 profile cache hardening。

### PR #3

`feat: release WeChat commands, reminders, and workbench queries`

- merge：`c7098e1ebaf40db19e980f3f5833a2603185e8c1`；
- 微信统一入口、对话状态、确定性时间、消息队列、查询、候选选择和课程简报已读；
- 增量迁移 `openclaw_conversation_states`、`course_brief_reads` 和 delivery 索引；
- 腾讯云 Gateway/Cloudflared/Relay 进入真实运行。

### PR #4

`fix: harden WeChat context and mobile course briefs`

- merge：`3e836446dbce9d1673a171433fe1981e81019ee5`；
- 相对时间、连续修改、语音输入、问候静默和移动课程简报修复。

## 2026-07-03

### PR #5

`fix: add semantic write gates for WeChat commands`

- merge：`6e6ba5f0fd1a199b2636e5c706c4847f0be0080f`；
- 起因：状态句被保存为 Reading；
- 增加 write/ignore/clarify 和 outbound/self/system 过滤代码。

### PR #6

`fix: unify OpenClaw unknown intent handling`

- merge：`5e822604ff579356e3de621470d360fd30fdd5fa`；
- 统一裸动作、礼貌前缀、普通陈述和自然创建策略。

### PR #7

`fix: normalize OpenClaw relay base URL`

- merge：`6382b37a6d91c49be96861b4b29a6a39d85a3784`；
- 修复旧/新 capture endpoint 拼接 runtime-config 的双路径问题。

### 腾讯 inbound filter

- 只应用 `normalize-message.js` 和过滤测试；
- 安全重启 Gateway 重新加载插件；
- readyz 和三个 user services active；
- 未修改数据库；
- 完整 local-runner/base-url runtime 包仍待独立处理。

### 产品架构转向

真实测试发现：

- “未读课程简报已全部读完”没有执行批量已读；
- “国际法6月3号的笔记读完了”不能自然匹配；
- 旧架构实际上是正则优先，模型没有驾驶权。

由此冻结《微信 AI Agent 产品纲领与目标架构 v1.0》，下一主线变为 model-first Agent Controller。

### 文档治理

- 仓库根 README 仍是上游 NotionNext 教程；
- 旧 migration matrix 停在 6 月 26 日；
- 建立 `docs/project` 作为长期项目管理入口；
- GitHub 集成读取正常，但创建 branch/ref 返回 403，因此文档变更继续采用本地一键包 + 用户 push/PR。


### CI / Docker 优化 PR #9（已合并）

- 保留 required job/check 名称 `build`，不使用 workflow-level paths-ignore；
- 纯文档 PR 在 job 内快速成功；
- 无数据库 Docker build 显式跳过静态预取；
- 加入 BuildKit GHA cache 与 concurrency cancel-in-progress；
- merge commit：`6db4e8a8e4b216f95b1b5f330905a084929ae78d`；PR：https://github.com/Curacao914/my-blog/pull/9。
- GHCR 发布解耦纠正 PR #10：https://github.com/Curacao914/my-blog/pull/10；merge：`f5f96ca71ead7c70606933ee1095f725630fe7ca`。
- 随后的 docs-only 记录 PR 用于验证 `build` required job 在纯文档变更上快速成功。

- docs-only 验证 commit：`08a24bce38034bcd05072ec279369a0bce6f30e9`；`build` check success，13.0 秒。


### CI / Docker 构建降时第二阶段（待验收）

- 基线：PR #9 `build` 约 2434 秒；
- 原因：普通 PR 仍同时构建 amd64 与 QEMU arm64，两套完整 Next.js 镜像；
- 调整：PR/main 仅做 amd64 validation，不发布；tag/显式 publish 才进入 GHCR，multiarch 仅用于 release；
- 验收：Agent PR 与 merge 后 main 分别记录 exact-SHA build duration，任一超过 900 秒则不合并或不宣称完成。


### Model-first Agent Phase 1 PR（待验收）

- 旧 regex-first command handler 保留为显式人工回滚路径，但 Production 默认不再经过它；
- Router 模型失败不会调用 legacy 分类器或 rules fallback 写入；
- 新增三个领域的 Registry、Resource、实体解析、Policy、Tools、Session 与 trace；
- 数据库边界为零 migration，复用现有会话 JSON 与领域表；
- 验收分为代码/测试、Preview、Production、真实微信和课程自然周期，禁止混写。

## 2026-07-04

### PR #12 merge 与真实微信失败

- PR #12 merge commit：`9163826c3a78fa1254683c7682286a528a8ce280`；Vercel 与 `build` check 成功。
- Production 未显式配置关闭 flag 时，v1 Agent 默认接管。
- 真实微信明确日程创建请求被错误路由到 `agent.help`，返回整段能力说明且未创建日程。
- 结论：代码、单测、CI 和 deployment 存在，但产品验收失败；停止扩展 v1 Router。

### Production feature-flag 回退

- 在 Vercel Production 添加 `OPENCLAW_AGENT_V1_ENABLED=false`；变量类型为 Sensitive。
- 从 PR #12 exact main 重新部署，deployment：`dpl_3DRvnp53MBjXdECgRd6nx87WVRCS`。
- deployment Ready，`law-tech.dev` alias 已切换，首页 HTTP 200，未鉴权 command 返回 401。
- 真实微信随后完成 legacy 查询以及可清理事项创建/删除，未再出现 v1 help 接管；该验收只证明回退成功，不证明 Agent v2 已存在。

### 治理与实时审计差异

- 初始 GitHub public branch API 返回 `main protected=false`；恢复 Keychain 中的 GitHub CLI 认证后，已启用 branch protection：PR required、`build` required、enforce admins、禁止 force-push/deletion、要求解决 review conversations。
- 通过已认证 Supabase CLI 与只读 REST 完成 Production live audit：项目 `ACTIVE_HEALTHY`，`profiles`、`schedule_items`、`openclaw_conversation_states`、`course_brief_reads`、`message_deliveries`、`course_jobs` 六表均存在且可读；未输出密钥、未写数据库。
- 腾讯云授权指定公钥后，SSH 登录身份确认为 `ubuntu@VM-0-6-ubuntu`；三个 user services 均为 active/running 且 `ExecMainStatus=0`，readyz 为 true；未重启服务。

### v2 架构冻结

- 模型只输出无 capability/tool/risk/SQL 的 UserIntent；代码生成并校验 RoutePlan。
- 按完整闭环推进：Agent Studio + Evaluation Kernel → Production Shadow → 只读 Canary → 可逆写 Canary。
- Studio 使用固定安全拓扑和版本化配置；禁止自由 prompt、任意代码节点或降低风险策略。

### 回退治理闭环与 Agent Studio 本地实现

- PR #13 已合并，merge commit `cd963867682ea388cb45aa30687631a235288c62`；exact-main Production deployment `dpl_G6rgPZh2QM3Lh5hUhbrEUawsToMH` Ready，`law-tech.dev` HTTP 200。
- 从该 exact main 创建 `codex/agent-studio-v1-20260704`；没有修改微信 command 入口、v1 Router 或业务 Tool。
- 完成 v2 稳定契约、受约束版本配置、150 条 development/holdout 评估内核、owner-only Studio、三张 additive 数据表和数据库发布/回滚门禁。
- 隔离 Supabase restore `ldciqxzczwpuhhgeinmc` 真实执行 migration；RLS、唯一 published、低于 98%/安全低于 100% 拒绝发布、published 不可变、rollback 生成新版本均通过，事务测试数据回滚为 0。
- 本地 Agent Studio 9 suites / 66 tests、v1 回归 6 suites / 23 tests、增量 ESLint 与 Production build 通过。评估调用强制执行超时、token/成本预算；单条模型错误形成未执行结果并继续测试，不回退为规则猜测；草稿父版本必须属于同 owner、同 environment。
- Draft PR #14 创建后，将 Vercel Preview 的 Supabase URL/service key 拆分为 Preview-only 覆盖并指向已迁移的隔离 restore；Production 环境变量未修改。隔离配置后的 `build` 2m36s、CodeQL、Analyze 与 Vercel checks 通过。
- `preview.law-tech.dev` 已切到 commit `f72e0bda` 的 `dpl_1Esv5N6o5cbM5K13WmN4aX6s6nmH`；owner 创建并保存 v1 草稿后，隔离 Supabase 仅有一条 `preview/draft` 配置。
- 第一次 150 条评估暴露默认模型名错误：provider 仅接受 `deepseek-v4-flash`/`deepseek-v4-pro`，原值带 `deepseek/` 前缀；该轮 0 token/0 cost 且发布被拒。草稿修正后第二轮真实评估为总体 56%、意图 32%、安全 80%、failed，累计 20,187 input tokens、42,222 output tokens、500,474ms；102 个 intent mismatch、29 个 model error、21 个 unsafe write。未追加个例 prompt。
- 两轮逐 case failure 明细导致 Studio GET 超过 30 秒；已改为数据库保留原始明细、API 聚合类别计数和代表消息。进一步 TDD 增加无 raw message 的逐 case 结构化 actual/error/usage 证据、通用数组形状与 domain/object 映射、`slots.query` 与代码 QuerySpec 的权限分离，以及缺省保守价格/未知价格预算失败。修正版本待 Preview 重跑。
- commit `66042bd7` / deployment `dpl_5P8FtF4Po2Tqk2bC9kP6qfzMu4ky` checks 全通过。第三轮真实评估为总体 58%、意图 39.3%、安全 76.7%、USD 0.017674，仍被门禁拒绝；development 结构化 actual 证明是通用 ontology 和 uncertainty 读写门禁问题，未读取 holdout 期望明细。TDD 新增 `requestMode`/`additionalActions` 语言态、action/scope 语义和安全读取分离，待下一 Preview 重跑。
- 第三轮数据库已完成但浏览器收到非 JSON 网关页；Studio 现按 content-type 安全解析，并在长评估连接中断时刷新服务器 run 状态，错误页不再污染控制面。
- 将评估改为 24 条一批的可恢复账本协议，真实完成中断续跑 24→48→72→96→120→144→150；不再依赖单个长 HTTP 连接。
- DeepSeek `json_schema` 不可用、Thinking 下 forced tool choice 被拒；依据官方 strict mode 规范改为 `/beta`、`thinking=disabled`、强制 `emit_user_intent` Function Schema。真实探针通过，content-only JSON 被代码拒绝。
- strict Flash 150 条结果为总体 74.67%、意图 52%、安全 97.33%、USD 0.037189；strict Pro 为总体 75.67%、意图 52%、安全 99.33%、USD 0.116434。两者均未达门槛并被拒绝发布；未把 development 规则模拟写入生产代码。

## 2026-07-05

### Agent Studio merge 与 Shadow Draft PR

- PR #14 合并，merge commit `9042a93641da292150040bd7ef933ec802be0599`；未产生 published Agent profile。
- 从 exact main 创建 `codex/agent-v2-shadow-20260705`，提交 `16e6052d` 并创建 Draft PR #15。
- PR #15 实现共享 strict Interpreter、代码所有的 Capability Registry/Planner/Semantic Gate、Schedule/Reading/Course 只读 Resource、真实对象/结构化上下文解析、零模型 Session Control、default-off `waitUntil` Shadow 和独立加密 trace；未导入业务 Tool。
- 5 suites / 43 tests、`git diff --check`、JSON 解析和 `LAW_TECH_STATIC_PREFETCH_MODE=skip` build 通过。
- Production Studio migration 前备份两次停在 Supabase Management API 临时登录角色初始化；0B 文件不算备份，已停止且未执行数据库写入。Production Studio/Shadow migration、Preview、Production 与微信 Shadow 仍未验收。

### PR #14 Production Supabase 漂移与微信恢复

- 腾讯日志证明 2026-07-05 13:13 relay capture 仍成功；PR #14 Production deployment 15:02 上线后，15:05 起所有入站 capture 变为 `ok:false`，三个 user services 始终 active。
- 从腾讯端使用当前 relay token 复现得到 HTTP 404：Production Supabase schema cache 找不到 `public.openclaw_conversation_states`；不是 PR #15、Shadow 或服务进程故障。
- 将 Vercel Production `SUPABASE_URL` 与 `SUPABASE_SERVICE_ROLE_KEY` 恢复到项目 `htbbkcxevcouwehpugwc`，secret 通过管理面内存管道更新，未输出或落盘。
- redeploy PR #14 exact main 后，deployment `dpl_C17Vd3SBeovrFPYhcuc5wUyeghsi` Ready 并 alias 到 `law-tech.dev`；腾讯端 authenticated 只读查询返回 HTTP 200、`ok:true`、33 条结果。未重启腾讯服务、未写业务数据。
