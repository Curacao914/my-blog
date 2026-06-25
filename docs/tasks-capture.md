# 事项快速收集

## 当前状态

第一版事项系统已经接入数据库：

- `/desk` 中的快速收集面板会写入 Supabase `tasks` 表。
- `/api/tasks/capture` 可供网页登录态调用。
- 同一个接口也支持 iOS 快捷指令、外部脚本等入口，使用 `TASK_CAPTURE_TOKEN` 作为轻量口令。

## 接口

```text
POST /api/tasks/capture
```

请求体：

```json
{
  "rawText": "周五下午三点提醒我整理刑诉课第二讲材料，地点在图书馆，材料在桌面/课程/刑诉"
}
```

外部入口请求头二选一：

```text
Authorization: Bearer <TASK_CAPTURE_TOKEN>
```

或：

```text
x-law-tech-capture-token: <TASK_CAPTURE_TOKEN>
```

## 已做的轻量解析

当前不接 AI，只做可控规则解析：

- 标题：取第一行，过长截断。
- 类型：课程、写作、科研、学生工作、行政、生活。
- 优先级：识别“紧急、重要、ddl、deadline、不急、有空”等表达。
- 时间：识别今天、明天、后天、周几、几月几日、`YYYY-MM-DD`。
- 时间点：识别上午/下午/晚上 + 几点/几点半/`15:30`。
- 提醒：识别“提醒/通知”，以及“提前一小时/提前30分钟/提前一天”。
- 地点：识别“地点在……”以及常见地点词。
- 链接：抽取 `http/https` 链接。
- 文件线索：抽取 `/Users/...`、`桌面/...`、`Documents/...` 等路径和“材料在……”提示。

解析失败不会丢弃原文；原始文本始终写入 `raw_text` 和 `notes`。

## iOS 快捷指令第一版建议

快捷指令动作：

1. “询问输入”，提示为“收进事项”。
2. “获取 URL 内容”：
   - 方法：POST
   - URL：`https://law-tech.dev/api/tasks/capture`
   - 请求体：JSON
   - 字段：`rawText = 询问输入`
   - 请求头：`Authorization = Bearer <TASK_CAPTURE_TOKEN>`
3. 根据返回 JSON 显示“已收进事项”或错误提示。

后续可以继续扩展为分享表单入口、图片/文件入口、AI 二次整理和真实通知发送。

## 外部入口 / 微信适配器预留

为了不把事项系统绑死在某一种微信能力上，第一版新增统一外部入口：

```text
POST /api/tasks/inbox/:channel
```

可用示例：

```text
POST /api/tasks/inbox/ios
POST /api/tasks/inbox/wechat
POST /api/tasks/inbox/wecom
```

认证方式仍然使用同一个 `TASK_CAPTURE_TOKEN`：

```text
Authorization: Bearer <TASK_CAPTURE_TOKEN>
```

支持的请求格式：

- JSON：`rawText` / `text` / `content` / `message`
- 表单：`rawText=...`
- 简单 XML：读取 `Content`、`FromUserName`、`MsgId`、`PicUrl`
- 纯文本：整个 body 作为事项原文

JSON 示例：

```json
{
  "content": "明天下午三点提醒我整理刑诉课第二讲材料，地点在图书馆",
  "from": "wechat-openid-or-alias",
  "msgId": "optional-message-id"
}
```

返回的事项会记录：

- `source`: `ios` / `wechat` / `wecom` / 其他 channel
- `source_user`
- `source_message_id`
- `attachments`

注意：这不是企业微信/公众号官方“加密回调”的完整实现。它是稳定的中转入口，适合：

- iOS 快捷指令直接 POST；
- 企业微信群机器人或自建转发服务 POST；
- 公众号/企业微信服务器收到消息并解密后，再转发到此接口。

后续如果要直连企业微信加密回调，需要额外实现签名校验、AES 解密和 token/encodingAESKey 配置。

## 提醒队列

`tasks` 表现在有两个提醒字段：

- `remind_at`：应该提醒的时间，由自然语言解析或手动编辑生成。
- `reminder_sent_at`：已经成功发出提醒的时间。

本地检查命令：

```bash
npm run tasks:reminders:due
```

这个命令只列出已经到提醒时间、且未标记已提醒的事项，不会实际发送通知。

如果外部通知器已经成功发送，可以标记为已提醒：

```bash
npm run tasks:reminders:due -- --mark-sent
```

后续可接的通知通道：

- 邮件：最简单，适合第一版稳定提醒。
- PWA 通知：适合网页端，但 iOS 权限和后台能力有限。
- 企业微信机器人：适合微信生态兜底。
- 短信：可靠但需要付费服务。

当前推荐顺序：先邮件或企业微信机器人，后续再补 PWA。

### 企业微信机器人发送

配置环境变量：

```bash
WECOM_BOT_WEBHOOK=https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=...
```

先 dry-run 查看会发送什么：

```bash
npm run tasks:reminders:send
```

实际发送到企业微信机器人：

```bash
npm run tasks:reminders:send -- --channel wecom --send
```

发送成功后默认会把这些事项标记为 `reminder_sent_at`，避免重复提醒。

如果只是测试发送，不想标记：

```bash
npm run tasks:reminders:send -- --channel wecom --send --no-mark
```

这仍然不是“把机器人放进微信首页”的最终体验；它解决的是提醒通道。微信首页入口后续可继续走 iOS 快捷指令、企业微信会话置顶、或自建中转服务。

### 云端触发 API

为了后续接 Vercel Cron / 外部定时器，新增：

```text
POST /api/tasks/reminders/send
```

认证二选一：

- 已登录管理员；
- `Authorization: Bearer <TASK_REMINDER_TOKEN>`

dry-run 请求：

```json
{
  "channel": "console",
  "send": false
}
```

企业微信发送：

```json
{
  "channel": "wecom",
  "send": true,
  "mark": true
}
```

`mark: true` 表示发送成功后写入 `reminder_sent_at`，避免重复提醒。
如果只是测试发送，可传 `mark: false`。

此 API 默认不会发送；必须显式传 `send: true`。
