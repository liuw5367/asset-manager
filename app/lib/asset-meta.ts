import currency from 'currency.js'
import { differenceInDays, isAfter } from 'date-fns'

export type AssetType = 'one_time' | 'subscription'
export type BillingCycle = 'monthly' | 'quarterly' | 'yearly'
export interface CalculateAssetDurationDaysInput {
  assetType: AssetType
  purchaseDate?: string | null
  subscriptionStartDate?: string | null
  tradedInAt?: string | null
  subscriptionStoppedAt?: string | null
  ended?: boolean
}

export function getAssetDetailPath(asset: { id: string, assetType: AssetType }) {
  return asset.assetType === 'subscription' ? `/subscriptions/${asset.id}` : `/assets/${asset.id}`
}

export function getAssetEditPath(asset: { id: string, assetType: AssetType }) {
  return asset.assetType === 'subscription' ? `/subscriptions/${asset.id}/edit` : `/assets/${asset.id}/edit`
}

export function getBillingCycleLabel(cycle?: BillingCycle | null) {
  if (cycle === 'monthly')
    return '月付'
  if (cycle === 'quarterly')
    return '季付'
  if (cycle === 'yearly')
    return '年付'
  return '—'
}

export function toAmount(value: unknown) {
  if (typeof value === 'number')
    return value
  if (typeof value === 'string' && value.trim())
    return Number(value)
  return 0
}

export function subAmount(a: unknown, b: unknown) {
  return currency(toAmount(a)).subtract(toAmount(b)).value
}

export function calculateHoldingDays(startDate?: string | null, endDate?: string | null) {
  if (!startDate)
    return 0
  const start = new Date(`${startDate}T00:00:00`)
  const end = endDate
    ? new Date(`${endDate}T00:00:00`)
    : new Date()
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()))
    return 0
  if (isAfter(start, end))
    return 0
  return Math.max(0, differenceInDays(end, start))
}

export function calculateAssetDurationDays(input: CalculateAssetDurationDaysInput) {
  const startDate = input.assetType === 'subscription'
    ? input.subscriptionStartDate || input.purchaseDate
    : input.purchaseDate
  const endDate = input.assetType === 'subscription' ? input.subscriptionStoppedAt : input.tradedInAt

  if (input.ended && !endDate)
    return 0

  return calculateHoldingDays(startDate, endDate)
}

export function formatNumber(value: unknown, digits = 2) {
  const num = toAmount(value)
  return num.toLocaleString('zh-CN', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })
}

export function formatInteger(value: unknown) {
  const num = Math.round(toAmount(value))
  return num.toLocaleString('zh-CN')
}
