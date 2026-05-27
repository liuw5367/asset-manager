# AGENTS.md

This file provides guidance to agent when working with code in this repository.

## 语言规则

始终使用中文回复用户。

## 架构要点

### 路由与数据层

- 路由定义在 `app/routes.ts`，使用 React Router v7 配置式路由。每个路由文件导出 `loader`（服务端数据）和 `action`（变更操作）。
- 认证路由共享 `app-shell.tsx` 布局，loader 中检查 Supabase session，未登录重定向到 `/login`。
- **优先客户端渲染**，loader/action 仅作数据接口，不做 SSR 页面渲染。

### 数据库约定

- Drizzle schema 定义在 `app/db/schema.ts`，查询在 `app/db/queries/`。
- **无外键约束**：表中存储关联字段（如 `user_id`、`asset_id`）但不声明 `REFERENCES`，关联查询由 Drizzle ORM 在应用层处理。建表 SQL 见 `docs/db-init.sql`。
- **软删除**：所有查询必须过滤 `deleted_at IS NULL`，禁止硬删除用户数据。
- **金额计算**：使用 `currency.js` 做精确计算，禁止裸浮点数运算。核心逻辑见 `app/lib/cost.ts`。

### UI 规范

- 使用 shadcn/ui 组件 + Tailwind v4，避免使用原生 HTML 元素（`<button>`、`<input>`）。
- **认证页面例外**：`/login`、`/register`、`/forgot-password` 使用原生 HTML 元素 + CSS 变量（`--color-*`），不使用 shadcn 组件。设计规范见 `docs/DESIGN.md`。
- `app/components/ui/` 下的文件允许自由 re-export（ESLint 规则 `react-refresh/only-export-components` 已禁用）。
- 按钮异步操作必须有独立 loading 状态（`disabled` + spinner），禁止因一个按钮 loading 而禁用全页按钮。
- 路由切换时顶部显示 NProgress 进度条。
- 响应式：桌面端侧边栏，移动端底部 Tab。

### 认证

Supabase Auth，每请求创建 client（`app/lib/supabase.server.ts`）。支持 GitHub/Google OAuth + 邮箱密码。用户注册时通过数据库触发器自动初始化 profile、预设分类和支付方式。

### 邮件提醒（未实现）

数据库表 `reminder_jobs` 和 UI 已就绪，但 cron 端点和邮件发送逻辑尚未实现。预期架构：Vercel Cron → API route → Resend 发送。两种提醒：订阅续费和保修到期。

## 开发流程

1. 开发前先创建 GitHub Issue，需求细节参考 `docs/REQUIREMENT.md`。
2. 提交前必须通过 `pnpm typecheck` 和 `pnpm lint`，零错误。
3. 推送后创建 PR，合并前运行 `/check` 做最终审查。

## 关键文件

| 路径 | 用途 |
|---|---|
| `app/routes.ts` | 路由配置 |
| `app/db/schema.ts` | Drizzle schema |
| `app/db/queries/` | 数据库查询 |
| `app/lib/supabase.server.ts` | Supabase 服务端 client |
| `app/lib/cost.ts` | 每日持有成本计算 |
| `app/lib/asset.schema.ts` | 资产表单 Zod schema |
| `app/components/layout/app-shell.tsx` | 认证布局壳 |
| `app/components/ui/` | shadcn/ui 组件 |
| `docs/REQUIREMENT.md` | 完整产品需求 |
| `docs/holdly-prototype.html` | HTML 交互原型 |
| `docs/DESIGN.md` | 应用设计规范 |
| `docs/DESIGN-CLAUDE.md` | 品牌设计体系 |
| `docs/db-init.sql` | 数据库初始化 SQL |
