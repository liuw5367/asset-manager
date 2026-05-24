import { z } from 'zod'

export const planMemberSchema = z.object({
  userId: z.string().min(1, '成员不能为空'),
  role: z.enum(['owner', 'editor']),
  note: z.string().max(120, '备注最多 120 字').optional(),
})

export const planDefaultItemSchema = z.object({
  id: z.string().optional(),
  name: z.string().max(50, '名称最多 50 字'),
  itemType: z.enum(['income', 'expense']),
  sortOrder: z.number().int().min(0),
})

export const planSaveSchema = z.object({
  name: z.string().trim().min(1, '计划名称必填').max(60, '计划名称最多 60 字'),
  emoji: z.string().trim().min(1).max(4),
  planMode: z.enum(['accumulate', 'snapshot']).default('accumulate'),
  permission: z.enum(['own', 'all']),
  startingValue: z.string().trim().default('0'),
  members: z.array(planMemberSchema).default([]),
  defaultItems: z.array(planDefaultItemSchema).default([]),
})

const amountString = z.string().trim().refine((value) => {
  if (!value)
    return false
  const num = Number(value)
  return Number.isFinite(num) && num >= 0
}, '金额格式不正确')

const accumulatePatchSchema = z.object({
  mode: z.literal('accumulate'),
  year: z.number().int().min(2000).max(2200),
  month: z.number().int().min(1).max(12),
  expectedRecordUpdatedAt: z.string().optional(),
  addedItems: z.array(z.object({
    memberId: z.string().min(1),
    itemType: z.enum(['income', 'expense']),
    name: z.string().trim().max(50),
    amount: amountString,
  })).default([]),
  updatedItems: z.array(z.object({
    id: z.string().min(1),
    memberId: z.string().min(1),
    name: z.string().trim().min(1).max(50),
    amount: amountString,
    expectedUpdatedAt: z.string().optional(),
  })).default([]),
  deletedItems: z.array(z.object({
    id: z.string().min(1),
    expectedUpdatedAt: z.string().optional(),
  })).default([]),
})

const snapshotPatchSchema = z.object({
  mode: z.literal('snapshot'),
  year: z.number().int().min(2000).max(2200),
  month: z.number().int().min(1).max(12),
  expectedRecordUpdatedAt: z.string().optional(),
  recordedTotalValue: amountString,
  memberNotes: z.array(z.object({
    memberId: z.string().min(1),
    note: z.string().trim().max(300).default(''),
    expectedUpdatedAt: z.string().optional(),
  })).default([]),
})

export const planRecordPatchSchema = z.discriminatedUnion('mode', [
  accumulatePatchSchema,
  snapshotPatchSchema,
])
