# Course Worker V009C Final RC1

Final RC1 将此前分散的本地急救脚本收敛为仓库内的正式恢复入口。

## 新增能力

- 单实例锁，重复启动立即阻止；
- 对同一 replay 使用稳定 workerId；
- 每轮启动重新计算停滞时间，不读取旧分片 mtime；
- 240 秒启动宽限，480 秒无进展才判定停滞；
- 并发按 `3 → 2 → 2 → 1 → 1` 降级；
- 完整分片复用，`.part` 自动清理；
- 每个资源完成后写入脱敏 `download-progress.json`；
- 只读取本轮启动后的 E2E 报告；
- `queued` 与网络错误自动重试，`needs_attention` 停止；
- Vercel、DashScope、R2 与 PKU 媒体支持分流路由；
- 生成 supervisor summary；
- 提供现场检查命令。

## 运行

```bash
yarn course:pipeline:e2e-final \
  --course "国际法学" \
  --title "2026-06-03" \
  --replay-key "replay-d65da69830f79ffb30fd089f"
```

## 路由

默认：

```text
COURSE_PROXY_MODE=auto
COURSE_MEDIA_ROUTE=direct
```

即外部控制面与云服务跟随系统代理，`pku.edu.cn` 绕过代理直连。媒体直连失败时临时使用：

```text
COURSE_MEDIA_ROUTE=proxy
```

远程 Worker 通常使用：

```text
COURSE_PROXY_MODE=off
COURSE_MEDIA_ROUTE=inherit
```

## 发布状态

该版本是代码完整 RC，不是未经验证的生产完成声明。教学网恢复后，必须完成交接记录中的两个验收门槛，之后才能合并到生产分支并部署远程 Worker。
