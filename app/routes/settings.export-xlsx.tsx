import type { LoaderFunctionArgs } from 'react-router'
import { and, eq, inArray, isNull } from 'drizzle-orm'
import { redirect } from 'react-router'
import * as XLSX from 'xlsx'
import { db } from '~/db'
import { getAssetTagsByUserId } from '~/db/queries/assets'
import { assets, categories, paymentAccounts, paymentTypes, planMembers, planRecordItems, planRecordMemberNotes, planRecords, plans, profiles } from '~/db/schema'
import { createSupabaseServerClient } from '~/lib/supabase.server'

export async function loader({ request }: LoaderFunctionArgs) {
  const { supabase, headers } = createSupabaseServerClient(request)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user)
    throw redirect('/login', { headers })

  const userId = user.id

  const wb = XLSX.utils.book_new()

  // ==================== Sheet 1: 资产列表 ====================
  const assetRows = await db
    .select({
      id: assets.id,
      name: assets.name,
      emoji: assets.emoji,
      assetType: assets.assetType,
      categoryName: categories.name,
      categoryEmoji: categories.emoji,
      purchasePrice: assets.purchasePrice,
      currentValue: assets.currentValue,
      purchaseDate: assets.purchaseDate,
      purchaseReceipt: assets.purchaseReceipt,
      subscriptionPrice: assets.subscriptionPrice,
      billingCycle: assets.billingCycle,
      nextRenewalDate: assets.nextRenewalDate,
      subscriptionStartDate: assets.subscriptionStartDate,
      subscriptionStatus: assets.subscriptionStatus,
      subscriptionStoppedAt: assets.subscriptionStoppedAt,
      paymentTypeName: paymentTypes.name,
      paymentAccountName: paymentAccounts.name,
      notes: assets.notes,
      tradedInAt: assets.tradedInAt,
      tradeInPrice: assets.tradeInPrice,
      createdAt: assets.createdAt,
      updatedAt: assets.updatedAt,
    })
    .from(assets)
    .leftJoin(categories, eq(assets.categoryId, categories.id))
    .leftJoin(paymentTypes, eq(assets.paymentTypeId, paymentTypes.id))
    .leftJoin(paymentAccounts, eq(assets.paymentAccountId, paymentAccounts.id))
    .where(and(eq(assets.userId, userId), isNull(assets.deletedAt)))
    .orderBy(assets.createdAt)

  const tagRows = await getAssetTagsByUserId(userId)
  const tagMap = new Map<string, string>()
  for (const row of tagRows) {
    const existing = tagMap.get(row.assetId) || ''
    tagMap.set(row.assetId, existing ? `${existing}、${row.tagName}` : row.tagName)
  }

  const assetSheetRows = assetRows.map(a => ({
    名称: a.name,
    Emoji: a.emoji,
    类型: a.assetType === 'subscription' ? '订阅' : '买断',
    分类: a.categoryName ? `${a.categoryEmoji || ''} ${a.categoryName}`.trim() : '未分类',
    购入价: a.purchasePrice ? Number(a.purchasePrice) : '',
    当前估价: a.currentValue ? Number(a.currentValue) : '',
    购入日期: a.purchaseDate || '',
    凭证: a.purchaseReceipt || '',
    订阅价: a.subscriptionPrice ? Number(a.subscriptionPrice) : '',
    计费周期: a.billingCycle ? ({ monthly: '月付', quarterly: '季付', yearly: '年付' })[a.billingCycle] : '',
    下次续费日: a.nextRenewalDate || '',
    订阅开始日: a.subscriptionStartDate || '',
    订阅状态: a.subscriptionStatus === 'cancelled' ? '已取消' : a.subscriptionStatus === 'active' ? '活跃' : '',
    订阅停用日: a.subscriptionStoppedAt || '',
    支付类型: a.paymentTypeName || '',
    支付账户: a.paymentAccountName || '',
    备注: a.notes || '',
    以旧换新日期: a.tradedInAt || '',
    回收价: a.tradeInPrice ? Number(a.tradeInPrice) : '',
    创建时间: a.createdAt ? new Date(a.createdAt).toISOString().slice(0, 19) : '',
    更新时间: a.updatedAt ? new Date(a.updatedAt).toISOString().slice(0, 19) : '',
    标签: tagMap.get(a.id) || '',
  }))

  const ws1 = XLSX.utils.json_to_sheet(assetSheetRows)
  ws1['!cols'] = [
    { wch: 20 },
    { wch: 6 },
    { wch: 6 },
    { wch: 12 },
    { wch: 10 },
    { wch: 10 },
    { wch: 12 },
    { wch: 16 },
    { wch: 10 },
    { wch: 8 },
    { wch: 12 },
    { wch: 12 },
    { wch: 8 },
    { wch: 12 },
    { wch: 10 },
    { wch: 12 },
    { wch: 20 },
    { wch: 12 },
    { wch: 10 },
    { wch: 18 },
    { wch: 18 },
    { wch: 16 },
  ]
  XLSX.utils.book_append_sheet(wb, ws1, '资产列表')

  // ==================== Sheet 2+: 各计划 ====================
  const userPlans = await db
    .select({
      id: plans.id,
      name: plans.name,
      emoji: plans.emoji,
      planMode: plans.mode,
      permission: plans.permission,
      startingValue: plans.startingValue,
    })
    .from(planMembers)
    .innerJoin(plans, eq(planMembers.planId, plans.id))
    .where(and(
      eq(planMembers.userId, userId),
      isNull(planMembers.deletedAt),
      isNull(plans.deletedAt),
    ))

  for (const plan of userPlans) {
    // 获取计划所有成员
    const planMemberRows = await db
      .select({
        userId: planMembers.userId,
        displayName: profiles.displayName,
      })
      .from(planMembers)
      .innerJoin(profiles, eq(planMembers.userId, profiles.id))
      .where(and(eq(planMembers.planId, plan.id), isNull(planMembers.deletedAt)))

    const recordRows = await db
      .select()
      .from(planRecords)
      .where(and(eq(planRecords.planId, plan.id), isNull(planRecords.deletedAt)))
      .orderBy(planRecords.year, planRecords.month)

    if (recordRows.length === 0)
      continue

    const recordIds = recordRows.map(r => r.id)
    const [itemRows, noteRows] = await Promise.all([
      db
        .select()
        .from(planRecordItems)
        .where(and(inArray(planRecordItems.recordId, recordIds), isNull(planRecordItems.deletedAt))),
      db
        .select()
        .from(planRecordMemberNotes)
        .where(and(inArray(planRecordMemberNotes.recordId, recordIds), isNull(planRecordMemberNotes.deletedAt))),
    ])

    const itemMap = new Map<string, typeof itemRows>()
    for (const item of itemRows) {
      const list = itemMap.get(item.recordId) || []
      list.push(item)
      itemMap.set(item.recordId, list)
    }
    const noteMap = new Map<string, typeof noteRows>()
    for (const note of noteRows) {
      const list = noteMap.get(note.recordId) || []
      list.push(note)
      noteMap.set(note.recordId, list)
    }

    let previousTotal = Number(plan.startingValue)
    const sheetRows: Record<string, unknown>[] = []

    for (const rec of recordRows) {
      const items = itemMap.get(rec.id) || []
      const notes = noteMap.get(rec.id) || []

      // 按成员聚合收支
      const incomeByMember = new Map<string, number>()
      const expenseByMember = new Map<string, number>()
      const notesByMember = new Map<string, string>()
      for (const member of planMemberRows) {
        incomeByMember.set(member.userId, 0)
        expenseByMember.set(member.userId, 0)
      }
      for (const item of items) {
        const map = item.itemType === 'income' ? incomeByMember : expenseByMember
        map.set(item.memberId, (map.get(item.memberId) || 0) + Number(item.amount))
      }
      for (const note of notes) {
        if (note.note.trim())
          notesByMember.set(note.memberId, note.note.trim())
      }

      const monthIncome = [...incomeByMember.values()].reduce((s, v) => s + v, 0)
      const monthExpense = [...expenseByMember.values()].reduce((s, v) => s + v, 0)
      const monthNet = monthIncome - monthExpense

      let netIncome = monthNet
      let totalValue: number
      if (plan.planMode === 'snapshot') {
        totalValue = monthNet
        netIncome = totalValue - previousTotal
      }
      else {
        totalValue = previousTotal + monthNet
      }
      previousTotal = totalValue

      const row: Record<string, unknown> = {
        年月: `${rec.year}-${String(rec.month).padStart(2, '0')}`,
        模式: plan.planMode === 'snapshot' ? '总额记录' : '收支累加',
        月收入合计: monthIncome,
        月支出合计: monthExpense,
        月净收入: netIncome,
        总额: totalValue,
      }

      for (const member of planMemberRows) {
        const name = member.displayName || member.userId
        const inc = incomeByMember.get(member.userId) || 0
        const exp = expenseByMember.get(member.userId) || 0
        const note = notesByMember.get(member.userId) || ''
        row[`${name} 收入`] = inc || ''
        row[`${name} 支出`] = exp || ''
        if (note)
          row[`${name} 备注`] = note
      }

      sheetRows.push(row)
    }

    const ws = XLSX.utils.json_to_sheet(sheetRows)
    const colCount = 6 + planMemberRows.length * (noteMap.size > 0 ? 3 : 2)
    ws['!cols'] = Array.from({ length: colCount }, () => ({ wch: 12 }))
    const sheetName = `计划-${plan.name}`.slice(0, 31)
    XLSX.utils.book_append_sheet(wb, ws, sheetName)
  }

  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })

  return new Response(buf, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="holdly-export-${new Date().toISOString().slice(0, 10)}.xlsx"`,
    },
  })
}
