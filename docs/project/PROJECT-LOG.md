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
