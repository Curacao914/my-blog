# 运维与发布规范

## 系统地图

| 层 | 平台 | 主要职责 |
|---|---|---|
| Web/API | Vercel | Next.js、公开站点、工作台 API |
| Data | Supabase | 业务表、状态、存储、加密用户集成 |
| Repository/CI | GitHub | 代码、PR、Actions、课程调度 |
| WeChat runtime | Tencent Cloud | OpenClaw Gateway、Cloudflared、Relay |
| OCR | Hugging Face / PaddleOCR | 图片和扫描材料处理 |

## 本地与服务器路径

```text
Local repo: /Users/curacao/Script/个人主页/my-blog-clean
SSH: ubuntu@124.222.111.108
SSH key: $HOME/.ssh/lawtech-tencent
OpenClaw binary: /home/ubuntu/.local/bin/openclaw
OpenClaw home: /home/ubuntu/.openclaw-candidate
Relay root: /home/ubuntu/law-tech-runtime/integrations/openclaw/law-tech-wechat-relay
Gateway readyz: http://127.0.0.1:18789/readyz
```

## 环境变量分层

### Vercel / 网站

- Clerk：`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`、`CLERK_SECRET_KEY`、管理员标识、authorized parties；
- Supabase：`SUPABASE_URL`、service role/secret、`DATABASE_URL`、storage bucket；
- AI：通用 `AI_*`，或 `SCHEDULE_AI_*`、`COURSE_AI_*`、`WRITING_AI_*` 与角色模型；
- 微信 API：`WECHAT_CAPTURE_TOKEN`、推荐的 allowed sender、owner fallback；
- Reminders：Resend、run token、cron secret；
- Notion/R2/Search/OCR：只在相关能力启用时要求。

### 腾讯云 runtime

```text
OPENCLAW_HOME
OPENCLAW_BIN
LAW_TECH_CAPTURE_URL
WECHAT_CAPTURE_TOKEN
LAW_TECH_BASE_URL
LAW_TECH_WECHAT_TARGET
LAW_TECH_WECHAT_POLL_MS
```

腾讯 runtime 变量不是 Vercel 必需变量。

### Supabase 用户集成

Owner/成员的 AI 或邮件配置可以加密存于 `user_integrations`。脚本应检查 effective configuration，不要求用户把 secret 粘贴进聊天。

### GitHub

Actions secrets/variables 只用于 workflow。不要把生产 server 凭据复制进无关 PR 或日志。

## Secret 规则

不得在聊天、PR、日志或脚本输出中展示：数据库密码、service role、Clerk secret、OpenClaw token、Weixin target/context token、GitHub token、R2 secret、AI key 或完整带密码连接串。

只输出变量名、存在/缺失和脱敏 hint。

## 一键包规范

复杂变更默认交付：

```text
README-RUN.md
apply-test-push.sh
files/ 或 patch
rollback.sh（高风险时）
MANIFEST-SHA256.txt
```

位置：

```text
下载：~/Downloads
解压：/tmp/law-tech-<task>-<timestamp>
审计：~/Documents/Law-Tech-Audits/YYYY-MM-DD
备份：~/Documents/Law-Tech-Backups/YYYY-MM-DD
```

必须兼容 macOS Bash 3.2，并执行：

- `bash -n`；
- embedded Python parse；
- embedded Node check；
- SHA-256；
- 工作区/分支/main 边界；
- targeted tests；
- relevant full tests/build；
- `git diff --check`；
- exact commit/PR/deployment 输出。

## 普通代码发布

```text
核验 origin/main
→ 独立分支
→ 精确改动
→ targeted tests
→ relevant full tests/build
→ commit/push
→ PR
→ Preview/CI
→ 人工或自动验收
→ rollback anchor
→ merge
→ exact merge Production
→ smoke
→ 状态与日志文档
```

## 数据库变更

```text
只读事实
→ schema/data 备份
→ additive/idempotent migration
→ 隔离恢复
→ 隔离执行与验收
→ Preview
→ Production
→ postcheck
→ ledger
→ 恢复演练
```

不得伪造历史 migration 记录。

## 腾讯云变更

```text
服务/readyz
→ 精确文件边界
→ 远端备份
→ staging/temp 测试
→ 暂停必要服务
→ 最小重启
→ readyz
→ 当前 invocation 日志
→ hash 对比
→ 失败恢复
```

只有 Gateway 加载的插件或配置变化时才重启 Gateway。服务均使用 user systemd。

## 失败处理

失败后必须记录：

- 准确失败步骤；
- 已完成步骤；
- 未触碰系统；
- 是否自动回滚；
- 当前服务健康；
- 下一 narrow resume 起点。

禁止盲目重跑完整脚本。

## 微信 Agent 发布与回滚

- PR #12 v1 仅作为失败实验保留；Production 必须显式设置 `OPENCLAW_AGENT_V1_ENABLED=false`。
- 新 Agent 的未配置状态必须等同于关闭。禁止“非 test 默认开启”。
- 发布顺序固定为 Studio/Evaluation → Shadow → 只读 Canary → 可逆写 Canary；每一步是独立 PR、独立 flag 和独立回滚锚点。
- Studio migration 必须先在隔离 Supabase 项目执行：确认三张目标表不存在，应用 SQL，核验 RLS/唯一 published 索引/事务函数，再在单一 `BEGIN ... ROLLBACK` 中验证低分拒绝、published 不可变和 rollback 新版本；确认测试行计数为 0 后才允许进入 Preview。
- Production additive migration 只能在 Studio PR、Preview、隔离数据库事务和真实模型门禁行为均验收后执行；模型未达 fixed-set 时允许部署控制面，但不得产生 published profile，也不得开启 Shadow/Canary runtime。
- Shadow 不回复、不调用 Tool、不改变 legacy 结果；模型或 trace 失败只记录，不影响用户路径。
- 每个配置版本先跑 development 和 holdout。真实语句可以进入评估数据，但不得被拼进 Production system prompt 当个例补丁。
- 简单工具成功回复使用确定性模板；是否允许写入、目标 ID、数量和 before/after 不交给 LLM judge 决定。

Production feature-flag 回退流程：

```text
确认当前 exact main/deployment
→ 在 Production 设置 OPENCLAW_AGENT_V1_ENABLED=false
→ redeploy 同一 exact commit
→ vercel inspect 确认 Ready 与 alias
→ authenticated command 查询
→ 真实微信查询
→ 可清理测试事项创建/删除
→ 更新项目文档
```

Vercel CLI 对 Sensitive 变量可能只返回存在性而不返回值。不得把 `env ls` 或空的 `env pull` 当作值验证；最终以新 deployment 和 authenticated/真实微信行为为准。

## 文档发布

任何改变运行事实、架构或路线的 PR 都必须根据 `docs/project/README.md` 更新文档。PR 描述不得把“计划合并”“已 merge”和“Production 已部署”混在一起。


## Docker CI

- workflow 固定为 `.github/workflows/docker-ghcr.yaml`，required job/check 名称固定为 `build`；
- 禁止对 required workflow 使用 workflow-level `paths-ignore`；纯文档变更在 job 内判定并快速成功；
- pull request 与 main 非纯文档变更仅验证 `linux/amd64`，required `build` 不发布镜像；版本标签或显式 `workflow_dispatch publish=true` 才发布，multiarch 仅用于双架构发布；
- Docker 无数据库构建必须传入 `LAW_TECH_STATIC_PREFETCH_MODE=skip`；
- 使用 BuildKit GHA cache 与 concurrency cancel-in-progress。

- 代码 PR/main 的 `build` check 目标 600 秒、硬上限 900 秒；超限不得合并并宣称闭环。
- `build` 名称存在不等于它已被 branch protection 强制。每次治理审计同时检查 GitHub branch/ruleset；若 `protected=false`，必须明确记录为未受保护。
