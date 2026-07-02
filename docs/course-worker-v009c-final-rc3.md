# Course Worker V009C Final RC3：生产运行闭环

RC3 将已经真实跑通的课程流水线包装为一次性生产周期：

```text
健康检查
→ 登录并扫描当前课程
→ 白名单与日期过滤
→ 幂等登记新回放
→ 只领取白名单内可执行任务
→ 下载 / 转录 / TextPack / 导入 / 清理
→ 结构化运行摘要
→ 可选 webhook 通知
→ 退出
```

## 本地运行

在私密环境文件中设置：

```text
COURSE_PIPELINE_ALLOWLIST=刑法分论,国际法学
```

检查：

```bash
yarn course:pipeline:health
```

运行一个生产周期：

```bash
yarn course:pipeline:cycle
```

运行摘要位于：

```text
~/.law-tech-course-worker/runs/cycle-*/summary.md
```

## 容器

```bash
docker compose   -f deploy/course-worker/compose.yaml   build
```

```bash
docker compose   -f deploy/course-worker/compose.yaml   run --rm course-worker health
```

```bash
docker compose   -f deploy/course-worker/compose.yaml   run --rm course-worker cycle
```

`/data` 必须是持久卷，用于 browser profile、scratch、断点、报告和运行摘要。
容器按次启动、处理、清理并退出，不要求常驻服务器进程。

## 安全边界

- 未配置白名单时拒绝扫描入队；
- 生产周期只领取白名单课程；
- `.env*`、browser profile、scratch、报告、视频和日志不进入镜像构建上下文；
- webhook 只发送课程名、课次、阶段和数量，不发送密钥、URL、Cookie 或本地路径；
- 失败任务保留控制面阶段和本地断点；
- `needs_attention` 以非零状态退出，交给调度平台报警。

## 当前发布门槛

本地媒体下游已经真实通过。合并生产前仍保留两项硬门槛：

1. 教学网 HLS 完整下载验收；
2. 真实两任务中断恢复验收。
