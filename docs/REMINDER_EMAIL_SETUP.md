# 邮件提醒部署与验收

更新时间：2026-06-28

本阶段为私人工作台增加第一版邮件提醒。它复用 `schedule_items`、`reminders` 与 `reminder_events`，新增 `reminder_preferences`，不建立第二套任务数据源。

## 一、产品行为

- 工作台左侧状态卡展示浏览器本地日期和时间，以及今日事项、待办和草稿数量。
- `/desk/system` 中的“邮件提醒”只对管理员开放。
- 第一版时间固定为北京时间上午 9:00 左右。
- 可分别启用每日安排、未来 24 小时提醒和周一回顾。
- 每个拥有有效设置的 owner 每次调度最多收到一封摘要邮件。
- 私人日程只会发送到该 owner 保存的邮箱；公开页面不读取或展示邮箱设置。

## 二、数据库迁移

在 Supabase SQL Editor 中执行：

```sql
-- 文件：lib/db/migrations/20260628_reminder_preferences.sql
```

也可以直接复制该文件的完整内容执行。执行后，`/desk/system` 的数据服务卡应把 `reminder_preferences` 计入可用数据表。

## 三、环境变量

在 Vercel Preview 环境配置一份用于验收，并在准备正式启用时同步配置到 Production：

```text
RESEND_API_KEY=re_...
REMINDER_FROM=Law-Tech <reminders@law-tech.dev>
CRON_SECRET=<至少 16 字节的随机值>
```

可选兼容变量：

```text
REMINDER_TO=<旧版没有用户设置时的兜底收件邮箱>
REMINDER_RUN_TOKEN=<手动或外部调度器令牌>
TASK_REMINDER_TOKEN=<旧版提醒令牌>
```

`CRON_SECRET`、`RESEND_API_KEY` 和发送域名密钥都只能配置在服务端，不能添加 `NEXT_PUBLIC_` 前缀。

`REMINDER_FROM` 应使用已在 Resend 验证的域名。`onboarding@resend.dev` 只适合初次测试，不应作为正式发件人长期使用。

## 四、Vercel Cron

`vercel.json` 中的调度为：

```json
{
  "path": "/api/reminders/run",
  "schedule": "0 1 * * *"
}
```

Vercel Cron 使用 UTC，因此 `01:00 UTC` 对应北京时间 `09:00`。Cron 只调用生产部署；开发分支 Preview 不会自动执行这条定时任务。

免费计划的每日 Cron 可能在目标小时内任意时刻触发，因此产品文案使用“上午 9:00 左右”，不承诺 09:00:00 精确送达。

## 五、Preview 验收

1. 部署 Preview 后登录管理员工作台。
2. 打开 `/desk/system`。
3. 保存接收邮箱和三个提醒开关。
4. 点击“发送测试邮件”，确认 Resend 发件人与收件箱均正常。
5. 用 Preview 地址手动调用一次提醒 runner：

```bash
curl --fail-with-body \
  -H "Authorization: Bearer $CRON_SECRET" \
  "https://<preview-domain>/api/reminders/run?now=2026-06-29T01:00:00.000Z"
```

6. 确认返回 `status: sent`，邮件正文包含今日、明日、未来七天、待读或空状态。
7. 重复使用同一 `now` 调用时，每日摘要不应重复发送；新到期且仍为 pending 的提醒仍按设置处理。

## 六、正式启用条件

Preview 环境变量用于测试按钮和手动 runner；自动每日邮件只有在包含本阶段代码和 Production 环境变量的版本进入 Vercel Production 后才会运行。合并 `main` 前应保留手动 Preview 测试，不把“Cron 文件存在”误写为“定时邮件已经生产验证”。
