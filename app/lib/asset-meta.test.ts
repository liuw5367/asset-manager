import { describe, expect, it } from 'vitest'
import { calculateAssetDurationDays, formatDaysWithYears } from './asset-meta'

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

describe('formatDaysWithYears', () => {
  it('365 天及以下只显示天数', () => {
    expect(formatDaysWithYears(365)).toBe('365 天')
  })

  it('超过 365 天显示年数', () => {
    expect(formatDaysWithYears(366)).toBe('366 天（1 年+）')
    expect(formatDaysWithYears(500)).toBe('500 天（1 年+）')
  })
})
