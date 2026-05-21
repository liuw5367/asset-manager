import { z } from 'zod'

export const assetFormSchema = z.object({
  name: z.string().min(1, '名称必填').max(60, '名称最多 60 个字符'),
  emoji: z.string().min(1),
  categoryId: z.string().min(1, '请选择分类'),
  assetType: z.enum(['one_time', 'subscription']),
  paymentTypeId: z.string().optional(),
  paymentAccountId: z.string().optional(),
  tagIds: z.array(z.string()),
  notes: z.string().max(500, '备注最多 500 个字符').optional(),

  // 买断型
  purchasePrice: z.string().optional(),
  currentValue: z.string().optional(),
  purchaseDate: z.string().optional(),

  // 订阅型
  subscriptionPrice: z.string().optional(),
  billingCycle: z.enum(['monthly', 'quarterly', 'yearly']).optional(),
  nextRenewalDate: z.string().optional(),
  subscriptionStartDate: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.assetType === 'one_time') {
    if (!data.purchasePrice || Number(data.purchasePrice) <= 0) {
      ctx.addIssue({ code: 'custom', message: '购入价必须大于 0', path: ['purchasePrice'] })
    }
    if (!data.purchaseDate) {
      ctx.addIssue({ code: 'custom', message: '请选择购入日期', path: ['purchaseDate'] })
    }
  }
  else {
    if (!data.subscriptionPrice || Number(data.subscriptionPrice) <= 0) {
      ctx.addIssue({ code: 'custom', message: '订阅价必须大于 0', path: ['subscriptionPrice'] })
    }
    if (!data.billingCycle) {
      ctx.addIssue({ code: 'custom', message: '请选择订阅周期', path: ['billingCycle'] })
    }
    if (!data.nextRenewalDate) {
      ctx.addIssue({ code: 'custom', message: '请选择下次续费日期', path: ['nextRenewalDate'] })
    }
  }
})

export type AssetFormValues = z.infer<typeof assetFormSchema>

export const repairRecordSchema = z.object({
  repairDate: z.string().min(1, '请选择维修日期'),
  cost: z.string().default('0'),
  reason: z.string().optional(),
  vendor: z.string().optional(),
  result: z.string().optional(),
  isDone: z.boolean().default(true),
})

export type RepairRecordFormValues = z.infer<typeof repairRecordSchema>
