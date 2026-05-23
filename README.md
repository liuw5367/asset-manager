# Holdly

个人资产持有成本追踪应用。追踪一次性购买和订阅两种资产类型的每日持有成本。

## 技术栈

React Router v7 (Remix 模式) · Vite · TypeScript · shadcn/ui · Tailwind v4 · Drizzle ORM · Supabase · TanStack Query · Zustand

## 快速开始

```bash
pnpm install
cp .env.example .env.local   # 填入 Supabase 凭据
pnpm dev
```

## 脚本

| 命令 | 说明 |
|---|---|
| `pnpm dev` | 启动开发服务器 |
| `pnpm build` | 生产构建 |
| `pnpm start` | 启动生产服务 |
| `pnpm lint` | ESLint 检查 |
| `pnpm lint:fix` | ESLint 自动修复 |
| `pnpm typecheck` | TypeScript 类型检查（先执行 typegen） |
| `pnpm test` | 运行 Vitest 测试 |
| `pnpm db:generate` | 生成 Drizzle 迁移文件 |
| `pnpm db:push` | 推送 schema 到 Supabase |
| `pnpm db:migrate` | 执行数据库迁移 |
| `pnpm db:studio` | 打开 Drizzle Studio |

## 文档

- [产品需求文档](docs/holdly-requirements.md)
- [HTML 原型](docs/holdly-prototype.html)
- [认证页面设计规范](docs/DESIGN.md)
- [数据库初始化 SQL](docs/db-init.sql)
