# Course Worker production runbook

## 第一次真实 Adapter 回归

仅在教学网恢复稳定时执行。先确保 Preview 部署完成，且已运行前两次 Supabase 迁移。

```bash
export COURSE_CONTROL_PLANE_URL="https://<当前课程分支 Preview 域名>"
export COURSE_WORKER_SECRET="..."
export PKU_USERNAME="..."
export PKU_PASSWORD="..."
export DASHSCOPE_API_KEY="..."
export R2_ACCESS_KEY_ID="..."
export R2_SECRET_ACCESS_KEY="..."
export R2_ENDPOINT="https://<account>.r2.cloudflarestorage.com"
export R2_BUCKET="law-tech-assets"
export COURSE_HEADLESS=0

python3 -m venv .venv-course-worker
source .venv-course-worker/bin/activate
pip install -r scripts/course-worker/python/requirements-course-worker.txt

npm run course:pipeline:run-validated
```

第一次真实回归只放入一条受控任务。成功后再进行两条任务和中断恢复测试。

## 预期状态

媒体阶段完成后的课程流水线状态为：

```text
awaiting_llm_window
```

这表示视频已下载、转录、转换为 TextPack、导入工作台并清理。现有课程笔记 Orchestrator 会按照 DeepSeek Pro 的错峰策略继续处理。

## Scratch 保留策略

默认：

- 完整视频：TextPack 上传成功后删除；
- HLS 分片：TextPack 上传成功后删除；
- 临时 MP3：每个 ASR 任务完成后从本地和 R2 删除；
- transcript 与 TextPack：保留，用于恢复和排查。

远程持久卷与诊断回归完成后，可设置：

```text
COURSE_KEEP_TRANSCRIPT_LOCAL=0
```

## 失败处理

- 教学网或媒体服务器暂时不可用：任务回到 `queued`，延迟重试；
- 登录失效或密码错误：任务进入 `needs_attention`；
- ASR 任务超时：已提交 task 和 R2 对象保留，重跑继续轮询；
- TextPack 上传失败：保留转录与 TextPack，仅重试上传；
- Worker 中断：租约到期后由下一实例从最近成功阶段继续。
