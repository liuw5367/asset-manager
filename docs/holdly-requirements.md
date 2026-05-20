# Holdly — 开发需求文档

> 版本：v1.0 | 日期：2026-05-20 | 状态：待开发

---

## 目录

1. [产品概述](#1-产品概述)
2. [技术选型](#2-技术选型)
3. [路由结构](#3-路由结构)
4. [数据模型](#4-数据模型)
5. [业务逻辑](#5-业务逻辑)
6. [页面需求（P1 — 资产管理）](#6-页面需求p1--资产管理)
7. [页面需求（P2 — 统计与计划）](#7-页面需求p2--统计与计划)
8. [邮件提醒系统](#8-邮件提醒系统)
9. [认证流程](#9-认证流程)
10. [设置模块](#10-设置模块)
11. [设计规范](#11-设计规范)
12. [测试要点](#12-测试要点)
13. [分阶段交付范围](#13-分阶段交付范围)

---

## 1. 产品概述

**Holdly** 是一款面向个人用户的资产持有成本追踪应用。

**核心价值**：把购入价格摊薄成每日成本，让每件物品的真实代价清晰可见。

**两种资产类型**：
- **买断型**：一次性购入，按持有天数计算每日成本
- **订阅型**：周期性付费，按订阅周期天数计算每日成本

**货币**：全局仅支持单一货币单位，界面不展示货币符号，仅显示数字。

---

## 2. 技术选型

### 2.1 核心框架

| 层级 | 方案 | 说明 |
|---|---|---|
| 前端框架 | React Router v7（Remix 模式）| loader/action 天然契合表单密集型应用，SSR 开箱即用 |
| 构建工具 | Vite | React Router v7 默认，极快 HMR |
| UI 组件库 | shadcn/ui（最新版）| Tailwind v4 + Radix UI，按需生成 |
| 主题方案 | next-themes | 深色/亮色/跟随系统，三模式 |
| 部署 | Vercel | React Router v7 一键部署 |

### 2.2 数据与认证

| 层级 | 方案 | 说明 |
|---|---|---|
| ORM | Drizzle ORM | 类型安全，`drizzle-kit` 做迁移 |
| 数据库 | Supabase (PostgreSQL) | 免费 500MB |
| 文件存储 | 暂不使用 | P1 只支持 emoji，无图片上传 |
| 认证 | Supabase Auth | GitHub OAuth + Google OAuth + 邮箱密码 |
| 邮件 | Resend | 到期提醒，免费 3000 封/月 |
| 商品图 | **已移除** | P1 不支持商品图搜索 |

### 2.3 功能库

| 库 | 用途 |
|---|---|
| Zod | Schema 验证 + TypeScript 类型推导 |
| react-hook-form | 表单状态管理，配合 Zod resolver |
| TanStack Query | 客户端数据缓存、乐观更新、失效策略 |
| Zustand | 全局 UI 状态（主题偏好、提醒列表）|
| date-fns | 日期计算（持有天数、到期差值）|
| currency.js | 精确数字计算，避免浮点数问题 |
| Recharts | 统计图表，shadcn Charts 底层 |
| Tabler Icons | 图标库，描边风格 |
| Sonner | Toast 通知 |
| nuqs | URL Search Params 状态，筛选条件同步 URL |
| framer-motion | 卡片/抽屉动画 |
| vite-plugin-pwa | PWA 支持（Phase 15）|

### 2.4 测试

| 工具 | 用途 |
|---|---|
| Vitest | 单元测试：每日成本计算、换新逻辑、净值计算 |
| React Testing Library | 组件交互测试 |

---

## 3. 路由结构

所有子页面均为独立路由，无 Drawer/Sheet 路由。

```
/                          → redirect → /dashboard
/login                     → 登录页
/register                  → 注册页
/forgot-password           → 找回密码

/dashboard                 → 统计总览（P2 硬编码 mock）
/assets                    → 资产列表
/assets/new                → 新建资产
/assets/:id                → 资产详情
/assets/:id/edit           → 编辑资产
/assets/:id/trade-in       → 以旧换新

/plans                     → 计划列表（P2 硬编码 mock）
/plans/new                 → 新建计划（P2）
/plans/:id                 → 计划详情（P2）
/plans/:id/edit            → 编辑计划（P2）
/plans/:id/records/:month  → 月度记录详情（P2）
/plans/:id/records/:month/edit → 编辑月度记录（P2）

/settings                  → 设置主页
/settings/categories       → 分类管理
/settings/tags             → 标签管理
/settings/payment-types    → 支付类型管理
/settings/payment-accounts → 支付账户管理
```

---

## 4. 数据模型

以下为 Drizzle ORM 表结构设计（PostgreSQL）。

### 4.1 users（由 Supabase Auth 管理）

Supabase Auth 自动创建 `auth.users` 表。在 `public` schema 下扩展：

```typescript
export const profiles = pgTable('profiles', {
  id: uuid('id').primaryKey().references(() => authUsers.id, { onDelete: 'cascade' }),
  displayName: text('display_name').notNull(),
  email: text('email').notNull(),
  avatarEmoji: text('avatar_emoji').default('😊'),
  // 全局提醒配置
  reminderSubscriptionDays: integer('reminder_subscription_days').default(7), // 3 或 7
  reminderWarrantyDays: integer('reminder_warranty_days').default(14),
  reminderEnabled: boolean('reminder_enabled').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});
```

### 4.2 categories（分类）

```typescript
export const categories = pgTable('categories', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  emoji: text('emoji').notNull().default('📦'),
  isPreset: boolean('is_preset').default(false),
  sortOrder: integer('sort_order').default(0),
  createdAt: timestamp('created_at').defaultNow(),
});
```

**预置分类**（系统初始化时写入，`is_preset = true`）：
💻 数码设备、🔧 软件工具、📚 书籍、🔄 订阅服务、📷 摄影、🏠 家居物品、📦 其他

### 4.3 tags（标签）

```typescript
export const tags = pgTable('tags', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  color: text('color').notNull().default('#cc785c'), // hex
  createdAt: timestamp('created_at').defaultNow(),
});
```

### 4.4 payment_types（支付类型）

```typescript
export const paymentTypes = pgTable('payment_types', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  isPreset: boolean('is_preset').default(false),
});
```

**预置支付类型**：信用卡、借记卡、微信支付、支付宝、Apple Pay、现金、其他

### 4.5 payment_accounts（支付账户）

```typescript
export const paymentAccounts = pgTable('payment_accounts', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  paymentTypeId: uuid('payment_type_id').notNull().references(() => paymentTypes.id),
  name: text('name').notNull(), // 例：工行尾号 1234
});
```

### 4.6 assets（资产）

```typescript
export const assets = pgTable('assets', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  emoji: text('emoji').notNull().default('📦'),
  categoryId: uuid('category_id').references(() => categories.id, { onDelete: 'set null' }),
  assetType: text('asset_type', { enum: ['one_time', 'subscription'] }).notNull().default('one_time'),

  // 买断型字段
  purchasePrice: numeric('purchase_price', { precision: 12, scale: 2 }),
  currentValue: numeric('current_value', { precision: 12, scale: 2 }), // 可选，手动输入当前估价
  purchaseDate: date('purchase_date'),
  purchaseReceipt: text('purchase_receipt'), // 购买凭证号

  // 订阅型字段
  subscriptionPrice: numeric('subscription_price', { precision: 12, scale: 2 }),
  billingCycle: text('billing_cycle', { enum: ['monthly', 'quarterly', 'yearly'] }),
  nextRenewalDate: date('next_renewal_date'),
  subscriptionStartDate: date('subscription_start_date'),
  subscriptionStatus: text('subscription_status', { enum: ['active', 'cancelled', 'expired'] }).default('active'),

  // 通用
  paymentTypeId: uuid('payment_type_id').references(() => paymentTypes.id, { onDelete: 'set null' }),
  paymentAccountId: uuid('payment_account_id').references(() => paymentAccounts.id, { onDelete: 'set null' }),
  notes: text('notes'),

  // 到期提醒覆盖（null = 跟随全局设置）
  reminderSubscriptionDaysOverride: integer('reminder_subscription_days_override'), // null | 3 | 7
  reminderWarrantyDaysOverride: integer('reminder_warranty_days_override'), // null | 7 | 14 | 30

  // 软删除
  deletedAt: timestamp('deleted_at'),

  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});
```

### 4.7 asset_tags（资产-标签关联）

```typescript
export const assetTags = pgTable('asset_tags', {
  assetId: uuid('asset_id').notNull().references(() => assets.id, { onDelete: 'cascade' }),
  tagId: uuid('tag_id').notNull().references(() => tags.id, { onDelete: 'cascade' }),
}, (t) => ({
  pk: primaryKey({ columns: [t.assetId, t.tagId] }),
}));
```

### 4.8 warranties（保修信息）

```typescript
export const warranties = pgTable('warranties', {
  id: uuid('id').primaryKey().defaultRandom(),
  assetId: uuid('asset_id').notNull().references(() => assets.id, { onDelete: 'cascade' }).unique(),
  startDate: date('start_date').notNull(),
  endDate: date('end_date').notNull(),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});
```

### 4.9 repair_records（维修记录）

```typescript
export const repairRecords = pgTable('repair_records', {
  id: uuid('id').primaryKey().defaultRandom(),
  assetId: uuid('asset_id').notNull().references(() => assets.id, { onDelete: 'cascade' }),
  repairDate: date('repair_date').notNull(),
  cost: numeric('cost', { precision: 10, scale: 2 }).default('0'),
  reason: text('reason'),
  vendor: text('vendor'),
  result: text('result'),
  isDone: boolean('is_done').default(true),
  createdAt: timestamp('created_at').defaultNow(),
});
```

### 4.10 subscription_renewals（订阅续费记录）

```typescript
export const subscriptionRenewals = pgTable('subscription_renewals', {
  id: uuid('id').primaryKey().defaultRandom(),
  assetId: uuid('asset_id').notNull().references(() => assets.id, { onDelete: 'cascade' }),
  billingCycle: text('billing_cycle', { enum: ['monthly', 'quarterly', 'yearly'] }).notNull(),
  price: numeric('price', { precision: 10, scale: 2 }).notNull(),
  startDate: date('start_date').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});
```

### 4.11 reminder_jobs（提醒任务，P1 后端）

```typescript
export const reminderJobs = pgTable('reminder_jobs', {
  id: uuid('id').primaryKey().defaultRandom(),
  assetId: uuid('asset_id').notNull().references(() => assets.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  reminderType: text('reminder_type', { enum: ['subscription_renewal', 'warranty_expiry'] }).notNull(),
  scheduledAt: timestamp('scheduled_at').notNull(), // 计算好的发送时间
  sentAt: timestamp('sent_at'), // null = 未发送
  cancelledAt: timestamp('cancelled_at'), // null = 未取消
  createdAt: timestamp('created_at').defaultNow(),
});
```

### 4.12 P2 计划相关表（需求文档，P1 不实现）

```typescript
// plans - 月度计划
export const plans = pgTable('plans', {
  id: uuid('id').primaryKey().defaultRandom(),
  ownerId: uuid('owner_id').notNull().references(() => profiles.id),
  name: text('name').notNull(),
  emoji: text('emoji').default('💰'),
  startingValue: numeric('starting_value', { precision: 12, scale: 2 }).default('0'),
  permission: text('permission', { enum: ['own', 'all'] }).default('own'),
  deletedAt: timestamp('deleted_at'),
  createdAt: timestamp('created_at').defaultNow(),
});

// plan_members - 计划成员
export const planMembers = pgTable('plan_members', {
  planId: uuid('plan_id').notNull().references(() => plans.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => profiles.id),
  role: text('role', { enum: ['owner', 'editor'] }).notNull(),
  joinedAt: timestamp('joined_at').defaultNow(),
}, (t) => ({ pk: primaryKey({ columns: [t.planId, t.userId] }) }));

// plan_records - 月度记录
export const planRecords = pgTable('plan_records', {
  id: uuid('id').primaryKey().defaultRandom(),
  planId: uuid('plan_id').notNull().references(() => plans.id, { onDelete: 'cascade' }),
  year: integer('year').notNull(),
  month: integer('month').notNull(), // 1-12
  deletedAt: timestamp('deleted_at'),
  createdAt: timestamp('created_at').defaultNow(),
});

// plan_record_items - 收支条目
export const planRecordItems = pgTable('plan_record_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  recordId: uuid('record_id').notNull().references(() => planRecords.id, { onDelete: 'cascade' }),
  memberId: uuid('member_id').references(() => profiles.id, { onDelete: 'set null' }),
  itemType: text('item_type', { enum: ['income', 'expense'] }).notNull(),
  name: text('name').notNull(),
  amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
});
```

---

## 5. 业务逻辑

### 5.1 每日成本计算

```typescript
import currency from 'currency.js';
import { differenceInDays } from 'date-fns';

/**
 * 买断型资产每日成本
 * dailyCost = purchasePrice / holdingDays
 * holdingDays = today - purchaseDate（最小值为 1）
 */
function calcOneTimeDailyCost(purchasePrice: number, purchaseDate: Date): number {
  const days = Math.max(1, differenceInDays(new Date(), purchaseDate));
  return currency(purchasePrice).divide(days).value;
}

/**
 * 订阅型资产每日成本
 * monthly  → price / 30
 * quarterly → price / 91
 * yearly  → price / 365
 */
function calcSubscriptionDailyCost(
  price: number,
  cycle: 'monthly' | 'quarterly' | 'yearly'
): number {
  const cycleDays = { monthly: 30, quarterly: 91, yearly: 365 };
  return currency(price).divide(cycleDays[cycle]).value;
}
```

### 5.2 以旧换新计算

入口：资产详情页 `···` 菜单 → 「以旧换新」→ 跳转至 `/assets/:id/trade-in`，旧资产信息自动预填。

```typescript
interface TradeInCalcInput {
  oldAsset: {
    name: string;
    purchasePrice: number;
    purchaseDate: Date;
  };
  tradeInDiscount: number;  // 回收价 / 换新优惠
  newAssetPrice: number;
  tradeInDate: Date;        // 换新日期，也作为新资产 purchaseDate
}

interface TradeInCalcResult {
  actualSpend: number;        // newAssetPrice - tradeInDiscount
  oldDailyCost: number;       // 旧资产历史每日成本（基于旧持有天数）
  newDailyCost: number;       // 新资产预计每日成本（actualSpend / 旧资产相同持有天数）
}

function calcTradeIn(input: TradeInCalcInput): TradeInCalcResult {
  const { oldAsset, tradeInDiscount, newAssetPrice, tradeInDate } = input;
  const actualSpend = currency(newAssetPrice).subtract(tradeInDiscount).value;
  const oldHoldingDays = Math.max(1, differenceInDays(tradeInDate, oldAsset.purchaseDate));
  const oldDailyCost = currency(oldAsset.purchasePrice).divide(oldHoldingDays).value;
  // 新资产按相同持有天数预估
  const newDailyCost = currency(actualSpend).divide(oldHoldingDays).value;
  return { actualSpend, oldDailyCost, newDailyCost };
}
```

完成换新后的操作流程：
1. 旧资产 `deleted_at` 设为换新日期（软删除）
2. 取消旧资产的所有未发送 `reminder_jobs`
3. 创建新资产，`purchaseDate` = 换新日期，`purchasePrice` = `actualSpend`

### 5.3 软删除过滤

所有查询必须附加 `where(isNull(assets.deletedAt))` 条件。

### 5.4 P2 月度净值计算

```
monthlyNetValue = startingValue + Σ(income) - Σ(expense)
totalValue = startingValue + Σ(all months net income)
```

---

## 6. 页面需求（P1 — 资产管理）

### 6.1 认证页面（三个）

#### `/login` 登录

| 元素 | 说明 |
|---|---|
| GitHub OAuth 按钮 | 调用 Supabase Auth |
| Google OAuth 按钮 | 调用 Supabase Auth |
| 邮箱 + 密码表单 | Zod 验证：email 格式，password 最少 8 位 |
| 「忘记密码」链接 | → `/forgot-password` |
| 「去注册」链接 | → `/register` |

loader：已登录用户重定向 → `/dashboard`

#### `/register` 注册

字段：昵称（必填）、邮箱（必填）、密码（必填，min 8）、确认密码（必填，需与密码一致）

action：
1. Zod 验证
2. `supabase.auth.signUp()`
3. 写入 `profiles` 表（`displayName`）
4. 初始化预置分类、预置支付类型（写入该用户名下）
5. 创建默认全局提醒配置（subscription=7天，warranty=14天）
6. 重定向 → `/dashboard`

#### `/forgot-password` 找回密码

字段：邮箱

action：调用 `supabase.auth.resetPasswordForEmail()`，提示「重置链接已发送，请查收」

---

### 6.2 资产列表 `/assets`

#### 页面状态

URL 搜索参数（用 `nuqs` 管理）：
- `q`：搜索关键词（资产名称模糊匹配）
- `type`：`all` | `one_time` | `subscription`（默认 `all`）
- `cat`：分类 ID
- `tag`：标签 ID
- `sort`：`created_desc`（默认）| `price_desc` | `price_asc` | `name_asc` | `daily_cost_desc`

#### loader

```typescript
// 查询条件：
// 1. userId = 当前用户
// 2. deletedAt IS NULL
// 3. 应用 q / type / cat / tag 筛选
// 4. 按 sort 排序
// 5. 每日成本在查询层或应用层计算均可（买断型需 today）
```

#### 资产列表项展示

| 元素 | 买断型 | 订阅型 |
|---|---|---|
| 主图 | emoji | emoji |
| 名称 | asset.name | asset.name |
| 徽标 | 分类名 | 分类名 + 「订阅」徽标 |
| 右侧价格 | purchasePrice | subscriptionPrice + 周期标注 |
| 右侧每日 | X.XX/天 | X.XX/天 |

#### 空状态

当列表为空（或筛选无结果）时，展示空状态引导用户新建资产。

---

### 6.3 资产详情 `/assets/:id`

#### loader

查询 asset + category + tags + warranty + repairRecords + subscriptionRenewals + reminderConfig

若 `deletedAt != null` → 返回 404

#### Hero 区

- emoji（大尺寸，带背景色）
- 资产名称
- 徽标：分类名、「订阅」徽标（订阅型）、所有标签名

#### 财务摘要（买断型）

| 字段 | 值 |
|---|---|
| 购入价 | purchasePrice |
| 当前估价 | currentValue（若为空显示「—」）|
| 每日成本 | 主色高亮，计算值 |
| 持有天数 | differenceInDays(today, purchaseDate) |
| 支付方式 | paymentAccount.name · paymentType.name |
| 购入日期 | purchaseDate |
| 购买凭证 | purchaseReceipt（可选）|

#### 财务摘要（订阅型）

显示「订阅信息」卡片（替换或补充）：

| 字段 | 值 |
|---|---|
| 订阅周期 | 月付/季付/年付 |
| 订阅金额 | subscriptionPrice + 周期 |
| 每日成本 | 主色高亮 |
| 下次续费 | nextRenewalDate |
| 累计订阅 | Σ(renewals.price) · 已订阅 N 期 |
| 状态 | active/cancelled/expired 徽标 |

操作：「续费」按钮 → Dialog 录入新一期续费记录（写入 `subscription_renewals`，更新 `nextRenewalDate`，取消旧的 `reminder_jobs` 并重新计算下一个提醒时间）

#### 基础信息

分类、标签、购买凭证、备注

#### 保修信息

| 字段 | 值 |
|---|---|
| 保修期 | startDate → endDate |
| 状态 | 活跃/已到期 |
| 备注 | warranty.notes |

操作：「编辑保修」→ Dialog 修改保修日期（更新后重新计算保修提醒任务）

#### 到期提醒设置（P1 实现）

覆盖全局默认：

| 字段 | 选项 |
|---|---|
| 订阅到期提醒 | 跟随全局 / 3天 / 7天 / 关闭 |
| 保修到期提醒 | 跟随全局 / 7天 / 14天 / 30天 / 关闭 |

修改后立即更新 `reminderSubscriptionDaysOverride` / `reminderWarrantyDaysOverride`，并重新计算 `reminder_jobs`。

#### 维修记录

时间轴展示所有维修记录，操作：「+ 添加维修」→ Bottom Sheet 表单

Bottom Sheet 字段：维修日期（必填）、维修费用（可选，默认 0）、维修原因（可选）、维修商（可选）、维修结果（可选）、「已完成」checkbox

#### 顶部操作菜单（`···`）

- **以旧换新** → 跳转 `/assets/:id/trade-in`
- **删除资产** → 确认 Dialog，确认后软删除（写入 `deletedAt = now()`，取消所有 `reminder_jobs`），跳转 `/assets`

---

### 6.4 新建/编辑资产

路由：`/assets/new`、`/assets/:id/edit`

编辑时 loader 预填所有字段。

#### 表单字段

| 字段 | 类型 | 验证 |
|---|---|---|
| emoji 图标 | emoji 选择器（内联 grid）| 必填，默认 📦 |
| 名称 | text | 必填，max 60 |
| 分类 | select（来自用户分类列表）| 必填 |
| 订阅资产 toggle | boolean | — |
| **买断型字段** | | |
| 购入价 | number | 必填，> 0 |
| 当前估价 | number | 可选，≥ 0，留空 = 不记录 |
| 购入日期 | date | 必填，≤ today |
| 购买凭证 | text | 可选 |
| **订阅型字段** | | |
| 订阅价 | number | 必填，> 0 |
| 订阅周期 | select（月付/季付/年付）| 必填 |
| 下次续费日期 | date | 必填 |
| 订阅开始日期 | date | 可选 |
| **通用字段** | | |
| 支付类型 | select（来自用户支付类型）| 可选 |
| 支付账户 | select（来自对应支付类型账户）| 可选 |
| 标签 | multi-select（来自用户标签）| 可选 |
| 备注 | textarea | 可选，max 500 |

**联动规则**：
- 支付账户下拉列表根据「支付类型」动态过滤
- 订阅 toggle 开启后隐藏买断字段，显示订阅字段

#### action

1. Zod 验证
2. 写入 `assets` 表
3. 写入/更新 `asset_tags`（先 delete 再 insert）
4. 若有保修信息（编辑时），同步 `warranties`
5. 触发提醒任务计算（见第 8 节）
6. 跳转 `/assets/:id`

---

### 6.5 以旧换新 `/assets/:id/trade-in`

#### loader

读取旧资产信息：name、purchasePrice、purchaseDate、emoji、categoryId

#### 页面布局

**旧资产卡片（只读展示）**：
- emoji + 名称
- 购入价、历史持有天数

**旧资产回收信息（表单）**：
- 回收 / 换新优惠价（number，必填）
- 换新日期（date，必填，默认今天）

**新资产信息（表单）**：
- emoji 选择器（默认继承旧资产 emoji）
- 名称（必填）
- 分类（默认继承旧资产分类）
- 购入价（必填）
- 支付类型（可选）
- 支付账户（可选）
- 标签（可选）
- 备注（可选）

**换新测算面板**（实时计算，购入价或优惠价任意输入后展示）：

| 字段 | 值 |
|---|---|
| 新资产购入价 | newAssetPrice |
| 以旧换新优惠 | − tradeInDiscount |
| **实际支出** | newAssetPrice − tradeInDiscount |
| 旧资产每日成本（历史）| purchasePrice / oldHoldingDays |
| 新资产每日成本（预计）| actualSpend / oldHoldingDays |

#### action「完成换新，创建新资产」

1. Zod 验证
2. 旧资产：`deletedAt = tradeInDate`
3. 取消旧资产所有 `reminderJobs`（`cancelledAt = now()`）
4. 创建新资产：`purchaseDate = tradeInDate`，`purchasePrice = actualSpend`
5. 复制旧资产的 tag 关联（可选，由用户输入覆盖）
6. 触发新资产提醒任务计算
7. 跳转 `/assets/:newAssetId`

---

## 7. 页面需求（P2 — 统计与计划）

> **P1 处理方式**：两个 Tab 全量渲染原型 UI，所有数值使用硬编码 mock 数据，不接入真实数据库。加「数据仅供展示」提示横幅。

---

### 7.1 统计总览 `/dashboard`（P2 实现）

#### KPI 卡片（4 个）

| 卡片 | 计算逻辑 |
|---|---|
| 当日支出 | Σ(所有活跃资产每日成本) |
| 本月预计 | 当日支出 × 当月剩余天数 + 已过天数每日成本 |
| 本年预计 | 当日支出 × 365 |
| 累计已花 | Σ(所有资产 purchasePrice + repair costs) |

#### 分类花费分布

按分类聚合 purchasePrice，展示水平条形图（Recharts）

#### 月度趋势图

展示过去 12 个月的每日成本折线图（x 轴：月份，y 轴：日均成本）

#### 即将到期

按 `nextRenewalDate` / `warranty.endDate` 升序排列，展示未来 30 天内到期的资产。支持快捷操作（查看详情）。

---

### 7.2 计划模块 `/plans`（P2 实现）

#### 计划列表

展示用户参与的所有计划，每个计划卡片显示：
- 计划 emoji + 名称
- 成员头像列表
- 最近一个月的净收入 + 趋势箭头
- 最新月份

FAB / 按钮 → 新建计划

#### 新建/编辑计划 `/plans/new`、`/plans/:id/edit`

| 字段 | 说明 |
|---|---|
| emoji | emoji 选择器 |
| 计划名称 | 必填 |
| 成员 | 邀请（生成邀请链接 / 直接搜索用户），可设置角色（创建者/编辑者）|
| 协作权限 | 成员只能编辑自己的条目 / 成员可以编辑全部条目 |
| 起始数字 | 净值起始值，默认 0 |
| 默认子项 | 预设收支项名称，每次创建月记录时自动填充 |

#### 计划详情 `/plans/:id`

- 净值趋势图（Recharts，12 个月折线）
- KPI：累计净收入（最近 3 月）、当前总额（起始 + 累计净收入）
- 月度记录列表（按月倒序），每条显示总额、净收入、收支合计
- 「+ 新建记录」按钮

#### 月度记录 `/plans/:id/records/:month`

- 顶部 KPI：收入合计、支出合计、净收入
- 收入明细列表：成员头像、项目名、金额
- 支出明细列表：成员头像、项目名、金额

#### 编辑月度记录 `/plans/:id/records/:month/edit`

- 年份 + 月份选择
- 收入明细：成员归属（下拉）、项目名（文本）、金额（数字），支持增删
- 支出明细：同上
- action：upsert `plan_records` + `plan_record_items`

**删除记录**：需在输入框中确认「归属月份」（YYYY-MM）才能删除，二次确认防误操作。

---

## 8. 邮件提醒系统

### 8.1 提醒规则

| 提醒类型 | 触发条件 | 默认提前天数 | 可选值 |
|---|---|---|---|
| 订阅到期 | `nextRenewalDate - today = reminderDays` | 7 天 | 3天 / 7天 / 关闭 |
| 保修到期 | `warranty.endDate - today = reminderDays` | 14 天 | 7天 / 14天 / 30天 / 关闭 |

提醒天数优先级：`asset.reminderXxxDaysOverride` > `profile.reminderXxxDays`（全局默认）

### 8.2 提醒任务调度（`reminder_jobs`）

**创建 / 更新提醒任务的时机**：
1. 资产创建时
2. 资产编辑时（`nextRenewalDate` 或保修日期发生变化）
3. 订阅续费时
4. 用户修改资产详情中的提醒覆盖配置时
5. 用户修改全局提醒设置时（全量重算未取消的任务）

**取消提醒任务的时机**：
1. 资产软删除
2. 以旧换新（旧资产删除）
3. 订阅状态改为 `cancelled` / `expired`
4. 用户关闭某资产的提醒（`reminderDaysOverride = null + 全局关闭`）
5. 续费成功（取消旧的订阅提醒，为下一个周期创建新任务）

### 8.3 定时执行（Vercel Cron）

在 `vercel.json` 配置每日 UTC 08:00 触发 `GET /api/cron/send-reminders`：

```typescript
// /app/api/cron/send-reminders.ts
export async function loader() {
  const now = new Date();
  const jobs = await db
    .select()
    .from(reminderJobs)
    .where(
      and(
        lte(reminderJobs.scheduledAt, now),
        isNull(reminderJobs.sentAt),
        isNull(reminderJobs.cancelledAt),
      )
    );

  for (const job of jobs) {
    // 1. 获取 asset + user 信息
    // 2. 通过 Resend 发送邮件
    // 3. 更新 reminderJobs.sentAt = now
  }
}
```

### 8.4 邮件内容

**订阅到期提醒**：
- 主题：`[Holdly] {assetName} 订阅将于 {N} 天后到期`
- 正文：资产名称、到期日期、当前订阅价格、快捷跳转链接

**保修到期提醒**：
- 主题：`[Holdly] {assetName} 保修将于 {N} 天后到期`
- 正文：资产名称、保修到期日期、快捷跳转链接

---

## 9. 认证流程

### 9.1 Session 管理

使用 Supabase Auth + React Router v7 server-side session。在 `root.tsx` loader 中读取 session：

```typescript
export async function loader({ request }: LoaderFunctionArgs) {
  const { supabase, headers } = createServerClient(request);
  const { data: { session } } = await supabase.auth.getSession();
  return json({ session }, { headers });
}
```

未登录用户访问需鉴权路由时，统一重定向至 `/login?next={currentPath}`。

### 9.2 OAuth 回调

配置 `/auth/callback` 路由处理 Supabase OAuth 回调，交换 code 为 session，再重定向至 `/dashboard`。

---

## 10. 设置模块

### 10.1 设置主页 `/settings`

**用户信息卡**：头像 emoji + 昵称 + 邮箱，点击 → 编辑资料

**通知设置**：
- 到期提醒总开关（toggle）
- 开启后展示详细配置：
  - 订阅到期提醒提前天数（select：3天 / 7天）
  - 保修到期提醒提前天数（select：7天 / 14天 / 30天）
- 修改后重新计算所有未发送 `reminder_jobs`

**外观设置**：主题模式（自动 / 浅色 / 深色）

**数据管理**：导航至各子页面

**账户操作**：退出登录（`supabase.auth.signOut()`）

### 10.2 分类管理 `/settings/categories`

- 列表展示所有分类（预置标注「预置」徽标）
- 新增：emoji + 名称
- 编辑：行内编辑名称
- 删除：确认后删除，若分类下有资产则 `category_id` 设为 null

### 10.3 标签管理 `/settings/tags`

- 列表展示所有标签（带颜色点）+ 关联资产数量
- 新增：颜色选择器 + 标签名称
- 编辑：行内编辑
- 删除：确认后删除，关联从 `asset_tags` 中清除

### 10.4 支付类型管理 `/settings/payment-types`

- 预置类型（信用卡、借记卡等）标注「预置」，不可删除
- 用户可新增自定义类型
- 支持编辑名称、删除（若下有账户则级联删除账户）

### 10.5 支付账户管理 `/settings/payment-accounts`

- 按支付类型分组展示
- 新增：选择类型 + 填写账户名（如「工行尾号 1234」）
- 支持编辑、删除

---

## 11. 设计规范

### 11.1 颜色 Token

```css
:root {
  --color-canvas: #faf9f5;
  --color-surface-soft: #f5f0e8;
  --color-surface-card: #efe9de;
  --color-surface-strong: #e8e0d2;
  --color-hairline: #e6dfd8;
  --color-primary: #cc785c;
  --color-primary-active: #a9583e;
  --color-primary-muted: #f0e4dc;
  --color-ink: #141413;
  --color-body: #3d3d3a;
  --color-muted: #6c6a64;
  --color-muted-soft: #8e8b82;
  --color-success: #5db872;
  --color-warning: #d4a017;
  --color-error: #c64545;
  --color-info: #5db8a6;
}
.dark {
  --color-canvas: #181715;
  --color-surface-soft: #1f1e1b;
  --color-surface-card: #252320;
  --color-surface-strong: #302e2a;
  --color-hairline: #3a3835;
  --color-ink: #faf9f5;
  --color-body: #d4d0c8;
  --color-muted: #a09d96;
}
```

### 11.2 字体

| 用途 | 字体 | 规格 |
|---|---|---|
| 展示/标题 | EB Garamond | 24–42px，weight 400 |
| 正文/UI | Inter | 12–20px，weight 400–600 |
| 数字/代码 | JetBrains Mono | 数据展示 |

### 11.3 响应式布局

- 移动端（< 768px）：底部 Tab Bar（4 项 + 中间 FAB 新建资产）
- 桌面端（≥ 768px）：左侧固定 Sidebar（宽 220px），Tab Bar 隐藏

### 11.4 组件规范

| 组件 | 规格 |
|---|---|
| 主要按钮 | h-44px，radius-10px，背景 primary，full-width |
| 次要按钮 | h-44px，radius-10px，border hairline，full-width |
| 输入框 | h-44px，radius-10px，focus ring primary-muted |
| 卡片 | background surface-card，radius-lg（12px），padding 16px |
| Bottom Sheet | radius-xl top，handle bar，max-h 85vh，animation slideUp |
| Dialog | centered bottom，radius-xl，animation slideUp，max-w 480px |
| Badge | pill，background surface-strong，text muted；primary/success/error/info 变体 |

---

## 12. 测试要点

### 12.1 单元测试（Vitest）

```typescript
// 每日成本计算
describe('calcOneTimeDailyCost', () => {
  it('637 天持有 18999 → 29.83/天', ...)
  it('当天购入（1天）→ 等于购入价', ...)
  it('purchaseDate 在未来 → 返回 purchasePrice（holding=1）', ...)
})

// 以旧换新计算
describe('calcTradeIn', () => {
  it('新价格 18999，优惠 8000 → 实际支出 10999', ...)
  it('优惠大于新价格 → actualSpend 允许为负（仅展示，不阻止）', ...)
})

// 订阅每日成本
describe('calcSubscriptionDailyCost', () => {
  it('月付 68 → 2.27/天', ...)
  it('年付 168 → 0.46/天', ...)
})
```

### 12.2 集成测试要点

- 新建资产后列表正确显示
- 软删除后资产不出现在列表
- 以旧换新后旧资产 `deletedAt` 已写入
- 提醒任务在续费后被取消

---

## 13. 分阶段交付范围

### Phase 1（当前需求文档范围）

**真实数据功能**：

| 功能 | 路由 | 状态 |
|---|---|---|
| 登录/注册/找回密码 | `/login` `/register` `/forgot-password` | P1 |
| 资产列表（含筛选/搜索/排序）| `/assets` | P1 |
| 资产详情 | `/assets/:id` | P1 |
| 新建资产 | `/assets/new` | P1 |
| 编辑资产 | `/assets/:id/edit` | P1 |
| 以旧换新 | `/assets/:id/trade-in` | P1 |
| 设置主页（含通知配置）| `/settings` | P1 |
| 分类管理 | `/settings/categories` | P1 |
| 标签管理 | `/settings/tags` | P1 |
| 支付类型管理 | `/settings/payment-types` | P1 |
| 支付账户管理 | `/settings/payment-accounts` | P1 |
| 邮件提醒系统（含 Cron）| `/api/cron/send-reminders` | P1 |

**Mock 数据占位**：

| 功能 | 路由 | 状态 |
|---|---|---|
| 统计总览（硬编码 mock）| `/dashboard` | P1 mock → P2 真实 |
| 计划列表（硬编码 mock）| `/plans` | P1 mock → P2 真实 |
| 计划详情（硬编码 mock）| `/plans/:id` 等 | P1 mock → P2 真实 |

### Phase 2

- `/dashboard`：接入真实数据，实现 KPI 计算、趋势图、到期提醒列表
- `/plans` 全系列路由：计划 CRUD、成员邀请、月度记录 CRUD、净值计算
- PWA 支持（vite-plugin-pwa）
- 资产数据导出（CSV）

---

*文档结束*
