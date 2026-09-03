# V009C 第四阶段：原子领取与流水线 Runner

## 本轮目标

课程扫描器已经能将全部新回放登记到 Supabase。第四阶段解决多个 Worker
可能同时拿到同一门课的问题，并建立完整处理链的统一 Runner。

## 原子领取

Supabase RPC 使用：

```text
FOR UPDATE SKIP LOCKED
```

一次只领取最早的可执行任务。任务写入：

```text
claimed_by
lease_expires_at
heartbeat_at
```

Worker 崩溃后，租约到期，另一实例可以继续领取。不会永久锁死，也不会让
两个 Worker 同时处理同一回放。

## Runner

```text
claim
→ downloading
→ downloaded
→ transcribing
→ transcript_ready
→ building_textpack
→ textpack_ready
→ uploading
→ uploaded
→ cleanup
→ awaiting_llm_window
```

Runner 每次只处理一门课，处理完后继续领取下一门。单门课程内部仍可由
下载 Adapter 使用六路分片并发。

## Adapter 接口

真实处理组件通过一个 Adapter 接入：

```js
export default {
  download,
  transcribe,
  buildTextpack,
  upload,
  cleanup
}
```

每个方法返回：

```js
{
  artifacts: {
    // 稳定 object key、checksum、job ID
  },
  runtime: {
    // 时长、字数、字节数等
  }
}
```

不得返回 Cookie、Authorization、播放 token、签名 URL 或教学网 URL。

## 错误分类

- 学校服务器或网络临时异常：回到 `queued`，延迟重试，不消耗业务次数；
- 登录或密码失效：进入 `needs_attention`；
- Adapter 尚未配置：进入 `needs_attention`；
- 其他处理错误：进入 `failed`，保留阶段和产物。

## 本轮不做真实媒体处理

第四阶段只建立可靠的调度骨架和原子租约。第五阶段将已经验证过的：

- V008/V009 回放重新定位；
- V007 六路完整下载；
- V004 Paraformer；
- TextPack 上传；
- 媒体清理；

实现成正式 Adapter。这样网络恢复后只需验证 Adapter，不再一边调网络，
一边修改队列与数据库。
