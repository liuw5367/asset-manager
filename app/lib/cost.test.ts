import { describe, expect, it } from 'vitest'
import {
  calcOneTimeCostRange,
  calcOneTimeDailyCost,
  calcSoldOneTimeCostRange,
  calcSubscriptionDailyCost,
  activeDaysInRange,
  countSubPaymentsInMonth,
  calcSubscriptionCostRange,
} from './cost'

describe('calcOneTimeDailyCost', () => {
  it('购买首日返回购入价', () => {
    const today = new Date().toISOString().slice(0, 10)
    expect(calcOneTimeDailyCost(100, today)).toBeCloseTo(100, 10)
  })

  it('持有多天动态递减', () => {
    const daysAgo = new Date(Date.now() - 3 * 86400000).toISOString().slice(0, 10)
    const cost = calcOneTimeDailyCost(100, daysAgo)
    expect(cost).toBeCloseTo(25, 10)
  })

  it('future 日期返回正值', () => {
    const future = new Date(Date.now() + 86400000).toISOString().slice(0, 10)
    const cost = calcOneTimeDailyCost(100, future)
    expect(cost).toBeGreaterThan(0)
  })
})

describe('calcSubscriptionDailyCost', () => {
  it('月付除 30', () => {
    expect(calcSubscriptionDailyCost(300, 'monthly')).toBeCloseTo(10, 10)
  })

  it('季付除 91', () => {
    expect(calcSubscriptionDailyCost(273, 'quarterly')).toBeCloseTo(3, 10)
  })

  it('年付除 365', () => {
    expect(calcSubscriptionDailyCost(365, 'yearly')).toBeCloseTo(1, 10)
  })
})

describe('activeDaysInRange', () => {
  it('完整区间有效天数', () => {
    const days = activeDaysInRange(
      new Date('2026-01-01'),
      new Date('2026-01-10'),
      '2026-01-01',
      null,
    )
    expect(days).toBe(10)
  })

  it('有结束日期时在结束日前截止', () => {
    const days = activeDaysInRange(
      new Date('2026-01-01'),
      new Date('2026-01-20'),
      '2026-01-01',
      '2026-01-10',
    )
    expect(days).toBe(9)
  })

  it('区间完全不重叠返回 0', () => {
    const days = activeDaysInRange(
      new Date('2026-02-01'),
      new Date('2026-02-10'),
      '2026-01-01',
      '2026-01-10',
    )
    expect(days).toBe(0)
  })

  it('开始日期晚于区间起始', () => {
    const days = activeDaysInRange(
      new Date('2026-01-01'),
      new Date('2026-01-20'),
      '2026-01-10',
      null,
    )
    expect(days).toBe(11)
  })
})

describe('countSubPaymentsInMonth', () => {
  it('月付当月有续费日返回 1', () => {
    const count = countSubPaymentsInMonth(
      new Date('2026-02-01'),
      new Date('2026-02-28'),
      '2026-01-15',
      'monthly',
    )
    expect(count).toBe(1)
  })

  it('续费日早于区间返回 0', () => {
    const count = countSubPaymentsInMonth(
      new Date('2026-02-01'),
      new Date('2026-02-28'),
      '2026-03-01',
      'monthly',
    )
    expect(count).toBe(0)
  })

  it('季付每 3 个月一次', () => {
    const count = countSubPaymentsInMonth(
      new Date('2026-04-01'),
      new Date('2026-04-30'),
      '2026-01-15',
      'quarterly',
    )
    expect(count).toBe(1)
  })
})

describe('calcSubscriptionCostRange', () => {
  it('完整月返回 price/30 * activeDays', () => {
    const cost = calcSubscriptionCostRange(
      300,
      '2026-01-01',
      null,
      new Date('2026-01-01'),
      new Date('2026-01-10'),
    )
    expect(cost).toBeCloseTo(100, 10)
  })

  it('未激活期间返回 0', () => {
    const cost = calcSubscriptionCostRange(
      300,
      '2026-02-01',
      null,
      new Date('2026-01-01'),
      new Date('2026-01-31'),
    )
    expect(cost).toBe(0)
  })
})
