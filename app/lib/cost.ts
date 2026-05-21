import currency from 'currency.js'
import { differenceInDays } from 'date-fns'

/**
 * 买断型资产每日成本
 * dailyCost = purchasePrice / holdingDays
 * holdingDays = today - purchaseDate（最小值为 1）
 */
export function calcOneTimeDailyCost(purchasePrice: number, purchaseDate: string): number {
  const days = Math.max(1, differenceInDays(new Date(), new Date(purchaseDate)))
  return currency(purchasePrice).divide(days).value
}

/**
 * 订阅型资产每日成本
 * monthly  → price / 30
 * quarterly → price / 91
 * yearly  → price / 365
 */
export function calcSubscriptionDailyCost(
  price: number,
  cycle: 'monthly' | 'quarterly' | 'yearly',
): number {
  const cycleDays = { monthly: 30, quarterly: 91, yearly: 365 }
  return currency(price).divide(cycleDays[cycle]).value
}
