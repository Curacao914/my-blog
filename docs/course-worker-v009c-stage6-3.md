# V009C 6.3：系统代理自动接管与真实回归入口

本轮将已经验证成功的 macOS 系统代理方案正式接入 Worker。显式代理优先，
其次读取 macOS 系统 HTTP/HTTPS 代理，最后才直连。Node 网络任务会在启动时
启用 `--use-env-proxy`；Python 子进程继承相同的代理环境。

统一接管的命令包括控制面同步、状态查询、流水线 Runner、真实 Adapter、
预检、候选列表和单课回归。远程 Worker 可设置 `COURSE_PROXY_MODE=off` 使用
固定出口直连。

真实单课回归：

```bash
yarn course:pipeline:e2e-pilot \
  --course "国际法学" \
  --title "2026-06-03"
```

该命令会真实下载回放、调用 Paraformer、上传 TextPack、启动现有笔记流程并
清理媒体，只领取唯一匹配的一条任务。
