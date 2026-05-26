import { describe, expect, it } from 'vitest'
import { calcOneTimeCostRange, calcSoldOneTimeCostRange } from './cost'

describe('calcOneTimeCostRange', () => {
  it('当区间起点等于购入日时不应出现 Infinity', () => {
    const amount = calcOneTimeCostRange(
      100,
      '2026-01-01',
      new Date('2026-01-01'),
      new Date('2026-01-10'),
    )

    const expectedHarmonic = Array.from({ length: 10 }, (_, i) => 1 / (i + 1))
      .reduce((sum, n) => sum + n, 0)

    expect(Number.isFinite(amount)).toBe(true)
    expect(amount).toBeCloseTo(100 * expectedHarmonic, 10)
  })
})

describe('calcSoldOneTimeCostRange', () => {
  it('已卖出资产在首日区间同样不应出现 Infinity', () => {
    const amount = calcSoldOneTimeCostRange(
      100,
      '2026-01-01',
      20,
      '2026-01-10',
      new Date('2026-01-01'),
      new Date('2026-01-01'),
    )

    expect(Number.isFinite(amount)).toBe(true)
    expect(amount).toBeCloseTo(80, 10)
  })
})
