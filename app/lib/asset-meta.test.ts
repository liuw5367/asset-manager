import { describe, expect, it } from 'vitest'
import { calculateAssetDurationDays, formatDaysWithYears, getAssetDetailPath,
  getAssetEditPath,
  getBillingCycleLabel,
  toAmount,
  subAmount,
  calculateHoldingDays,
  formatNumber,
  formatInteger,
} from './asset-meta'

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

describe('getAssetDetailPath', () => {
  it('订阅型返回 /subscriptions/:id', () => {
    expect(getAssetDetailPath({ id: 'abc', assetType: 'subscription' })).toBe('/subscriptions/abc')
  })

  it('买断型返回 /assets/:id', () => {
    expect(getAssetDetailPath({ id: 'abc', assetType: 'one_time' })).toBe('/assets/abc')
  })
})

describe('getAssetEditPath', () => {
  it('订阅型返回 /subscriptions/:id/edit', () => {
    expect(getAssetEditPath({ id: 'abc', assetType: 'subscription' })).toBe('/subscriptions/abc/edit')
  })

  it('买断型返回 /assets/:id/edit', () => {
    expect(getAssetEditPath({ id: 'abc', assetType: 'one_time' })).toBe('/assets/abc/edit')
  })
})

describe('getBillingCycleLabel', () => {
  it('monthly → 月付', () => expect(getBillingCycleLabel('monthly')).toBe('月付'))
  it('quarterly → 季付', () => expect(getBillingCycleLabel('quarterly')).toBe('季付'))
  it('yearly → 年付', () => expect(getBillingCycleLabel('yearly')).toBe('年付'))
  it('null → —', () => expect(getBillingCycleLabel(null)).toBe('—'))
  it('undefined → —', () => expect(getBillingCycleLabel(undefined)).toBe('—'))
})

describe('toAmount', () => {
  it('number 原样返回', () => expect(toAmount(42)).toBe(42))
  it('数字字符串转 number', () => expect(toAmount('42.5')).toBe(42.5))
  it('空字符串返回 0', () => expect(toAmount('')).toBe(0))
  it('null 返回 0', () => expect(toAmount(null)).toBe(0))
  it('undefined 返回 0', () => expect(toAmount(undefined)).toBe(0))
})

describe('subAmount', () => {
  it('精确减法', () => {
    expect(subAmount('10.05', '0.05')).toBeCloseTo(10, 10)
  })

  it('字符串输入', () => {
    expect(subAmount('100', '20')).toBe(80)
  })
})

describe('calculateHoldingDays', () => {
  it('无开始日期返回 0', () => {
    expect(calculateHoldingDays(null)).toBe(0)
  })

  it('无结束日期计算到今天', () => {
    const days = calculateHoldingDays('2026-01-01')
    expect(days).toBeGreaterThan(0)
  })

  it('有结束日期正常计算', () => {
    expect(calculateHoldingDays('2026-01-01', '2026-01-10')).toBe(9)
  })

  it('开始日期晚于结束返回 0', () => {
    expect(calculateHoldingDays('2026-01-10', '2026-01-01')).toBe(0)
  })
})

describe('formatNumber', () => {
  it('默认 2 位小数', () => {
    expect(formatNumber(1234.5)).toBe('1,234.50')
  })

  it('指定小数位数', () => {
    expect(formatNumber(1234.5, 0)).toBe('1,235')
  })

  it('字符串输入', () => {
    expect(formatNumber('1234.5')).toBe('1,234.50')
  })
})

describe('formatInteger', () => {
  it('四舍五入', () => {
    expect(formatInteger(1234.56)).toBe('1,235')
  })

  it('字符串输入', () => {
    expect(formatInteger('1234.56')).toBe('1,235')
  })
})
