# 当前状态

> 核验日期：2026-07-03
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

## Production 与数据库

- Production：`https://law-tech.dev`；
- Vercel project：`curacaos-projects/curacao-top`；
- Production Supabase ref：`htbbkcxevcouwehpugwc`；
- 7 列 schedule semantics additive repair 已完成隔离恢复、隔离验收和 Production 执行；
- migration ledger 已建立；
- 不伪造历史 migration 执行记录；
- `openclaw_conversation_states`、`course_brief_reads`、`message_deliveries` 等对象已进入真实链路；
- 两账号隔离有真实测试，但仍需持续做 guessed-ID、RLS 和导出/删除审计。

## 腾讯云 / OpenClaw

服务器：`ubuntu@124.222.111.108`。

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

当前产品缺陷：现有链路是正则分类和规则门禁先决定意图，模型只在后段整理字段，不能可靠支持自然语言实体解析、批量范围和连续指代。

真实失败样例：

```text
未读课程简报已全部读完
国际法6月3号的笔记读完了
```

因此下一主线是 `AGENT-ARCHITECTURE.md` 所定义的 model-first Agent Controller，而不是继续补正则。

历史误创建 Reading `未读课程简报已全部读完` 尚未删除，应在新 Agent 真机验收后独立备份、唯一性校验并清理。

## 课程自动化

- 课程全链路已有代码闭环和真实成功记录；
- 历史课程简报已有补齐；
- 最终调度版本仍需等待一次自然完整周期；
- workflow_dispatch、手工补跑和历史成功不能代替自然周期证据；
- 历史 `needs_attention/failed` 仍需逐项处理；
- 历史简报补齐不等于所有旧失败课程已经修复。

## 当前 P0

1. 按 Agent 宪法实现 Schedule / Reading / Course 的 model-first 控制平面；
2. 等待课程最终调度版本自然完整周期；
3. 完成腾讯云迁移后的备份、日志、heartbeat、单实例与恢复硬化；
4. 建立统一 E2E、trace、监控与数据质量闭环。

## 实时核验

```bash
cd "/Users/curacao/Script/个人主页/my-blog-clean"
git fetch origin --prune --tags
git rev-parse origin/main
gh pr list --state open
curl -fsS https://law-tech.dev/api/health || true
ssh -i "$HOME/.ssh/lawtech-tencent" ubuntu@124.222.111.108   'systemctl --user is-active openclaw-gateway.service law-tech-cloudflared.service law-tech-wechat-relay.service; curl -fsS http://127.0.0.1:18789/readyz'
```


## CI / Docker 独立闭环（已合并）

- Docker required job/check 名称仍为 `build`；不使用 workflow-level `paths-ignore`。
- 纯文档 PR 在同一 `build` job 内快速成功；未知或代码路径默认执行 Docker build。
- Docker 构建使用 BuildKit GHA cache，并启用 concurrency cancel-in-progress。
- 无数据库 Docker 构建显式传入 `LAW_TECH_STATIC_PREFETCH_MODE=skip`，立即跳过 Notion 与数据库静态预取。
- CI PR #9 已合并，merge commit：`6db4e8a8e4b216f95b1b5f330905a084929ae78d`；纠正 PR #10 已将 required PR/main validation 与 GHCR 发布解耦，merge commit：`f5f96ca71ead7c70606933ee1095f725630fe7ca`；corrected main 验收锚点：`f5f96ca71ead7c70606933ee1095f725630fe7ca`。
- docs-only 验证 commit：`08a24bce38034bcd05072ec279369a0bce6f30e9`；同名 `build` check 成功，运行 13.0 秒。
- 项目治理 PR #8 merge anchor：`85dfb514d9db5ae930b87b0f72b4124fad4b2ce7`。
