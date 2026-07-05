# 产品与工程路线图

本路线来源于真实使用、长期产品访谈、课程与微信实践、前端设计讨论和运行事故。它不是“所有功能立即开发”的清单；优先级以真实闭环、风险和依赖为准。

## P0：微信 AI Agent 控制平面

当前最优先。

- [x] PR #12 失败后停止扩展 direct `LLM → capability` Router；
- [x] Production 设置 `OPENCLAW_AGENT_V1_ENABLED=false` 并完成 Ready redeploy；
- [x] 完成真实微信 legacy 接管验收、main branch protection 和 Supabase/Tencent 只读复核；
- [x] 合并回退与治理文档 PR #13，merge `cd963867682ea388cb45aa30687631a235288c62`；
- [ ] 完整交付 Agent Studio + Evaluation Kernel：固定可视拓扑、版本配置、development/holdout、真实模型测试、发布和回滚；
  - [x] 本地协议、Studio、三张 additive 表、150 条 fixed set、测试、ESLint、build 与隔离数据库事务验收；
  - [x] 创建独立 Draft PR #14，首轮 `build`、CodeQL、Analyze 与 Vercel checks 通过；
  - [x] 隔离 Supabase 配置下的 Vercel Preview owner 页面、固定拓扑和空配置 GET 验收；
  - [x] Preview owner 草稿创建、保存、隔离数据库边界和失败发布门禁验收；
  - [x] 完成 strict Function Schema、可恢复分批评估、真实 Flash/Pro 对比；不合格草稿被三层门禁拒绝发布；
  - [x] 合并 PR #14，merge `9042a93641da292150040bd7ef933ec802be0599`；
  - [ ] 完成 Production additive migration/控制面部署验收；不存在合格 published profile 时保持 Agent runtime 关闭；
- [x] 在 PR #15 代码层交付 `UserIntent → Deterministic Planner → Semantic Gate`；
- [x] 在 PR #15 代码层交付 Schedule、Reading、Course Capability/只读 Resource/实体与结构化上下文解析；
- [ ] 完整交付 default-off Production Shadow、独立加密 trace、成本和延迟观测；
  - [x] Draft PR #15 实现 default-off、无 Tool 的后台 Shadow 与 30 天加密 trace；
  - [ ] Preview migration/fixture、Production migration、显式开启与 trace 验收；
- [ ] Shadow 连续 7 天、至少 50 条真实消息，关键安全项 100%、固定集总体至少 98%；
- [ ] 另开只读 Canary PR；只读验收完成后再开单条可逆写 Canary PR；
- [ ] 写 Canary 真机验收后单独清理历史误创建 Reading。

每一项均是独立 PR/闭环。前一项未完整验收时禁止启动下一项，不创建需要“以后补齐”的空壳。

## P0：课程自然周期

- 等待最终 scheduler 自然发现一门新回放；
- 验收发现、授权、媒体、转写、简报、完整笔记、推送、清理、费用和最终状态；
- 处理历史 `needs_attention/failed`；
- 授权过期恢复、多课程并行、幂等和重复事件；
- HLS/MP4、长课程、ASR、OCR 和转录完整性边界；
- writer/reviewer/revision/final review 门禁；
- soft pause 真实行为；
- 课程回复写回课次；
- brief-only/full-note、即时/定时偏好；
- 学期切换、课程重命名和同名冲突；
- 单课与学期成本。

## P1：腾讯云与可观测性

- OpenClaw 配置、登录状态、插件、session 和 context token 的安全备份；
- 恢复演练；
- log rotation、磁盘上限和脱敏日志下载；
- heartbeat、synthetic check 和外部可用性；
- 单实例证明；
- 离线积压的上限、过期和降噪；
- openclaw-weixin 升级与配对兼容；
- 长时间 Mac-off 验收；
- 主动出站 CLI / Gateway plugin context 的独立修复；
- SystemSnapshot / DatabaseSnapshot / AiSnapshot。

## P1：数据治理和安全

- 定期逻辑备份与隔离恢复；
- Markdown/JSON 个人数据导出；
- 删除、撤回和保留期限；
- RLS、guessed-ID 和成员权限回归；
- capture/outbound rate limit；
- URL metadata SSRF 边界；
- secret 轮换记录；
- orphan assets / versions / withdrawn records；
- course jobs/workflow 一致性；
- 慢查询、索引和定期完整性报告；
- Agent trace、undo、session 和统一搜索索引的数据模型。

## P1：CI 与工程效率

- 盘点 branch protection required checks；
- Docker build 仅在相关路径、main 或手工触发；
- `concurrency.cancel-in-progress`；
- BuildKit GHA/registry cache；
- main seed cache；
- 升级 Docker Actions；
- 取消重复的本地/Vercel/Docker build；
- 不在 Production 腾讯服务器部署 self-hosted runner；
- 建立文档影响检查和状态同步。

## P2：Today 记忆锚点

- 当天痕迹自动汇集；
- 晚间草稿；
- 微信/网页补充；
- 轻量日记录与周记录；
- 日期回看；
- 课程、阅读、写作和完成事项作为素材；
- 克制 resurfacing；
- 东京/上海和旅行时区策略；
- 不做连续打卡、耗时排名和生产力羞耻。

## P2：Reading 生长链

```text
保存 → 元数据 → 摘录 → 想法 → 轻知识 → 写作/课程关联 → 使用记录 → 克制回顾
```

- 未读、稍后、已处理、二刷、理解、可引用、已使用；
- 微信文章元数据失败后的标题补全；
- 批量去重与合并；
- 按主题、来源、课程和历史兴趣推荐；
- 随机回顾；
- PDF 摘要、问答和引用；
- 数据导出；
- 不把系统做成“链接仓鼠仓库”。

## P2：轻知识 Knowledge

这是独立领域，不是 Reading 文件夹。

对象类型：

```text
idea / fact / question / quote / concept / observation / connection
```

能力：

- 微信快速记录；
- 自动标题、标签和来源；
- 搜索、回忆和关联；
- 扩写；
- 转为 Reading、日程、文章素材或课程笔记；
- 随机复习和周期回顾；
- 来源和使用关系；
- 稳定导出。

目标是构建比科普更深、比专业研究更轻的跨领域知识系统，避免网站只容纳法律内容。

## P2：Content / Search / Recommendation

- Notion、Supabase、live snapshot 和静态内容的统一 ContentResource；
- 搜索公开文章和公开笔记；
- 获取正文、摘要和来源；
- 最近更新和随机站内推荐；
- 课程、阅读和轻知识转公开草稿；
- 栏目、合集、标签支持输入和选择已有值；
- 稳定链接、引用与访问模式；
- 派生统一搜索索引：对象类型、ID、标题、别名、正文、标签、来源、权限、embedding；
- 派生索引只做检索，原领域仍是事实源；
- 外部文章搜索与保存严格分离。

## P2：公开首页与内容体验

- homepage/content-first 打磨；
- 内容层级折叠，不全部平铺；
- 左侧栏滚动固定；
- 右侧目录随滚动高亮；
- 阅读进度联动；
- 封面、轻玻璃和悬浮反馈；
- 动态签名放在侧边栏底部等合适位置；
- Notion 内容逐步迁入统一内容层；
- 密码内容不进入公开搜索、RSS 和 sitemap；
- Notion relay / R2 last-known-good 继续完成。

## P2：Writing Studio

Agent、课程和数据基础稳定后再扩张：

- 正文、提纲、资料和批注并列组合；
- 待补证据、论证跳跃、事实待核、语言待调等段落标记；
- 段落与来源/证据关系；
- 重复观点和术语不一致提示；
- 选题/结构阶段的建设性反驳；
- 严格编辑、资料管理员、反方审稿人按阶段切换；
- 保存关键修改理由；
- Markdown 导入导出；
- 发布前检查标题、摘要、链接、引注、隐私和重复；
- 长期分析个人写作习惯；
- 继续防止 autosave 旧响应覆盖新内容。

## P2：课程理解产品

- 老师反复强调、不同意、价值判断、案例和预测考题的信号提取；
- “老师观点雷达”；
- 课程问题树；
- 逐步追问的鉴定式案例训练；
- 整合笔记到理解性转化；
- 课程与 Reading、轻知识、写作联动；
- 不强推固定复习节奏、考前倒计时和模拟考场。

## P2：液态玻璃前端

目标是可复用材质与交互系统，不是全站磨砂。

- 顶部导航完整液态玻璃；
- 流动选中底板；
- Q 弹展开；
- 小而克制的追光；
- 动态边缘高光和轻微折射；
- 深浅主题；
- 移动端底部 Dock；
- 浮动 AI、快速记录、主题和阅读进度控件；
- Today 只使用弱玻璃；
- 文章卡片和长列表不得全部液态化；
- 不要过绿；
- 强玻璃组件数量有限；
- 移动端降低 blur、阴影和折射；
- pointermove 使用 CSS 变量或 Motion Value；
- 支持 `prefers-reduced-motion`；
- 第一阶段不强行新增 Motion 依赖；
- 使用独立分支和 Preview，不与 Agent/课程主线混做。

## P3：案件与高级关系工作台

关系图、时间轴、证据、金额、争点和来源链具有真实价值，但目前没有稳定持续的实务需求。

- 暂不做完整案件工作台；
- 在真实案件中积累可复用结构；
- 以后作为独立项目，而不是塞进 Agent 第一阶段；
- 不一开始构建全宇宙知识图谱。

## 明确暂缓或排除

- 新增精确到点微信提醒；
- 用微信替代 iOS 紧急提醒；
- 模型直接 SQL；
- 一开始拆大量互相转交的 Agent；
- 激进扩张 Writing Studio；
- Word 高保真编辑；
- 实时多人协作；
- 自制密码管理器；
- 长期保存课程原始视频；
- 强制复习计划、模拟考场和任务耗时排名；
- 多模型竞技场；
- 全宇宙知识图谱；
- Production 腾讯服务器上的 self-hosted CI runner。


### CI / Docker 独立闭环

- [x] 保留 `build` required check 名称并让纯文档 PR 快速成功；
- [x] 加入无数据库静态预取 skip 模式；
- [x] 加入 BuildKit GHA cache 与 cancel-in-progress；
- [x] CI PR #9 checks 与 merge commit `6db4e8a8e4b216f95b1b5f330905a084929ae78d` 已记录；纠正 PR #10 merge `f5f96ca71ead7c70606933ee1095f725630fe7ca` 已将 required validation 与 GHCR 发布解耦；docs-only commit `08a24bce38034bcd05072ec279369a0bce6f30e9` 的 `build` check 已成功验证 fast-success。


### CI / Docker 构建降时第二阶段

- [x] 普通 PR/main 从双架构改为原生 amd64 validation，且 required check 不依赖 GHCR 发布；
- [x] GHCR 仅由版本标签或显式手工 publish 发布，arm64 仅保留在 multiarch release；
- [x] 架构分离 GHA cache；普通 PR/main 20 分钟 timeout，显式 multiarch release 70 分钟；
- [ ] Agent PR exact-SHA `build` 不超过 900 秒；
- [ ] merge 后 main exact-SHA `build` 不超过 900 秒。


### Model-first Agent Phase 1 实施

- [x] PR #12 代码、单测和 Production deployment 曾存在；
- [x] 真实微信验收发现明确日程创建被错路由到 `agent.help`；
- [x] v1 进入失败实验状态并触发 Production feature-flag 回退；
- [ ] v2 Studio/Evaluation 独立闭环（本地实现与隔离 DB 验收完成，等待 PR/Preview/Production）；
- [ ] v2 Shadow 独立闭环；
- [ ] v2 只读 Canary 独立闭环；
- [ ] v2 可逆写 Canary 独立闭环。
