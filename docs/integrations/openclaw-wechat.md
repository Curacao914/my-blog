# OpenClaw 微信入口

## 当前结论

第一版使用微信 ClawBot 作为入口：

```text
微信 ClawBot
→ openclaw-weixin
→ law-tech-wechat-relay
→ /api/schedule/capture
→ Law-Tech 日程解析
→ Supabase
→ replyText 回到微信
```

公众号文章采用复制链接后粘贴给 ClawBot 的方式。微信客户端实测无法直接把公众号文章卡片转发给 ClawBot，因此第一版不继续消耗时间研究文章卡片转发。

## Law-Tech 侧

接口：

```text
POST /api/schedule/capture
```

请求头：

```http
Authorization: Bearer <WECHAT_CAPTURE_TOKEN>
Content-Type: application/json
Idempotency-Key: wechat:<senderId>:<messageId>
```

请求体：

```json
{
  "command": "明天晚上七点和师兄吃饭",
  "source": "wechat-clawbot",
  "senderId": "微信发送者标识",
  "messageId": "微信消息唯一标识"
}
```

响应体包含 `replyText`。OpenClaw 只把这个字段发回微信，不自行编写成功文案。

## 本地 Relay

目录：

```text
integrations/openclaw/law-tech-wechat-relay
```

核心函数：

```js
handleWechatInbound(envelope)
```

它返回：

```json
{
  "claimed": true,
  "stopAgent": true,
  "replyText": "已添加日程：和师兄吃饭\n时间：明天 19:00"
}
```

接入 OpenClaw 时必须选择能阻止 Agent 的入站 hook。若当前 OpenClaw 版本不能暴露该 hook，不退回 Agent 调工具方案。

## 服务器

`law-tech.dev` 继续部署在 Vercel。OpenClaw 需要常驻进程，不能长期放在 Vercel Function。

上线顺序：

1. 先用 Mac 跑通完整链路；
2. 部署 Law-Tech 到 Vercel；
3. 线上 curl 验证 `/api/schedule/capture`；
4. 微信端到端验证；
5. 再购买或迁移到低配长期服务器。
