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


## 主动发送

日程摘要和课程简报不经过 Agent，也不使用邮件过渡。站内将确定好的短消息写入 `message_deliveries`，本机 Relay 周期性执行：

```text
POST /api/messages/outbound/prepare
→ POST /api/messages/outbound/claim
→ openclaw message send --channel openclaw-weixin
→ POST /api/messages/outbound/:id/ack
```

本机环境变量：

```env
LAW_TECH_BASE_URL=https://law-tech.dev
WECHAT_CAPTURE_TOKEN=<与站内一致>
LAW_TECH_WECHAT_TARGET=<已配对的微信私聊目标>
```

先验证通道，不发送真实消息：

```bash
npm run outbound:probe
```

单轮发送：

```bash
npm run outbound:once
```

持续运行：

```bash
npm run outbound
```

Relay 只执行队列中的确定文本，不调用模型，不允许 Agent 改写通知。


## 2026-07-01 current runtime

The real installation is a Mac OpenClaw Gateway with `openclaw-weixin`, while
Law-Tech APIs remain on Vercel. Cloudflare Tunnel exposes only the Gateway paths
that were explicitly configured; it is not a second OpenClaw host.

The relay now has two deterministic directions:

```text
WeChat inbound -> OpenClaw plugin -> /api/schedule/capture
message_deliveries -> local outbound service -> openclaw message send -> WeChat
```

The System page stores the desired OpenClaw model. The local relay polls that
non-secret setting, applies it with `openclaw models set`, and reports a heartbeat.
`DEEPSEEK_API_KEY` remains in `~/.openclaw/.env`; it is never returned by the
Law-Tech runtime-config endpoint.

The macOS service installer is:

```bash
cd integrations/openclaw/law-tech-wechat-relay
npm run outbound:install
```
