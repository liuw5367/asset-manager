import { addDays, differenceInMonths, format, startOfMonth, startOfYear, subMonths } from 'date-fns'
import { and, eq, gte, isNull, lte } from 'drizzle-orm'
import { db } from '~/db'
import { assets, categories, subscriptionRenewals, warranties } from '~/db/schema'
import { calcOneTimeDailyCost, calcSubscriptionDailyCost } from '~/lib/cost'

const CATEGORY_COLORS: Record<string, string> = {
  '💻': '#cc785c',
  '🔧': '#5db8a6',
  '📚': '#5db872',
  '🔄': '#d4a017',
  '📷': '#8b6cc1',
  '🏠': '#6c6a64',
  '📦': '#9ca3af',
  '🎮': '#e87070',
}

export interface DashboardData {
  kpi: {
    totalDailyCost: number
    monthlyEstimate: number
    yearlyEstimate: number
    totalSpent: number
    assetCount: number
  }
  categorySpending: {
    name: string
    emoji: string
    amount: number
    percent: number
    color: string
  }[]
  monthlyTrend: {
    month: string
    label: string
    amount: number
  }[]
  expiring: {
    id: string
    emoji: string
    name: string
    detail: string
  }[]
}

export async function getDashboardData(userId: string): Promise<DashboardData> {
  const today = new Date()
  const todayStr = format(today, 'yyyy-MM-dd')

  // 1. 获取所有未删除的资产
  const allAssets = await db
    .select({
      id: assets.id,
      name: assets.name,
      emoji: assets.emoji,
      categoryId: assets.categoryId,
      assetType: assets.assetType,
      purchasePrice: assets.purchasePrice,
      purchaseDate: assets.purchaseDate,
      subscriptionPrice: assets.subscriptionPrice,
      billingCycle: assets.billingCycle,
      subscriptionStatus: assets.subscriptionStatus,
      subscriptionStoppedAt: assets.subscriptionStoppedAt,
      subscriptionStartDate: assets.subscriptionStartDate,
      tradedInAt: assets.tradedInAt,
      tradeInPrice: assets.tradeInPrice,
    })
    .from(assets)
    .where(and(eq(assets.userId, userId), isNull(assets.deletedAt)))

  // 2. 获取所有分类
  const allCategories = await db
    .select({ id: categories.id, name: categories.name, emoji: categories.emoji })
    .from(categories)
    .where(eq(categories.userId, userId))

  const categoryMap = Object.fromEntries(allCategories.map(c => [c.id, c]))

  // 3. 筛选活跃资产（未换购、订阅未停止）
  const activeAssets = allAssets.filter((a) => {
    if (a.tradedInAt)
      return false
    if (a.assetType === 'subscription' && a.subscriptionStoppedAt)
      return false
    return true
  })

  // 4. 计算 KPI
  // 4a. 订阅每日花费：只计算今天仍在有效期内的订阅
  let subscriptionDailyCost = 0
  let subscriptionMonthlyCost = 0
  for (const a of allAssets) {
    if (a.assetType !== 'subscription' || !a.subscriptionPrice || !a.billingCycle)
      continue
    const startDate = a.subscriptionStartDate || a.purchaseDate
    if (startDate && startDate > todayStr)
      continue
    if (a.subscriptionStoppedAt && a.subscriptionStoppedAt <= todayStr)
      continue
    const price = Number(a.subscriptionPrice)
    subscriptionDailyCost += calcSubscriptionDailyCost(price, a.billingCycle)
    if (a.billingCycle === 'monthly')
      subscriptionMonthlyCost += price
    else if (a.billingCycle === 'quarterly')
      subscriptionMonthlyCost += price / 3
    else subscriptionMonthlyCost += price / 12
  }

  // 4b. 买断每日花费：已回收的不计入（以旧换新在累计支出中单独处理）
  let oneTimeDailyCost = 0
  for (const a of allAssets) {
    if (a.assetType !== 'one_time' || !a.purchasePrice || !a.purchaseDate || a.tradedInAt)
      continue
    oneTimeDailyCost += calcOneTimeDailyCost(Number(a.purchasePrice), a.purchaseDate)
  }

  const totalDailyCost = subscriptionDailyCost + oneTimeDailyCost
  const monthlyEstimate = Math.round(subscriptionMonthlyCost + oneTimeDailyCost * 30)
  const yearlyEstimate = Math.round(subscriptionMonthlyCost * 12 + oneTimeDailyCost * 365)

  // 4c. 累计支出：本年订阅续费 + 本年买断费用
  const yearStart = format(startOfYear(today), 'yyyy-MM-dd')

  const yearRenewals = await db
    .select({ price: subscriptionRenewals.price })
    .from(subscriptionRenewals)
    .innerJoin(assets, eq(subscriptionRenewals.assetId, assets.id))
    .where(and(
      eq(assets.userId, userId),
      isNull(assets.deletedAt),
      gte(subscriptionRenewals.startDate, yearStart),
      lte(subscriptionRenewals.startDate, todayStr),
    ))

  const subscriptionSpent = yearRenewals.reduce((sum, r) => sum + Number(r.price), 0)

  // 本年新购入的买断资产（未回收）
  const yearNewOneTime = allAssets.filter(a =>
    a.assetType === 'one_time'
    && a.purchasePrice
    && a.purchaseDate
    && !a.tradedInAt
    && a.purchaseDate >= yearStart
    && a.purchaseDate <= todayStr,
  )

  // 本年发生以旧换新的旧资产（按回收日期计入，而非购买日期）
  const yearTradedIn = allAssets.filter(a =>
    a.assetType === 'one_time'
    && a.purchasePrice
    && a.tradedInAt
    && a.tradeInPrice
    && a.tradedInAt >= yearStart
    && a.tradedInAt <= todayStr,
  )

  const oneTimeSpent = yearNewOneTime.reduce((sum, a) => sum + Number(a.purchasePrice), 0)
    + yearTradedIn.reduce((sum, a) => sum + Number(a.purchasePrice) - Number(a.tradeInPrice), 0)

  const totalSpent = subscriptionSpent + oneTimeSpent
  const assetCount = activeAssets.length

  // 5. 分类花费
  const catSpending: Record<string, number> = {}
  for (const a of allAssets) {
    if (a.purchasePrice && !a.tradedInAt && a.categoryId) {
      catSpending[a.categoryId] = (catSpending[a.categoryId] || 0) + Number(a.purchasePrice)
    }
  }
  const categorySpending = Object.entries(catSpending)
    .map(([catId, amount]) => {
      const cat = categoryMap[catId]
      return {
        name: cat?.name || '未分类',
        emoji: cat?.emoji || '📦',
        amount,
        percent: totalSpent > 0 ? Math.round((amount / totalSpent) * 100) : 0,
        color: CATEGORY_COLORS[cat?.emoji || '📦'] || '#9ca3af',
      }
    })
    .sort((a, b) => b.amount - a.amount)

  // 6. 月度趋势（近 6 个月实际持有成本）
  const monthlyTrend: DashboardData['monthlyTrend'] = []
  for (let i = 5; i >= 0; i--) {
    const monthStart = startOfMonth(subMonths(today, i))
    const monthStr = format(monthStart, 'yyyy-MM')
    const label = format(monthStart, 'M月')

    let monthCost = 0
    for (const a of allAssets) {
      if (a.tradedInAt && a.tradedInAt < format(monthStart, 'yyyy-MM-dd'))
        continue
      if (a.assetType === 'subscription' && a.subscriptionStoppedAt && a.subscriptionStoppedAt < format(monthStart, 'yyyy-MM-dd'))
        continue

      if (a.assetType === 'one_time' && a.purchasePrice && a.purchaseDate) {
        if (a.purchaseDate > format(addDays(monthStart, 31), 'yyyy-MM-dd'))
          continue
        const holdingEnd = a.tradedInAt || todayStr
        if (holdingEnd < format(monthStart, 'yyyy-MM-dd'))
          continue
        const totalMonths = Math.max(1, differenceInMonths(
          new Date(holdingEnd > todayStr ? todayStr : holdingEnd),
          new Date(a.purchaseDate),
        ))
        monthCost += Number(a.purchasePrice) / totalMonths
      }
      else if (a.assetType === 'subscription' && a.subscriptionPrice && a.billingCycle) {
        const start = a.purchaseDate || a.subscriptionStartDate
        if (start && start > format(addDays(monthStart, 31), 'yyyy-MM-dd'))
          continue
        const price = Number(a.subscriptionPrice)
        if (a.billingCycle === 'monthly')
          monthCost += price
        else if (a.billingCycle === 'quarterly')
          monthCost += price / 3
        else monthCost += price / 12
      }
    }

    monthlyTrend.push({ month: monthStr, label, amount: Math.round(monthCost) })
  }

  // 7. 即将到期（30 天内）
  const thirtyDaysLater = format(addDays(today, 30), 'yyyy-MM-dd')
  const expiring: DashboardData['expiring'] = []

  // 订阅到期
  for (const a of activeAssets) {
    if (a.assetType !== 'subscription' || !a.subscriptionStatus || a.subscriptionStatus !== 'active')
      continue
    // 计算下次续费日
    if (a.purchaseDate && a.billingCycle) {
      let next = new Date(a.purchaseDate)
      while (format(next, 'yyyy-MM-dd') <= todayStr) {
        if (a.billingCycle === 'monthly')
          next = addDays(next, 30)
        else if (a.billingCycle === 'quarterly')
          next = addDays(next, 91)
        else next = addDays(next, 365)
      }
      const nextStr = format(next, 'yyyy-MM-dd')
      if (nextStr <= thirtyDaysLater) {
        const daysLeft = Math.ceil((next.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
        expiring.push({
          id: a.id,
          emoji: a.emoji,
          name: a.name,
          detail: `订阅 · ${nextStr} 到期（${daysLeft} 天后）`,
        })
      }
    }
  }

  // 保修到期
  const allWarranties = await db
    .select({
      assetId: warranties.assetId,
      endDate: warranties.endDate,
    })
    .from(warranties)
    .innerJoin(assets, eq(warranties.assetId, assets.id))
    .where(and(
      eq(assets.userId, userId),
      isNull(assets.deletedAt),
      lte(warranties.endDate, thirtyDaysLater),
      gte(warranties.endDate, todayStr),
    ))

  for (const w of allWarranties) {
    const asset = allAssets.find(a => a.id === w.assetId)
    if (!asset)
      continue
    const daysLeft = Math.ceil((new Date(w.endDate).getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    expiring.push({
      id: asset.id,
      emoji: asset.emoji,
      name: asset.name,
      detail: `保修 · ${w.endDate} 到期（${daysLeft} 天后）`,
    })
  }

  expiring.sort((a, b) => {
    const daysA = Number.parseInt(a.detail.match(/(\d+) 天后/)?.[1] || '999')
    const daysB = Number.parseInt(b.detail.match(/(\d+) 天后/)?.[1] || '999')
    return daysA - daysB
  })

  return { kpi: { totalDailyCost, monthlyEstimate, yearlyEstimate, totalSpent, assetCount }, categorySpending, monthlyTrend, expiring }
}
