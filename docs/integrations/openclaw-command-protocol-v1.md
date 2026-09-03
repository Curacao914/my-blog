# OpenClaw Command Protocol v1

## 目标

Law-Tech 微信入口先把自然语言归一为可审计、可扩展、可权限控制的命令，再调用受限能力。协议采用稀疏结构：只输出当前命令实际使用的维度；身份、权限、幂等键和传输元数据由服务端保存。

简单查询：

```json
{
  "v": 1,
  "command": {
    "domain": "schedule",
    "action": "list",
    "scope": "today"
  }
}
```

带提醒的新增命令才展开时间：

```json
{
  "v": 1,
  "command": {
    "domain": "schedule",
    "action": "create"
  },
  "temporal": {
    "timezone": "Asia/Shanghai",
    "startsAt": "2026-07-03T09:00:00+08:00"
  },
  "reminders": [
    {
      "mode": "before",
      "leadMinutes": 60,
      "remindAt": "2026-07-03T00:00:00.000Z",
      "channel": "wechat"
    }
  ]
}
```

## 正交维度

- `domain`：schedule、reading、course、content、workspace、usage、system、knowledge、conversation。
- `action`：create、update、list、search、get、complete、cancel、delete、mark_read、snooze、select、confirm、help、answer。
- `scope`：today、tomorrow、week、overdue、unread、all。
- `entity`：对象标题、对象 ID、候选序号、筛选条件。
- `temporal`：startsAt、dueAt、endsAt、durationMinutes、allDay、timezone。
- `reminders[]`：一个事项可有多个提醒；支持 at、before、absolute、trigger。
- `recurrence`：频率、间隔、星期、次数、截止日期、按计划日或完成日递推。
- `conversation`：上一轮对象、待确认动作、候选列表；默认十分钟失效。
- `execution`：读写性质、权限、确认要求和幂等信息。

## 时间规则

1. 时区固定为 `Asia/Shanghai`。
2. 当前 15:00 的“今天6点”解释为 18:00。
3. 明确写“今天”的时间已经过去时，不滚到明天，先要求确认。
4. 凌晨 00:00—04:00 的“明早 / 明天早上 / 明天上午”解释为当前自然日早上；“明天下午 / 晚上”仍为下一个自然日。
5. 所有成功写入都回显绝对时间。
6. `startsAt`、`dueAt` 与 `remindAt` 独立保存。
7. “明天9点面试，提前一小时提醒”保存事项 09:00、提醒 08:00。
8. “明天9点面试，今晚10点提醒”保存事项为明天 09:00、提醒为今晚 22:00。
9. 没有“提醒”意图时，不创建精确提醒。

## 连续对话

不等待 30 秒拼接消息。每条消息立即处理，只保存十分钟事务上下文：

- 上一次成功操作对象；
- 尚待确认的危险操作；
- 时间歧义等待补充；
- 未来查询闭环中的候选列表。

例如：

```text
用户：明天9点面试
Bot：已添加……
用户：提前一小时提醒
Bot：已修改提醒为明天08:00
```

## 执行边界

- 查询命令在第一轮只识别和阻止误写，真实查询由第二轮接通。
- 删除操作必须二次确认。
- 模型不能直接生成 SQL；后续功能只能调用注册能力。
- 精确微信提醒的主动发送属于第三轮，但第一轮已经保存其完整结构。
