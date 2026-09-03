# 登录稳定性与 Passkey 上线检查

## 代码侧已完成

- 生产环境的工作台和登录页统一回到 `https://law-tech.dev`，避免 Vercel 别名和预览域形成不同会话。
- Clerk `authorizedParties` 在生产环境使用稳定的正式域名。
- Clerk 用户资料接口偶发失败时，继续使用已验证的 session claims，不把有效会话误判为退出。
- 客户端不再长期缓存瞬时 401、503 或网络错误；已有有效会话会保留并在窗口重新激活时复核。
- Clerk handshake 地址会从 `/api/account/session` 传回客户端。
- 账号设置增加“登录与安全”入口，可管理登录方式、会话和 Passkey。

## Clerk Dashboard 仍需一次性确认

1. 在生产实例启用 **Passkeys**。Passkey 与域名绑定，应只在 `law-tech.dev` 创建。
2. 在 **Sessions** 页面检查 Maximum lifetime。Clerk 新实例默认通常为 7 天；计划允许时可按个人工作台需求延长。
3. Inactivity timeout 可保持关闭，或设置为明显长于日常离开网站的时间。
4. 确认生产域名为 `law-tech.dev`，日常不要使用 Vercel Preview URL 登录。
5. 启用后，在工作台“账号与设置 → 登录与安全”中创建 Passkey。Mac 通常使用 Touch ID，iPhone 通常使用 Face ID。

## 验收

- 在 `law-tech.dev` 登录并刷新、重新部署、关闭浏览器后重开，账号仍保持。
- 访问生产 Vercel 别名时自动回到 `law-tech.dev`。
- 模拟 Clerk 用户资料接口失败时，已验证会话不会在界面中变为退出。
- 新建 Passkey 后退出一次，使用 Touch ID 或 Face ID 重新登录。
