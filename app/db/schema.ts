import {
  boolean,
  date,
  integer,
  numeric,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core'

// --- profiles ---
export const profiles = pgTable('profiles', {
  id: uuid('id').primaryKey(),
  displayName: text('display_name').notNull().default(''),
  email: text('email'),
  avatarEmoji: text('avatar_emoji').default('😊'),
  reminderSubscriptionDays: integer('reminder_subscription_days').default(7),
  reminderWarrantyDays: integer('reminder_warranty_days').default(14),
  reminderEnabled: boolean('reminder_enabled').default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
})

// --- categories ---
export const categories = pgTable('categories', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  name: text('name').notNull(),
  emoji: text('emoji').notNull().default('📦'),
  isPreset: boolean('is_preset').default(false),
  sortOrder: integer('sort_order').default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
})

// --- tags ---
export const tags = pgTable('tags', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  name: text('name').notNull(),
  color: text('color').notNull().default('#cc785c'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
})

// --- payment_types ---
export const paymentTypes = pgTable('payment_types', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  name: text('name').notNull(),
  isPreset: boolean('is_preset').default(false),
})

// --- payment_accounts ---
export const paymentAccounts = pgTable('payment_accounts', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  paymentTypeId: uuid('payment_type_id').notNull(),
  name: text('name').notNull(),
})

// --- assets ---
export const assets = pgTable('assets', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  name: text('name').notNull(),
  emoji: text('emoji').notNull().default('📦'),
  categoryId: uuid('category_id'),
  assetType: text('asset_type', { enum: ['one_time', 'subscription'] }).notNull().default('one_time'),

  // 买断型字段
  purchasePrice: numeric('purchase_price', { precision: 12, scale: 2 }),
  currentValue: numeric('current_value', { precision: 12, scale: 2 }),
  purchaseDate: date('purchase_date'),
  purchaseReceipt: text('purchase_receipt'),

  // 订阅型字段
  subscriptionPrice: numeric('subscription_price', { precision: 12, scale: 2 }),
  billingCycle: text('billing_cycle', { enum: ['monthly', 'quarterly', 'yearly'] }),
  nextRenewalDate: date('next_renewal_date'),
  subscriptionStartDate: date('subscription_start_date'),
  subscriptionStatus: text('subscription_status', { enum: ['active', 'cancelled', 'expired'] }).default('active'),
  subscriptionStoppedAt: date('subscription_stopped_at'),

  // 通用
  paymentTypeId: uuid('payment_type_id'),
  paymentAccountId: uuid('payment_account_id'),
  notes: text('notes'),

  // 到期提醒覆盖
  reminderSubscriptionDaysOverride: integer('reminder_subscription_days_override'),
  reminderWarrantyDaysOverride: integer('reminder_warranty_days_override'),

  // 软删除
  deletedAt: timestamp('deleted_at', { withTimezone: true }),

  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
})

// --- asset_tags ---
export const assetTags = pgTable('asset_tags', {
  assetId: uuid('asset_id').notNull(),
  tagId: uuid('tag_id').notNull(),
}, t => ({
  pk: primaryKey({ columns: [t.assetId, t.tagId] }),
}))

// --- warranties ---
export const warranties = pgTable('warranties', {
  id: uuid('id').primaryKey().defaultRandom(),
  assetId: uuid('asset_id').notNull().unique(),
  startDate: date('start_date').notNull(),
  endDate: date('end_date').notNull(),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
})

// --- repair_records ---
export const repairRecords = pgTable('repair_records', {
  id: uuid('id').primaryKey().defaultRandom(),
  assetId: uuid('asset_id').notNull(),
  repairDate: date('repair_date').notNull(),
  cost: numeric('cost', { precision: 10, scale: 2 }).default('0'),
  reason: text('reason'),
  vendor: text('vendor'),
  result: text('result'),
  isDone: boolean('is_done').default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
})

// --- subscription_renewals ---
export const subscriptionRenewals = pgTable('subscription_renewals', {
  id: uuid('id').primaryKey().defaultRandom(),
  assetId: uuid('asset_id').notNull(),
  billingCycle: text('billing_cycle', { enum: ['monthly', 'quarterly', 'yearly'] }).notNull(),
  price: numeric('price', { precision: 10, scale: 2 }).notNull(),
  startDate: date('start_date').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
})

// --- reminder_jobs ---
export const reminderJobs = pgTable('reminder_jobs', {
  id: uuid('id').primaryKey().defaultRandom(),
  assetId: uuid('asset_id').notNull(),
  userId: uuid('user_id').notNull(),
  reminderType: text('reminder_type', { enum: ['subscription_renewal', 'warranty_expiry'] }).notNull(),
  scheduledAt: timestamp('scheduled_at', { withTimezone: true }).notNull(),
  sentAt: timestamp('sent_at', { withTimezone: true }),
  cancelledAt: timestamp('cancelled_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
})
