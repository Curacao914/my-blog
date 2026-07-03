# 已知教训与强制规避

本文件记录真实发生过的问题。后续脚本和产品设计应在生成阶段排除这些失败模式，而不是等用户再次撞到。

## 产品与架构

### AI 被正则架空

问题：用户期望自然语言 Agent，实际链路先用关键词决定 domain/action，再用规则决定 ignore/clarify/write，模型只整理字段。

后果：

- “未读课程简报已全部读完”被当状态陈述；
- “国际法6月3号的笔记读完了”不能匹配真实对象；
- 产品像关键词机器人。

规避：model-first RoutePlan；模型理解、资源检索、真实 ID、安全门禁、确定性执行。

### 安全不能等于僵化

“避免误写”不能实现为“凡是不符合固定模板就静默或澄清”。安全策略应位于结构化计划之后，只判断风险、对象、权限和确认。

### 找不到对象不能新建同名记录

模型或规则 fallback 曾把整句话保存成 Reading。以后无匹配必须报告、澄清或失败，不得自动创建。

### 线性对话容易丢主线

多系统排障曾从语义误写扩散到插件发送上下文。以后每轮固定说明：唯一目标、已完成、未完成、明确不做；新支线进入 parking lot。

## Git 与发布

### 集成写权限不可靠

当前 GitHub 读取可用，但创建 ref 曾返回 403。不能假设助手可以直接 push。

规避：默认生成带 SHA-256 的一键包，由用户本地运行；只有实际验证写权限后才直接操作远端。

### 合并后不能重跑原发布脚本

PR 已 merge 后，旧脚本前置条件改变。必须根据日志创建 narrow resume，不重复 merge、tag、Vercel、数据库备份和已完成步骤。

### `git diff --name-only` 漏掉 untracked

PR #7 第一版脚本漏检新文件。

规避：使用 `git status --porcelain --untracked-files=all`，同时校验 tracked/untracked 边界。

### check 名称和等待方式不稳定

`gh pr checks --watch` 体验差，workflow/job/check 名可能不同。

规避：按 exact head SHA 读取 GitHub REST/Actions 结论；改变 CI 前先盘点 required checks。

## Shell 与跨平台

### macOS Bash 3.2

禁止：`readarray`、`mapfile`、`declare -A`、`${var,,}` 和 Bash 4+ 假设。变量/数组必须显式初始化。

### `set -u` 未绑定变量

曾出现数组未初始化导致 `unbound variable`。统一使用 `${VAR:-}`，数组在使用前初始化。

### 变量后接中文

`$RESULT（` 被错误解析。变量后有中文、字母或数字时必须写 `${RESULT}`。

### remote `$HOME` 本地提前展开

规避：单引号 heredoc，显式传入 remote 变量，在远端脚本内部展开。

### 脚本不能 `source`

一键脚本中的 `exit` 可能结束当前 shell 或污染用户环境。统一 `/bin/bash "$SCRIPT"`。

## Node / Git / 文件边界

### ESM package boundary

只复制 `.js` 到临时目录、没有相邻 `package.json` 的 `type: module`，会把环境问题误判为代码错误。

规避：测试完整最小 package 或同时携带 package.json。

### scoped styled-jsx 不穿透子组件

首页拆组件后父级样式失效，卡片“集体裸奔”。组件样式进入组件本身、CSS Module 或受控 global；视觉修改必须看 Preview/截图。

### autosave 旧响应覆盖新输入

Writing 曾出现删掉的标题回来。保存必须带 sequence/version，旧响应不得覆盖新状态，保存期间的新变更需要继续提交。

## 腾讯云 / OpenClaw

### systemd 层级

服务是 user service。禁止 `sudo systemctl` 或系统级 `systemctl`；必须 `systemctl --user`、`journalctl --user`。

### 非交互 PATH

远端曾报 `spawn openclaw ENOENT`。真实 binary 是 `/home/ubuntu/.local/bin/openclaw`。

规避：使用 absolute `OPENCLAW_BIN`，不依赖 login shell PATH。

### `--probe` 不是纯只读

`local-runner.js --probe` 会同步模型并进入 Weixin dry-run。未知参数不能凭名字当作只读探针；运行前必须读实现。纯配置检查使用明确 `--runtime-only`。

### Weixin channel 与插件上下文

腾讯插件源码有 direct outbound，但独立 CLI 曾报告 `Unknown channel: openclaw-weixin`，Gateway 与 CLI 的加载上下文可能不同。

规避：不继续猜别名；不在无关发布中做主动发送探测；单独比较二进制、OPENCLAW_HOME、插件注册和启动环境。

### runtime-config 双路径

capture URL 从 `/api/schedule/capture` 变为 `/api/integrations/openclaw/command` 后，旧代码拼成双 API 路径并 404。

规避：基础 URL 规范化为独立纯函数，覆盖旧/新入口、斜杠、query/hash 和 unrelated path。

### Gateway reload 边界

消息 normalize 插件由 Gateway 加载，仅重启 Relay 不会生效。必须先明确代码由哪个进程加载，再决定最小重启范围。

## 环境变量

### 可选变量被误判为必需

脚本曾把 Vercel 中缺少的可选或有 fallback 的变量当成发布阻断。

规避：变量分类为 required、required-through-fallback、recommended、optional、Tencent-only、GitHub-only；只检查当前闭环真正需要的变量。

### 用户级 AI 配置与环境 fallback

Owner 可以从加密 `user_integrations` 读取 AI 配置。没有某个 `SCHEDULE_AI_*` 不代表模型不可用；需要检查 effective source，而不是只看单个变量。

### Preview Protection

401/403 可能来自 Vercel Protection，而非应用。自动验收需支持 bypass secret，并区分 Protection 与代码错误。

## 文件和审计

### Desktop 污染

大量审计目录曾写入 Desktop。

以后统一：

```text
下载：~/Downloads
临时：/tmp/law-tech-...
审计：~/Documents/Law-Tech-Audits/YYYY-MM-DD
备份：~/Documents/Law-Tech-Backups/YYYY-MM-DD
```

### 不要重复小步包

复杂闭环应交付 ZIP：README、apply-test-push、patch/files、rollback（必要时）、manifest SHA。失败后根据准确阶段续跑，不让用户不断下载一串脚本。
