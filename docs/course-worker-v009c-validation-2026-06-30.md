# Course Worker 真实验收记录（2026-06-30）

## 本地媒体下游：通过

- 课程：刑法分论
- 课次：2026-06-10第10-12节
- Replay：`replay-a69d33f3cbe20c8f7e29c368`
- 教师：王华伟
- 最终阶段：`awaiting_llm_window`
- 报告结果：`Success: yes`

阶段时间线：

```text
2026-06-30T03:36:39.234Z  downloaded
2026-06-30T03:36:41.871Z  transcribing
2026-06-30T03:40:45.470Z  transcript_ready
2026-06-30T03:40:46.659Z  building_textpack
2026-06-30T03:40:48.363Z  textpack_ready
2026-06-30T03:40:49.584Z  uploading
2026-06-30T03:41:10.171Z  uploaded
2026-06-30T03:41:11.373Z  cleanup
2026-06-30T03:41:12.583Z  awaiting_llm_window
```

清理与留存：

```text
Media deleted: yes
Fragments deleted: yes
Transcript retained: yes
TextPack retained: yes
```

由此确认完整视频可以绕过教学网下载，从 `downloaded` 继续完成 Paraformer、
TextPack、工作台导入、笔记流程启动和清理。

## 尚待验收

- 教学网恢复后的 HLS 完整下载与 ffmpeg 组装；
- 真实两任务中断、重启和顺序隔离；
- 远程按需 Worker 的首次部署与持久化 profile 验证。
