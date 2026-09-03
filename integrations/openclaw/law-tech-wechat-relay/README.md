# Law-Tech WeChat Relay

这个目录是 OpenClaw 微信入口的本地接入层。

职责只有四个：

1. 接收 `openclaw-weixin` 的入站消息；
2. 提取文本、链接、发送者和消息 ID；
3. 调用 Law-Tech 的 `/api/schedule/capture`；
4. 把 Law-Tech 返回的 `replyText` 原样回复给微信。

它不调用大模型，不访问 Supabase，不读取文件，不打开浏览器，也不使用 OpenClaw Agent 工具。

## 环境变量

```env
LAW_TECH_CAPTURE_URL=https://law-tech.dev/api/schedule/capture
WECHAT_CAPTURE_TOKEN=
```

本地测试可以把 `LAW_TECH_CAPTURE_URL` 改成：

```env
LAW_TECH_CAPTURE_URL=http://localhost:3010/api/schedule/capture
```

## 本地核心测试

```bash
cd integrations/openclaw/law-tech-wechat-relay
npm test
```

## OpenClaw 接入点

优先接入能阻止 Agent 的入站认领 hook，例如 `inbound_claim`。核心函数是：

```js
import { handleWechatInbound } from './src/index.js'
```

接入层需要把 OpenClaw 的入站 envelope 传入 `handleWechatInbound(envelope)`，并把返回的 `replyText` 发回微信，同时停止本条消息继续进入 Agent。

如果当前 OpenClaw 版本没有暴露可阻止 Agent 的 channel hook，不要退回“让 Agent 调工具”的方案；应等可用 hook 或使用 OpenClaw 官方 channel/plugin API 做适配。
