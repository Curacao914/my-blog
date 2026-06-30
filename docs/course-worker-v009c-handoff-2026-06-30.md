# Law-Tech Course Worker V009C：2026-06-30 交接记录

## 当前状态

- 仓库：`Curacao914/my-blog`
- 分支：`codex/course-worker-v009c`
- RC3 基线：`20e49b93b69419436d00e1f931d09bbed03ea6df`
- 本地媒体下游真实 E2E：已通过；
- 教学网 HLS：已通过登录、定位和 M3U8 捕获，完整下载仍受教学网服务器影响；
- RC3 增加一次性生产周期、白名单、健康检查、运行摘要、可选通知、Docker 和调度模板。

## 已真实验证

刑法分论 `2026-06-10第10-12节` 使用本地完整视频，从 `downloaded` 运行到
`awaiting_llm_window`，Paraformer、TextPack、工作台导入、笔记流程和清理全部成功。

详细时间线见：

```text
docs/course-worker-v009c-validation-2026-06-30.md
```

## RC3 生产命令

```bash
yarn course:pipeline:health
yarn course:pipeline:cycle
```

生产周期默认要求：

```text
COURSE_PIPELINE_ALLOWLIST=刑法分论,国际法学
```

未配置白名单时拒绝运行，避免将所有课程意外入队。

## 远程 Worker

```text
deploy/course-worker/Dockerfile
deploy/course-worker/compose.yaml
deploy/course-worker/course-worker.env.example
deploy/course-worker/schedule.cron.example
```

持久卷 `/data` 保存 browser profile、scratch、断点、报告和运行摘要。容器每次完成一个周期后退出，外部调度每日启动 2—4 次。

## 剩余硬门槛

1. 教学网恢复后跑通完整 HLS 下载与组装；
2. 用两条真实任务验证中断、租约恢复和任务隔离；
3. 首次远程部署后验证 profile 持久化；
4. 达标后合并到生产分支。

本记录不包含密码、Cookie、Token、签名 URL、媒体 URL或业务密钥。
