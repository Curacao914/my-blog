# Law-Tech Course Worker V009C：2026-06-30 交接记录

## 当前仓库与阶段

- 仓库：`Curacao914/my-blog`
- 分支：`codex/course-worker-v009c`
- Final RC2 基线提交：`e612b459d7cb740d98055f602d7b207fd246ad7f`
- 当前阶段：完整 Release Candidate，支持教学网下载和本地媒体旁路两条入口。
- 仍不能标记为 production complete：需要完成本地媒体下游真实回归，并在教学网恢复后完成下载入口与双任务恢复验收。

## 已完成能力

- 控制面：课程发现、队列、精确领取、租约、心跳、阶段报告和重试；
- Worker：教学网登录复用、扫描、HLS、断点下载、ffmpeg、Paraformer、TextPack、上传和清理；
- 恢复：稳定 workerId、单实例锁、启动宽限、停滞检测、逐次降并发和新鲜报告判断；
- 网络：Vercel、DashScope、R2 与 PKU 媒体分流；
- 本地媒体旁路：自动发现已下载课程视频、ffprobe 验证、硬链接或 APFS clone 导入、控制面标记为 `downloaded`，从 Paraformer 开始继续整条流水线；
- 下游旁路不打开教学网，也不需要重新捕获 M3U8。

## 当前真实回归目标

- 课程：国际法学
- 标题：`2026-06-03第5-6节`
- Replay：`replay-d65da69830f79ffb30fd089f`
- Course：`course-9c03d5e0f6d314d4eb6f66a0`
- 教师：陈晓航
- 开课时间：`2026-06-03 13:00:00`

教学网入口已完成登录、唯一定位、精确领取、进入 `downloading` 和捕获 HLS。媒体服务器持续不稳定，因此 Final RC2 优先使用此前成功下载的视频验证下游。

## 本地媒体下游命令

先查找候选：

```bash
yarn course:pipeline:e2e-find-media
```

自动选择并从转录开始跑到底：

```bash
yarn course:pipeline:e2e-from-media \
  --media auto \
  --expected-duration 10774 \
  --course "国际法学" \
  --course-key "course-9c03d5e0f6d314d4eb6f66a0" \
  --title "2026-06-03第5-6节" \
  --starts-at "2026-06-03 13:00:00" \
  --teacher "陈晓航" \
  --replay-key "replay-d65da69830f79ffb30fd089f" \
  --worker-id "e2e-192.168.1.18-82522"
```

自动发现出现多个候选时，使用：

```bash
yarn course:pipeline:e2e-from-media \
  --media "/绝对路径/课程视频.mp4" \
  --course "国际法学" \
  --course-key "course-9c03d5e0f6d314d4eb6f66a0" \
  --title "2026-06-03第5-6节" \
  --starts-at "2026-06-03 13:00:00" \
  --teacher "陈晓航" \
  --replay-key "replay-d65da69830f79ffb30fd089f" \
  --worker-id "e2e-192.168.1.18-82522"
```

## 本地媒体旁路成功标准

- ffprobe 确认媒体包含音轨且时长合理；
- 视频通过硬链接或 clone/copy 写入 Worker scratch；
- 控制面 stage 进入 `downloaded`；
- Paraformer 完成并保留 `raw-transcript.md`；
- 生成并保留 `course-textpack.json`；
- TextPack 导入工作台并启动笔记流程；
- 最终 stage 为 `awaiting_llm_window`；
- scratch 中 `media.mp4` 与 `fragments/` 被清理；
- 原始本地视频不被删除；
- 报告写入 `~/.law-tech-course-worker/reports/`。

## 仍需最终验收

1. 本地媒体下游真实回归；
2. 教学网恢复后的完整下载入口；
3. 两任务中断恢复；
4. 远程按需 Worker 部署与调度；
5. 验收后再合并生产分支。

本记录不包含密码、Cookie、Token、签名 URL 或密钥。
