# Course Worker V009C RC4：主模块自动闭环

RC4 将媒体 Worker 和课程 LLM Worker 接成同一生产周期：

```text
低价窗口内先续跑历史 LLM 任务
→ 扫描教学网
→ 下载 / 转录 / TextPack / 导入 / 清理
→ 再续跑本轮新导入的 LLM 任务
→ 自动终审
→ completed
```

正常质量反馈会自动修订。只有来源冲突、自动修订耗尽、认证失效、
任务标识缺失或不可恢复的技术错误会进入 `needs_attention`。

## 费用保护

推荐在 `.env.course-worker.local` 中明确配置：

```text
# 1 表示允许进入按量计费，但仍受下面的单任务和每日上限保护。
# 0 表示只能使用手动填写的剩余免费秒数。
COURSE_ASR_ALLOW_PAID=1
COURSE_ASR_FREE_SECONDS_BUDGET=0

COURSE_ASR_MAX_TASK_SECONDS=14400
COURSE_ASR_DAILY_MAX_SECONDS=28800
COURSE_ASR_MAX_TASK_COST_CNY=2
COURSE_ASR_DAILY_MAX_COST_CNY=5
COURSE_ASR_PRICE_PER_HOUR_CNY=0.288

COURSE_LLM_MAX_TASKS_PER_CYCLE=4
COURSE_LLM_MAX_BATCHES_PER_TASK=80
COURSE_LLM_MAX_BATCHES_PER_CYCLE=160
COURSE_LLM_CONTROL_PLANE_TIMEOUT_MS=300000
```

`COURSE_ASR_FREE_SECONDS_BUDGET` 是人工填写的总剩余额度。系统不会假装能够
读取阿里云控制台中的实时免费配额。

## 通知

```text
COURSE_NOTIFY_WEBHOOK_URL=
COURSE_NOTIFY_WEBHOOK_BEARER=
COURSE_NOTIFY_SUCCESSES=0
```

默认只通知 `attention` 或 `error`，正常完成、低价窗口等待和自动修订不会打扰用户。

## 命令

完整生产周期：

```bash
yarn course:pipeline:cycle
```

仅处理媒体：

```bash
yarn course:pipeline:media-cycle
```

仅处理已经导入的课程笔记：

```bash
yarn course:pipeline:llm
```

## 远程 Worker

RC3 的 Docker 包继续有效。RC4 的 `cycle` 入口已经改为 supercycle，因此旧的
Docker Compose 和 cron 不需要增加第二套进程。`/data` 仍必须使用持久卷。

最终生产验收只需：

1. 在 Vercel Preview 部署 RC4；
2. 运行一次 `COURSE_PIPELINE_ALLOWLIST="刑法分论" yarn course:pipeline:llm`；
3. 确认现有课程任务自动进入 `completed`；
4. 在远程容器运行 `health` 与一次 `cycle`。
