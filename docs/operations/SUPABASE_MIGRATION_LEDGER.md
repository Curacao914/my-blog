# Supabase 迁移账本

本文件只记录事实。初始状态全部标为“未核验”，不能因为 SQL 文件存在就填为已执行。

| Migration | Preview | Production | 执行时间/操作者 | 回滚或兼容说明 |
| --- | --- | --- | --- | --- |
| `20260624_schedule_cloud.sql` | 未核验 | 未核验 | 待补 | 待补 |
| `20260624_wechat_capture.sql` | 未核验 | 未核验 | 待补 | 待补 |
| `20260625_reading_notes.sql` | 未核验 | 未核验 | 待补 | 待补 |
| `20260625_reminders.sql` | 未核验 | 未核验 | 待补 | 待补 |
| `20260625_schedule_semantics.sql` | 未核验 | 未核验 | 待补 | 待补 |
| `20260628_multi_user_workspace.sql` | 未核验 | 未核验 | 待补 | 待补 |
| `20260628_notion_relay.sql` | 未核验 | 未核验 | 待补 | 待补 |
| `20260628_reminder_preferences.sql` | 未核验 | 未核验 | 待补 | 待补 |
| `20260630_message_deliveries.sql` | 未核验 | 未核验 | 待补 | 待补 |
| `20260701_notification_and_integration_repair.sql` | 未核验 | 未核验 | 待补 | 待补 |

## 核验流程

1. 分别导出 Preview 与 Production 的 schema-only 快照。
2. 对照表、列、索引、约束、触发器和 RLS，而不只检查表名。
3. 记录手工变更和 migration 之外的漂移。
4. 创建发布前数据备份，并在隔离项目完成一次恢复演练。
5. 只有恢复演练成功后，才把“回滚方式”写成可执行命令。

## 禁止事项

- 本集成包不会连接 Supabase，也不会执行任何 SQL。
- 不允许在 Production 直接试跑未知 migration。
- 不把课程简报存在、微信发送成功等间接证据替代完整 schema 核验。
