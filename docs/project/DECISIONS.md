# 产品与架构决策

采用简化 ADR 格式。状态为 `Accepted` 的决策是后续实现的约束；改变时新增替代决策，不静默覆盖历史。

## D-001：产品是公开站点与私人工作台的统一系统

- 日期：2026-06
- 状态：Accepted
- 决策：保留公开个人站点，同时建设私人认知工作台和自动化控制面。
- 后果：不能只按博客或任务管理器优化；公开权限和私人数据必须分层。

## D-002：保留 NotionNext 兼容

- 状态：Accepted
- 决策：继续使用当前 Pages Router/NotionNext 基座，保留旧文章、archive/category/tag/search、RSS 和 sitemap。
- 后果：不能再次用独立项目直接替换 Production；App Router 迁移暂缓。

## D-003：不直接修改 main

- 状态：Accepted
- 决策：所有产品和生产变更使用分支、PR、Preview、检查、回滚锚点和 exact commit。
- 后果：禁止 force-push main；Production 状态不由“代码看起来存在”推断。

## D-004：证据等级分离

- 状态：Accepted
- 决策：代码、单测、build、Preview、Production、真实 E2E 和自然周期分别记录。
- 后果：课程完整自动化必须等待自然周期，历史简报补齐不能替代失败课程修复。

## D-005：精确时刻提醒继续由 iOS 承担

- 状态：Accepted
- 决策：Law-Tech 保留日期事项、工作台聚合和每日摘要，不新增精确到点微信提醒。
- 后果：紧急事项使用 iOS 提醒事项；已有相对时间兼容不等于扩展产品范围。

## D-006：课程链路采用 durable workflow

- 状态：Accepted
- 决策：课程发现、转写、简报、写作、审查和发布不依赖浏览器保持打开。
- 后果：状态持久化、幂等、恢复、自然周期和成本是核心验收指标。

## D-007：微信 Agent 采用 model-first 控制平面

- 日期：2026-07-03
- 状态：Superseded by D-015
- 决策：模型先理解并生成结构化计划，代码后校验真实对象和执行；正则只做传输过滤、格式和安全边界。
- 后果：原则继续有效，但 PR #12 将“模型理解”错误实现成“模型直接选择 capability”；新的权限分层由 D-015 取代。

## D-008：Resource 与 Tool 分离，模型不得直接 SQL

- 状态：Accepted
- 决策：只读资源和有副作用工具分别注册；模型生成 QuerySpec/MutationSpec，不接触自由 SQL。
- 后果：权限、对象 ID、事务、幂等和审计由服务端执行器掌握。

## D-009：上下文使用结构化状态

- 状态：Accepted
- 决策：保存 active topic、last selected/created/updated、result set 和 pending confirmation，而不是只拼接聊天文本。
- 后果：“这个”“刚才那个”“时间改到十点”必须解析到真实对象。

## D-010：OpenClaw 核心运行于腾讯云 user systemd

- 状态：Accepted
- 决策：Gateway、Cloudflared、Relay 使用 `systemctl --user`；Mac 不再作为唯一宿主。
- 后果：所有脚本必须区分 user/system service，备份和恢复围绕腾讯 runtime。

## D-011：液态玻璃是局部材质系统

- 状态：Accepted
- 决策：Q 弹、追光、边缘高光和折射用于导航、Dock 和小型控件；长列表和正文保持可读。
- 后果：不做全站高 blur，不让十几块“史莱姆”同时竞争注意力。

## D-012：一次只交付一个完整闭环

- 状态：Accepted
- 决策：复杂任务先查明完整失败面，再用一个包完成独立闭环；支线进入 parking lot。
- 后果：禁止一个错误一个脚本、盲目重跑和同时推进无关主线。

## D-013：Production 服务器不承载 self-hosted CI runner

- 状态：Accepted
- 决策：CI 优化使用托管 runner 缓存或独立隔离 VM。
- 后果：生产服务器不暴露仓库执行面和额外凭据。

## D-014：项目文档是受版本控制的产品资产

- 日期：2026-07-03
- 状态：Accepted
- 决策：状态、路线、决策、事故、运维和交接进入 `docs/project`；PR 模板强制文档影响检查。
- 后果：旧交接不再作为唯一事实源；审计与解压目录不得写入 Desktop。


## ADR: Agent Phase 1 复用会话 JSON，不新增数据库表

- 状态：Superseded by D-016
- 决策：首期将结构化 Session State 与最近 trace 存入现有 `openclaw_conversation_states.state`，不新增 migration；
- 原因：先验证 Router—Resource—Policy—Tool 闭环，降低数据库与发布耦合；
- 代价：trace 仅为有界、带 TTL 的验收级记录，不替代后续耐久审计表；
- 后续：统一 E2E 与观测阶段再设计 durable trace/event ledger。

## D-015：模型只解释 UserIntent，代码生成并授权 RoutePlan

- 日期：2026-07-04
- 状态：Accepted
- 决策：第一次模型调用只输出不含 capability、tool、SQL 和 risk 授权的 `UserIntent`。确定性 Planner 根据版本化 Capability Card 生成 RoutePlan，Semantic Gate 检查 action/domain/object/scope 一致性后，才能进入真实 Resource、Risk Policy 和 Tool。
- 后果：常见路径仍为一次模型调用；复杂规划最多增加一次受约束选择。模型自报 confidence 只用于观测，不能单独授予写权限。PR #12 的 direct `LLM → capability → execution` 架构不再演进。

## D-016：新 Agent 默认关闭，先 Studio，再 Shadow，再 Canary

- 日期：2026-07-04
- 状态：Accepted
- 决策：新 Agent 的任何模式均 default-off。先完整交付 Agent Studio + Evaluation Kernel，再交付只读 Production Shadow；Shadow 达到固定集和真实自然样本门槛后，才允许另开只读 Canary PR。
- 后果：不存在“代码合并即自动接管 Production”。Shadow 不回复、不调用 Tool、不改变 legacy 结果；任一阶段失败通过配置版本或 feature flag 回滚。

## D-017：Agent Studio 是受约束、版本化的控制面

- 日期：2026-07-04
- 状态：Accepted
- 决策：提供固定拓扑的可视化 Studio，支持 draft、真实模型评估、publish、diff 和 rollback。用户可以配置模型分工、能力启停、阈值、领域别名和预算，但不能编辑任意 system prompt、插入代码/SQL 节点、降低风险级别或绕过确认。
- 后果：灵活性来自 schema、ontology、Capability Registry 和版本化配置，不来自为失败原句追加个例提示词。每个发布版本必须绑定 development/holdout 评估结果。

## D-018：Agent 真实语料加密并使用独立 trace 数据模型

- 日期：2026-07-04
- 状态：Accepted
- 决策：Studio 配置/评估和 Shadow trace 使用独立 additive 表；真实微信原文与 legacy 回复使用现有 AES-256-GCM 密钥加密，派生 Intent/Plan/usage/成本可检索，默认保留 30 天。
- 后果：不再让 `openclaw_conversation_states.state` 同时承担会话、评估和长期审计职责；模型不获得数据库或自由 SQL 权限。
