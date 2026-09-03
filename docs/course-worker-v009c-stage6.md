# V009C 第六阶段：真实单课端到端回归

## 目标

第五阶段已经将真实下载、Paraformer、TextPack 和自动笔记接入正式 Runner。
第六阶段提供一个受控回归工具，只领取用户明确指定的一条回放，避免测试时
顺手把整个队列都处理了。

## 数据流

```text
登录并扫描当前学期课程
→ 安全列出候选回放
→ 精确选择 replayKey
→ 幂等登记控制面
→ 原子领取这一条任务
→ 下载
→ 转录
→ TextPack
→ 工作台导入
→ 清理视频和分片
→ awaiting_llm_window
→ 写入脱敏回归报告
```

## 安全边界

候选列表不包含 `watchHref`、课程内部 ID、Cookie、JWT 或 Authorization。
回归报告会删除 secret-shaped 字段并将 URL 替换为占位符。

## 预检

```bash
npm run course:pipeline:e2e-preflight
```

检查：

- Node 20；
- Chrome/Chromium；
- ffmpeg / ffprobe；
- Python 和 boto3；
- 控制面连通性；
- 教学网凭证或可复用 profile；
- 至少 5GB scratch 空间；
- Paraformer 与临时 R2 环境变量。

## 列出候选

```bash
npm run course:pipeline:e2e-list -- \
  --course "国际法学"
```

输出仅包含安全元数据。

## 跑一条

```bash
npm run course:pipeline:e2e-one -- \
  --course "国际法学" \
  --title "2026-06-03"
```

也可直接指定：

```bash
npm run course:pipeline:e2e-one -- \
  --replay-key "replay-..."
```

必须精确匹配唯一回放；匹配到零条或多条都会停止。

## 报告

默认写入：

```text
~/.law-tech-course-worker/reports/<replayKey>-<timestamp>/
```

包含：

```text
report.json
report.md
```

报告不进入 Git 仓库。

## 成功标准

```text
final stage = awaiting_llm_window
media.mp4 不存在
fragments/ 不存在
raw-transcript.md 存在
course-textpack.json 存在
courseJobId 已写入任务 artifacts
```

## 下一步

单课通过后，只剩：

1. 两课队列与主动中断恢复回归；
2. 远程容器、持久卷、定时扫描、通知与分支整合。
