# 常驻服务器迁移范围

## 第一批应迁移

- OpenClaw Gateway。
- `@tencent-weixin/openclaw-weixin` 与微信配对持久状态。
- `law-tech-wechat-relay` 入站桥接与 outbound queue consumer。
- Cloudflare Tunnel 或受控 HTTPS 入口。
- heartbeat、日志轮换、进程守护、磁盘与队列告警。
- 加密后的 Secret 注入与持久卷备份。

## 评估后可迁移

- 课程媒体下载、转码、ASR 和长任务 Worker。当前 GitHub Actions 可继续承担已验证任务；只有在运行时长、临时磁盘、网络或费用成为真实瓶颈时再迁移。
- OCR 服务。需先比较现有 Hugging Face Space 的稳定性、冷启动与成本。

## 保留现状

- Vercel：Next.js 公共站、私人工作台和 API 控制面。
- Supabase：数据库与现有数据能力。
- GitHub Actions：默认分支上的计划任务入口，直到服务器 Worker 完成等价验收。
- iOS 提醒事项：具体时刻且紧急的提醒。Law-Tech 只保留日期事项每日摘要，不实现精确时刻微信轮询。

## 切换纪律

1. 备份 `~/.openclaw`、插件配置、配对状态和 LaunchAgent。
2. 云端启动前停止 Mac outbound consumer，禁止双消费。
3. 验证入站、queue claim/send/ack、Markdown、重启恢复和心跳。
4. Mac 断网/关机验收后仍保留本地回退配置至少一周。
5. 稳定后再迁移课程重 Worker；不得在一次切换中同时更换消息链路和课程执行环境。
