# Course Worker V009C Final RC2

Final RC2 在 RC1 的稳健下载与恢复基础上增加“本地媒体旁路”。当教学网媒体服务器不可用时，可使用已经下载的视频跳过 HLS 阶段，从 `downloaded` 继续 Paraformer、TextPack、工作台导入、笔记流程和清理。

## 本地媒体安全策略

- 只扫描 `~/.law-tech-course-worker`、Downloads、Movies 和 Desktop；
- 默认只考虑近期、体积较大的媒体文件；
- 使用 ffprobe 检查时长、体积和音轨；
- 自动选择只有唯一高置信候选时才继续；
- 多个相似视频时停止并列出候选，不猜；
- 优先使用硬链接，跨卷时使用 APFS clone/copy；
- Worker 清理只删除 scratch 链接，不删除原视频；
- 控制面只保存 scratch 相对路径、校验值和媒体统计，不保存本地绝对路径。

## 命令

```bash
yarn course:pipeline:e2e-find-media
```

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

本入口完全绕过教学网；但 Paraformer 和 R2 是真实调用，会产生对应费用。
