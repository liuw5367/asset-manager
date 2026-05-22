import { and, eq, isNull } from 'drizzle-orm'
import { db } from '~/db'
import {
  assets,
  assetTags,
  categories,
  paymentAccounts,
  paymentTypes,
  repairRecords,
  tags,
  warranties,
} from '~/db/schema'

// ========== 资产列表 ==========

export async function getAssetsByUserId(userId: string) {
  return db
    .select()
    .from(assets)
    .where(and(eq(assets.userId, userId), isNull(assets.deletedAt)))
    .orderBy(assets.createdAt)
}

// ========== 资产详情 ==========

export async function getAssetById(id: string, userId: string) {
  const rows = await db
    .select()
    .from(assets)
    .where(
      and(
        eq(assets.id, id),
        eq(assets.userId, userId),
        isNull(assets.deletedAt),
      ),
    )
    .limit(1)

  return rows[0] ?? null
}

export async function getAssetWithTags(assetId: string) {
  const rows = await db
    .select({ tagId: assetTags.tagId })
    .from(assetTags)
    .where(eq(assetTags.assetId, assetId))

  return rows.map(r => r.tagId)
}

export async function getAssetWarranty(assetId: string) {
  const rows = await db
    .select()
    .from(warranties)
    .where(eq(warranties.assetId, assetId))
    .limit(1)

  return rows[0] ?? null
}

export async function getAssetRepairRecords(assetId: string) {
  return db
    .select()
    .from(repairRecords)
    .where(eq(repairRecords.assetId, assetId))
    .orderBy(repairRecords.repairDate)
}

// ========== 创建资产 ==========

export interface CreateAssetInput {
  userId: string
  name: string
  emoji: string
  categoryId: string
  assetType: 'one_time' | 'subscription'
  purchasePrice?: string
  currentValue?: string
  purchaseDate?: string
  subscriptionPrice?: string
  billingCycle?: 'monthly' | 'quarterly' | 'yearly'
  nextRenewalDate?: string
  subscriptionStartDate?: string
  paymentTypeId?: string
  paymentAccountId?: string
  notes?: string
  tagIds?: string[]
}

export async function createAsset(input: CreateAssetInput) {
  const { tagIds, ...data } = input

  const [asset] = await db
    .insert(assets)
    .values({
      userId: data.userId,
      name: data.name,
      emoji: data.emoji,
      categoryId: data.categoryId,
      assetType: data.assetType,
      purchasePrice: data.purchasePrice ?? null,
      currentValue: data.currentValue ?? null,
      purchaseDate: data.purchaseDate ?? null,
      subscriptionPrice: data.subscriptionPrice ?? null,
      billingCycle: data.billingCycle ?? null,
      nextRenewalDate: data.nextRenewalDate ?? null,
      subscriptionStartDate: data.subscriptionStartDate ?? null,
      paymentTypeId: data.paymentTypeId ?? null,
      paymentAccountId: data.paymentAccountId ?? null,
      notes: data.notes ?? null,
    })
    .returning({ id: assets.id })

  if (tagIds && tagIds.length > 0) {
    await db
      .insert(assetTags)
      .values(tagIds.map(tagId => ({ assetId: asset.id, tagId })))
  }

  return asset.id
}

// ========== 更新资产 ==========

export interface UpdateAssetInput {
  name: string
  emoji: string
  categoryId: string
  assetType: 'one_time' | 'subscription'
  purchasePrice?: string
  currentValue?: string
  purchaseDate?: string
  subscriptionPrice?: string
  billingCycle?: 'monthly' | 'quarterly' | 'yearly'
  nextRenewalDate?: string
  subscriptionStartDate?: string
  paymentTypeId?: string
  paymentAccountId?: string
  notes?: string
  tagIds?: string[]
}

export async function updateAsset(id: string, userId: string, input: UpdateAssetInput) {
  const { tagIds, ...data } = input

  await db
    .update(assets)
    .set({
      name: data.name,
      emoji: data.emoji,
      categoryId: data.categoryId,
      assetType: data.assetType,
      purchasePrice: data.purchasePrice ?? null,
      currentValue: data.currentValue ?? null,
      purchaseDate: data.purchaseDate ?? null,
      subscriptionPrice: data.subscriptionPrice ?? null,
      billingCycle: data.billingCycle ?? null,
      nextRenewalDate: data.nextRenewalDate ?? null,
      subscriptionStartDate: data.subscriptionStartDate ?? null,
      paymentTypeId: data.paymentTypeId ?? null,
      paymentAccountId: data.paymentAccountId ?? null,
      notes: data.notes ?? null,
      updatedAt: new Date(),
    })
    .where(and(eq(assets.id, id), eq(assets.userId, userId)))

  // 更新标签关联（先删后插）
  await db.delete(assetTags).where(eq(assetTags.assetId, id))
  if (tagIds && tagIds.length > 0) {
    await db
      .insert(assetTags)
      .values(tagIds.map(tagId => ({ assetId: id, tagId })))
  }
}

// ========== 软删除资产 ==========

export async function softDeleteAsset(id: string, userId: string) {
  await db
    .update(assets)
    .set({ deletedAt: new Date() })
    .where(and(eq(assets.id, id), eq(assets.userId, userId)))
}

// ========== 停止订阅 ==========

export async function stopSubscription(id: string, userId: string, stoppedAt: string) {
  await db
    .update(assets)
    .set({
      subscriptionStatus: 'cancelled',
      subscriptionStoppedAt: stoppedAt,
      updatedAt: new Date(),
    })
    .where(and(eq(assets.id, id), eq(assets.userId, userId)))
}

// ========== 以旧换新 ==========

export async function markAssetAsTradedIn(id: string, userId: string, tradeInPrice: string, tradedInAt: string) {
  await db
    .update(assets)
    .set({
      tradedInAt,
      tradeInPrice,
      updatedAt: new Date(),
    })
    .where(and(eq(assets.id, id), eq(assets.userId, userId)))
}

export async function linkTradedFromAsset(newAssetId: string, oldAssetId: string) {
  await db
    .update(assets)
    .set({
      tradedFromAssetId: oldAssetId,
      updatedAt: new Date(),
    })
    .where(eq(assets.id, newAssetId))
}

export async function getOrCreateTradeInTag(userId: string) {
  const tagName = '以旧换新购买'
  const existing = await db
    .select()
    .from(tags)
    .where(and(eq(tags.userId, userId), eq(tags.name, tagName)))
    .limit(1)

  if (existing[0])
    return existing[0]

  const [tag] = await db
    .insert(tags)
    .values({ userId, name: tagName, color: '#7c6dea' })
    .returning()

  return tag
}

export async function getTradedFromAsset(assetId: string) {
  const rows = await db
    .select()
    .from(assets)
    .where(eq(assets.id, assetId))
    .limit(1)

  return rows[0] ?? null
}

// ========== 分类 ==========

export async function getCategoriesByUserId(userId: string) {
  return db
    .select()
    .from(categories)
    .where(eq(categories.userId, userId))
    .orderBy(categories.sortOrder)
}

// ========== 标签 ==========

export async function getTagsByUserId(userId: string) {
  return db
    .select()
    .from(tags)
    .where(eq(tags.userId, userId))
}

// ========== 支付类型 ==========

export async function getPaymentTypesByUserId(userId: string) {
  return db
    .select()
    .from(paymentTypes)
    .where(eq(paymentTypes.userId, userId))
}

// ========== 支付账户 ==========

export async function getPaymentAccountsByUserId(userId: string) {
  return db
    .select()
    .from(paymentAccounts)
    .where(eq(paymentAccounts.userId, userId))
}

// ========== 维修记录 ==========

export interface CreateRepairRecordInput {
  assetId: string
  repairDate: string
  cost?: string
  reason?: string
  vendor?: string
  result?: string
  isDone?: boolean
}

export async function createRepairRecord(input: CreateRepairRecordInput) {
  const [record] = await db
    .insert(repairRecords)
    .values({
      assetId: input.assetId,
      repairDate: input.repairDate,
      cost: input.cost ?? '0',
      reason: input.reason ?? null,
      vendor: input.vendor ?? null,
      result: input.result ?? null,
      isDone: input.isDone ?? true,
    })
    .returning({ id: repairRecords.id })

  return record.id
}

export interface UpdateRepairRecordInput {
  repairDate: string
  cost?: string
  reason?: string
  vendor?: string
  result?: string
  isDone?: boolean
}

export async function updateRepairRecord(id: string, input: UpdateRepairRecordInput) {
  await db
    .update(repairRecords)
    .set({
      repairDate: input.repairDate,
      cost: input.cost ?? '0',
      reason: input.reason ?? null,
      vendor: input.vendor ?? null,
      result: input.result ?? null,
      isDone: input.isDone ?? true,
    })
    .where(eq(repairRecords.id, id))
}

export async function deleteRepairRecord(id: string) {
  await db
    .delete(repairRecords)
    .where(eq(repairRecords.id, id))
}

// ========== 保修信息 ==========

export interface UpsertWarrantyInput {
  assetId: string
  startDate: string
  endDate: string
  notes?: string
}

export async function upsertWarranty(input: UpsertWarrantyInput) {
  const existing = await db
    .select({ id: warranties.id })
    .from(warranties)
    .where(eq(warranties.assetId, input.assetId))
    .limit(1)

  if (existing[0]) {
    await db
      .update(warranties)
      .set({
        startDate: input.startDate,
        endDate: input.endDate,
        notes: input.notes ?? null,
        updatedAt: new Date(),
      })
      .where(eq(warranties.id, existing[0].id))
    return existing[0].id
  }

  const [warranty] = await db
    .insert(warranties)
    .values({
      assetId: input.assetId,
      startDate: input.startDate,
      endDate: input.endDate,
      notes: input.notes ?? null,
    })
    .returning({ id: warranties.id })

  return warranty.id
}

// ========== 获取带分类名称的资产 ==========

export async function getAssetsWithCategoryName(userId: string) {
  return db
    .select({
      id: assets.id,
      name: assets.name,
      emoji: assets.emoji,
      categoryId: assets.categoryId,
      assetType: assets.assetType,
      purchasePrice: assets.purchasePrice,
      subscriptionPrice: assets.subscriptionPrice,
      billingCycle: assets.billingCycle,
      purchaseDate: assets.purchaseDate,
      tradedInAt: assets.tradedInAt,
      tradeInPrice: assets.tradeInPrice,
      tradedFromAssetId: assets.tradedFromAssetId,
      subscriptionStatus: assets.subscriptionStatus,
      createdAt: assets.createdAt,
      categoryName: categories.name,
    })
    .from(assets)
    .leftJoin(categories, eq(assets.categoryId, categories.id))
    .where(and(eq(assets.userId, userId), isNull(assets.deletedAt)))
    .orderBy(assets.createdAt)
}

// ========== 获取用户所有资产标签关联 ==========

export async function getAssetTagsByUserId(userId: string) {
  return db
    .select({
      assetId: assetTags.assetId,
      tagId: assetTags.tagId,
      tagName: tags.name,
      tagColor: tags.color,
    })
    .from(assetTags)
    .innerJoin(assets, eq(assetTags.assetId, assets.id))
    .innerJoin(tags, eq(assetTags.tagId, tags.id))
    .where(and(eq(assets.userId, userId), isNull(assets.deletedAt)))
}
