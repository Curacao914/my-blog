# Law-Tech Course Worker V009C：2026-06-30 交接记录

## 当前仓库与阶段

- 仓库：`Curacao914/my-blog`
- 分支：`codex/course-worker-v009c`
- Final RC1 基线提交：`e612b459d7cb740d98055f602d7b207fd246ad7f`
- 当前阶段：代码层面的完整 Release Candidate。
- 仍不能标记为 production complete：教学网恢复后必须完成单任务真实 E2E，以及双任务中断恢复验收。

## 已完成能力

- Vercel / Supabase 控制面：课程发现、队列、状态、精确领取、心跳、阶段报告和重试；
- Worker：登录复用、课程扫描、目标回放定位、HLS 捕获、分片下载、ffmpeg 组装、Paraformer、TextPack、上传和清理；
- 安全边界：不保存 Cookie、JWT、签名 URL、媒体 URL或业务密钥；
- 本地环境：Chrome、ffmpeg、ffprobe、Python venv、boto3、浏览器 profile 和私密配置均通过预检；
- 系统代理：Vercel、DashScope、R2 可走代理，PKU 媒体可独立选择直连或代理；
- 恢复：稳定 workerId、单实例锁、启动宽限、停滞检测、断点复用、逐次降并发、新鲜报告判断。

## 当前真实回归目标

- 课程：国际法学
- 标题：`2026-06-03第5-6节`
- Replay：`replay-d65da69830f79ffb30fd089f`
- 教师：陈晓航

已成功完成登录、课程扫描、唯一定位、精确领取、进入 `downloading` 和捕获 HLS M3U8。

当前外部阻塞为教学网媒体服务器不稳定。尚未进入 Paraformer，因此没有重复 ASR 费用。

## Final RC1 关键命令

```bash
yarn course:pipeline:e2e-final \
  --course "国际法学" \
  --title "2026-06-03" \
  --replay-key "replay-d65da69830f79ffb30fd089f"
```

查看现场：

```bash
yarn course:pipeline:e2e-inspect \
  --replay-key "replay-d65da69830f79ffb30fd089f"
```

PKU 直连失败时：

```bash
COURSE_MEDIA_ROUTE=proxy \
  yarn course:pipeline:e2e-final \
  --course "国际法学" \
  --title "2026-06-03" \
  --replay-key "replay-d65da69830f79ffb30fd089f"
```

## 最终验收门槛

### 单任务真实回归

- 下载阶段持续出现资源和字节增长；
- 生成有效 `media.mp4`；
- Paraformer 完成并保留 `raw-transcript.md`；
- 生成并保留 `course-textpack.json`；
- 最终 stage 为 `awaiting_llm_window`；
- `media.mp4` 和 `fragments/` 被清理；
- 回归报告与 supervisor summary 完整。

### 双任务中断恢复

- 两条任务进入队列；
- 第一条运行中主动终止 Worker；
- 租约、断点和完整分片可恢复；
- 重启后只继续未完成阶段；
- 第二条不会被错误领取或重复处理；
- 两条任务最终均进入正确阶段。

## 生产边界

- Mac 只用于开发、认证恢复和临时真实验证；
- 生产 Worker 部署到按需启动的远程环境；
- 持久卷保存 profile、检查点和未完成中间件；
- 调度每日 2—4 次，处理后清理并退出；
- 视频和分片不长期保存；
- DeepSeek 继续遵守既定错峰窗口，不降低模型质量。

本记录不包含密码、Cookie、Token、签名 URL 或密钥。
