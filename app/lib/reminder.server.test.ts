import { describe, expect, it } from 'vitest'
import { calcDueDate } from './reminder.server'
import type { assets } from '~/db/schema'

function makeAsset(overrides: Partial<typeof assets.$inferSelect>): typeof assets.$inferSelect {
  return {
    id: 'test',
    userId: 'test',
    name: 'Test',
    emoji: '📦',
    categoryId: null,
    assetType: 'subscription',
    purchasePrice: null,
    currentValue: null,
    purchaseDate: null,
    purchaseReceipt: null,
    subscriptionPrice: null,
    billingCycle: null,
    nextRenewalDate: null,
    subscriptionStartDate: null,
    subscriptionStatus: 'active',
    subscriptionStoppedAt: null,
    paymentTypeId: null,
    paymentAccountId: null,
    notes: null,
    reminderEnabled: false,
    reminderSubscriptionDaysOverride: null,
    reminderWarrantyDaysOverride: null,
    deletedAt: null,
    tradedInAt: null,
    tradeInPrice: null,
    tradedFromAssetId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

describe('calcDueDate', () => {
  it('订阅有 nextRenewalDate 且未过期时返回它', () => {
    const asset = makeAsset({
      billingCycle: 'monthly',
      subscriptionStartDate: '2026-01-01',
      nextRenewalDate: '2026-06-15',
    })
    expect(calcDueDate(asset)).toBe('2026-06-15')
  })

  it('nextRenewalDate 已过期时忽略，重新推算', () => {
    const asset = makeAsset({
      billingCycle: 'monthly',
      subscriptionStartDate: '2026-01-01',
      nextRenewalDate: '2020-01-01',
    })
    const result = calcDueDate(asset)
    expect(result).not.toBe('2020-01-01')
    expect(result).toBeTruthy()
  })

  it('无 billingCycle 返回 null', () => {
    const asset = makeAsset({
      billingCycle: null,
      subscriptionStartDate: '2026-01-01',
    })
    expect(calcDueDate(asset)).toBeNull()
  })

  it('无 startDate 返回 null', () => {
    const asset = makeAsset({
      billingCycle: 'monthly',
      subscriptionStartDate: null,
      purchaseDate: null,
    })
    expect(calcDueDate(asset)).toBeNull()
  })

  it('月付推算下一个续费日', () => {
    const start = new Date()
    start.setMonth(start.getMonth() - 1)
    const startStr = start.toISOString().slice(0, 10)
    const asset = makeAsset({
      billingCycle: 'monthly',
      subscriptionStartDate: startStr,
    })
    const result = calcDueDate(asset)
    expect(result).toBeTruthy()
    const resultDate = new Date(`${result}T00:00:00`)
    expect(resultDate.getTime()).toBeGreaterThan(start.getTime())
  })
})
