import { describe, expect, it } from 'vitest'
import { calculateAssetDurationDays } from './asset-meta'

describe('calculateAssetDurationDays', () => {
  it('订阅结束时使用 subscriptionStoppedAt 计算天数', () => {
    const days = calculateAssetDurationDays({
      assetType: 'subscription',
      purchaseDate: '2026-01-01',
      subscriptionStartDate: '2026-02-01',
      subscriptionStoppedAt: '2026-02-11',
      ended: true,
    })

    expect(days).toBe(10)
  })

  it('买断卖出时使用 tradedInAt 计算天数', () => {
    const days = calculateAssetDurationDays({
      assetType: 'one_time',
      purchaseDate: '2026-03-01',
      tradedInAt: '2026-03-08',
      ended: true,
    })

    expect(days).toBe(7)
  })

  it('已结束但缺少结束日期时返回 0，避免回落到今天', () => {
    const days = calculateAssetDurationDays({
      assetType: 'subscription',
      purchaseDate: '2026-01-01',
      subscriptionStartDate: '2026-01-10',
      ended: true,
    })

    expect(days).toBe(0)
  })
})
