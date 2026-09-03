# 邮件提醒部署与验收

更新时间：2026-06-28

邮件提醒现已按工作区成员隔离。每位用户分别保存收件邮箱、提醒偏好与自己的 Resend 配置；管理员的环境变量只作为管理员本人兼容旧部署的兜底，普通成员不会共享或消耗管理员的邮件发送额度。

## 一、产品行为

- `/desk/system` 的“邮件与提醒”对拥有 `reminders` 权限的当前身份开放。
- 每位用户分别配置接收邮箱、Resend API Key、发件人、每日安排、未来 24 小时提醒与周一回顾。
- 提醒读取当前用户自己的 `schedule_items`、`reminders`、`reminder_events` 与 `reminder_preferences`。
- Cron 可以跨用户扫描，但为每个有效 owner 单独生成邮件；内容、收件人、发送凭据和发送记录都不会混用。
- 第一版时间固定为北京时间上午 9:00 左右。更细的时区与发送时间属于后续 System 设置深化。
- 普通成员未保存自己的 Resend 配置时，测试邮件和定时邮件会明确提示未配置；不会退回管理员的全局 Key。

## 二、数据库迁移顺序

先执行第一版提醒偏好迁移：

```text
lib/db/migrations/20260628_reminder_preferences.sql
```

再执行多用户工作区迁移：

```text
lib/db/migrations/20260628_multi_user_workspace.sql
```

后者会创建 `user_integrations`，用于加密保存每位用户自己的 Resend 与 AI 配置，并补齐工作区身份、角色、状态、权限和数据所有权。

## 三、服务端环境变量

多用户版本必须配置：

```text
USER_SECRETS_ENCRYPTION_KEY=<64 位十六进制稳定密钥>
CRON_SECRET=<至少 32 字节的随机值>
```

生成示例：

```bash
openssl rand -hex 32
```

`USER_SECRETS_ENCRYPTION_KEY` 在用户保存配置后不能随意轮换，否则已有密文将无法解密。两项都只能配置在服务端，不能添加 `NEXT_PUBLIC_` 前缀。

管理员兼容兜底可以继续保留：

```text
RESEND_API_KEY=re_...
REMINDER_FROM=Law-Tech <reminders@law-tech.dev>
REMINDER_TO=<可选旧版兜底邮箱>
```

这些全局值只允许真实 owner 身份使用。成员必须在 `/desk/system` 保存自己的 Resend Key 和发件人。正式发件地址仍需在对应 Resend 账户中验证域名。

## 四、Vercel Cron

`vercel.json` 中的调度为：

```json
{
  "path": "/api/reminders/run",
  "schedule": "0 1 * * *"
}
```

Vercel Cron 使用 UTC，因此 `01:00 UTC` 对应北京时间 `09:00`。Cron 只自动调用生产部署；开发分支 Preview 应使用测试按钮或带 Bearer Token 的手动请求验收。

## 五、双账户 Preview 验收

1. 以 owner 登录，在 System 保存 owner 的邮件配置并发送测试邮件。
2. 邀请测试成员并切换为该成员身份，确认 owner 的 Key 只显示“未配置”或成员自己的尾号，不能读取完整值。
3. 为成员保存另一组 Resend 配置和收件邮箱，再发送测试邮件。
4. 分别创建 owner 与 member 的日程，手动调用 runner：

```bash
curl --fail-with-body \
  -H "Authorization: Bearer $CRON_SECRET" \
  "https://<preview-domain>/api/reminders/run?now=2026-06-29T01:00:00.000Z"
```

5. 确认两封邮件分别只包含对应用户的数据，且分别使用各自的发件配置。
6. 暂停成员后再次调用 runner，确认该成员不会继续收到摘要。
7. 同一天重复调用时，每位用户的每日摘要均不得重复发送。

## 六、安全边界

- API Key 只以 AES-256-GCM 密文保存；前端只能看到尾号，保存后不能取回完整值。
- Cron 的跨用户扫描只使用系统身份；浏览器请求不能借此读取其他用户内容。
- 日志不得记录收件人之外的邮件正文、完整 API Key、解密结果或 Bearer Token。
- 管理员身份切换用于权限和界面验收；退出切换后必须恢复 owner 身份。
