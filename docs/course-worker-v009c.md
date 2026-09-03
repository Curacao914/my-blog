# Course Worker V009C：错峰与连续任务编排

## 本轮范围

V009C 第一阶段先完成两个不会受教学网临时波动影响的基础层：

1. DeepSeek Pro 错峰调度；
2. 多课程完整生产线状态模型。

现有课程工作台已经具备 TextPack 导入与完整笔记工作流，本轮不另建笔记生成器。

## DeepSeek Pro 调度

默认：

```text
模型：deepseek-v4-pro
时区：Asia/Shanghai
高峰：09:00–12:00、14:00–18:00
模式：economy
边界缓冲：10 分钟
```

### 经济模式

实际禁止启动区间：

```text
08:50–12:10
13:50–18:10
```

课程 Worker 在领取到模型任务后先检查价格窗口。处于禁止区间时：

```text
reason = waiting-llm-window
nextAction = busy
retryAfterMs = 距离下一个低价窗口的毫秒数
```

Workflow 使用持久 sleep，不占用浏览器或计算资源，到点自动恢复。

### 标准模式

只避开官方高峰，不增加边界缓冲。

### 立即处理

忽略价格窗口。只应由用户主动切换。

## 为什么在批次前检查

每个课程批次最多并发少量节点任务。经济模式提前十分钟停止新批次，足以覆盖当前默认模型超时；批次结束后再次检查，避免在高峰内继续领取后续节点。

## 完整生产线状态

```text
discovered
→ queued
→ downloading
→ downloaded
→ transcribing
→ transcript_ready
→ building_textpack
→ textpack_ready
→ uploading
→ uploaded
→ awaiting_llm_window
→ writing
→ cleanup
→ completed
```

异常状态：

```text
failed
needs_attention
```

## 多课程规则

- 一次扫描发现的所有新回放全部入队；
- replayKey 保证幂等；
- 默认按课次时间从旧到新；
- 下载任务并发 1，单课分片并发 6；
- ASR 并发 1；
- 一门课失败不阻塞其他课程；
- 教学网临时网络错误不消耗业务重试次数；
- 密码失效进入 needs_attention；
- 高峰计价进入 awaiting_llm_window；
- 每次阶段成功后原子保存状态；
- 成功上传后再清理临时媒体。

## 下一阶段

1. 将 V007 完整下载适配为 `downloading → downloaded`；
2. 将 V004 Paraformer 适配为 `transcribing → transcript_ready`；
3. 生成 transcript-only `course-textpack.v1`；
4. POST `/api/courses/textpack`；
5. 上传成功后启动现有课程 Workflow；
6. Workflow 受本轮价格窗口控制；
7. 完成后删除视频、音频和分片；
8. 在 `/desk/courses` 展示简洁状态与异常入口。

## 部署边界

- 不合并 `main`；
- 在 `codex/homepage-phase1` 本地或 Preview 验证；
- 正式 Worker 使用远程 Secret 和持久卷；
- 用户 Mac 只用于开发验证与故障排查。
