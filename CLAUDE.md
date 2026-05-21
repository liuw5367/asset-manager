# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 语言规则

始终使用中文回复用户。

## Project Overview

Holdly is a personal asset holding cost tracking app. It tracks daily cost of ownership for one-time purchases and subscriptions. Single currency, no currency symbols displayed.

## Tech Stack

- **Frontend**: React Router v7 (Remix mode) + Vite + TypeScript
- **UI**: shadcn/ui + Tailwind v4 + Radix UI + Tabler Icons
- **ORM**: Drizzle ORM (drizzle-kit migrations) on Supabase (PostgreSQL)
- **Auth**: Supabase Auth (GitHub/Google OAuth + email/password)
- **State**: react-hook-form + Zod (forms/validation), TanStack Query (client cache), Zustand (global state)
- **Utilities**: date-fns, currency.js (precise math), Recharts, Sonner (toasts), framer-motion, nuqs (URL state)
- **Email**: Resend (subscription renewal / warranty expiry reminders via Vercel Cron)
- **Lint**: ESLint via @antfu/eslint-config (React + TypeScript)
- **Test**: Vitest + React Testing Library
- **Deploy**: Vercel

## Commands

```bash
pnpm dev          # Start Vite dev server
pnpm build        # Production build
pnpm lint         # ESLint check
pnpm lint:fix     # ESLint auto-fix
pnpm test         # Run Vitest
pnpm typecheck    # TypeScript type check
pnpm db:generate  # Generate Drizzle migration
pnpm db:push      # Push schema to Supabase
```

## Architecture

### Route-based code organization (React Router v7 file conventions)

Routes live in `app/routes/`. Each route exports `loader` (server data) and `action` (mutations). Authenticated routes share a layout route that wraps Supabase session checks.

### Data layer

- **Schema**: Drizzle schema files define all tables (profiles, categories, tags, payment_types, payment_accounts, assets, asset_tags, warranties, repair_records, subscription_renewals, reminder_jobs).
- **No database foreign keys**: Tables store关联字段（如 `user_id`, `asset_id`）但不声明 `REFERENCES` / 外键约束。所有关联查询由 Drizzle ORM 在应用层处理。建表 SQL 见 `docs/db-init.sql`。
- **Soft delete**: All queries filter `deleted_at IS NULL`. Never hard-delete user data.
- **Business logic**: Daily cost calculations and trade-in math use `currency.js` for precision — never use raw floating point for financial fields.

### Rendering strategy

- **Prefer client-side rendering**. Minimize SSR usage — only use `loader` for auth checks and critical data fetching. All mutations go through `action` (server-side).
- API routes (via `loader`/`action`) serve as the data layer. Avoid exposing server rendering for pages that don't need SEO.

### UI conventions

- `app/components/ui/` holds shadcn/ui primitives. These files may re-export freely (eslint rule `react-refresh/only-export-components` is disabled for this directory).
- **Component library**: Use shadcn/ui components + Tailwind CSS v4 for all UI. Avoid raw HTML elements (`<button>`, `<input>`) — use shadcn equivalents (`Button`, `Input`, `Card`, etc.). Gradually migrate existing prototype code to shadcn components.
- **Auth pages exception**: `/login`、`/register`、`/forgot-password` 使用原始 HTML 元素（`<button>`、`<input>`、`<label>`）配合项目设计 token（`--color-*`），不使用 shadcn 组件。设计规范见 `docs/DESIGN.md`。
- **Button loading**: Every interactive button must have an independent loading state. Use the `disabled` + spinner pattern during async operations. Never disable all buttons on a page because one is loading.
- **Navigation progress bar**: Show a thin progress bar at the top of the page during route transitions. Use `NProgress` or a CSS-based equivalent integrated with React Router navigation events.
- Responsive layout: sidebar on desktop, bottom tab bar + FAB on mobile.
- Theme: next-themes (light/dark/system) with CSS custom properties.

### Auth flow

Supabase Auth with server-side sessions. The supabase client is created per-request in loaders/actions. Protected routes check session in a shared layout loader and redirect to `/login`.

### Email reminders

Scheduled via Vercel Cron → API route → Resend sends email. Two reminder types: subscription renewal and warranty expiry.

## Development Workflow

1. **Create Issue**: Before writing code, create a GitHub issue with detailed requirements, acceptance criteria, and relevant page/field specs from `docs/holdly-requirements.md`.
2. **Branch**: Create a feature branch from `main` linked to the issue.
3. **Develop**: Update issue status to "In Progress" when starting. If requirements change during development, update the issue with detailed changes.
4. **Pre-commit Gate**: Before committing, run `pnpm typecheck` and `pnpm lint` — both must pass with zero errors. Never commit code that fails type checking or linting.
5. **Commit & Push**: After pre-commit checks pass, commit and push code.
6. **Close Issue**: Update issue status to "Done" / "Closed" after merge.
7. **Push & PR**: Push the branch and create a PR. Run `/check` for final review before merging.

## Key References

- `docs/holdly-requirements.md` — Full product spec, data models, page requirements, validation rules, design tokens, phased delivery plan.
- `docs/holdly-prototype.html` — Interactive HTML prototype for all screens (UI reference).
