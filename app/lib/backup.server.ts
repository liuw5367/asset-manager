import process from 'node:process'
import { format } from 'date-fns'
import { and, eq, inArray, isNull } from 'drizzle-orm'
import * as XLSX from 'xlsx'
import { db } from '~/db'
import { getAssetTagsByUserId } from '~/db/queries/assets'
import { assets, categories, paymentAccounts, paymentTypes, planMembers, planRecordItems, planRecordMemberNotes, planRecords, plans, profiles } from '~/db/schema'
import { sendEmail } from '~/lib/email.server'

export async function generateExportXlsx(userId: string): Promise<Uint8Array> {
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
      tradedFromAssetId: assets.tradedFromAssetId,
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

  const assetNameMap = new Map(assetRows.map(a => [a.id, a.name]))

  const assetSheetRows = assetRows.map(a => ({
    名称: a.name,
    Emoji: a.emoji,
    类型: a.assetType === 'subscription' ? '订阅' : '买断',
    分类: a.categoryName ? `${a.categoryEmoji || ''} ${a.categoryName}`.trim() : '未分类',
    标签: tagMap.get(a.id) || '',
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
    卖出日期: a.tradedInAt || '',
    卖出价格: a.tradeInPrice ? Number(a.tradeInPrice) : '',
    旧资产: a.tradedFromAssetId ? (assetNameMap.get(a.tradedFromAssetId) || '') : '',
    创建时间: a.createdAt ? new Date(a.createdAt).toISOString().slice(0, 19) : '',
    更新时间: a.updatedAt ? new Date(a.updatedAt).toISOString().slice(0, 19) : '',
  }))

  const ws1 = XLSX.utils.json_to_sheet(assetSheetRows)
  ws1['!cols'] = [
    { wch: 20 },
    { wch: 6 },
    { wch: 6 },
    { wch: 12 },
    { wch: 16 },
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
    const planMemberRows = await db
      .select({
        userId: planMembers.userId,
        displayName: profiles.displayName,
      })
      .from(planMembers)
      .innerJoin(profiles, eq(planMembers.userId, profiles.id))
      .where(and(eq(planMembers.planId, plan.id), isNull(planMembers.deletedAt)))

    const memberNameMap = new Map(planMemberRows.map(m => [m.userId, m.displayName || m.userId.slice(0, 8)]))

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

    const itemByRecord = new Map<string, typeof itemRows>()
    for (const item of itemRows) {
      const list = itemByRecord.get(item.recordId) || []
      list.push(item)
      itemByRecord.set(item.recordId, list)
    }
    const noteByRecord = new Map<string, typeof noteRows>()
    for (const note of noteRows) {
      const list = noteByRecord.get(note.recordId) || []
      list.push(note)
      noteByRecord.set(note.recordId, list)
    }

    const itemColumns = new Map<string, string>()
    const seenSet = new Set<string>()
    for (const items of itemByRecord.values()) {
      for (const item of items) {
        const key = `${item.memberId}:${item.name}`
        if (!seenSet.has(key)) {
          seenSet.add(key)
          const name = memberNameMap.get(item.memberId) || item.memberId
          itemColumns.set(key, `${name}:${item.name}`)
        }
      }
    }
    const itemColumnKeys = [...itemColumns.keys()]
    const noteMembers = planMemberRows.map(m => ({
      userId: m.userId,
      name: memberNameMap.get(m.userId)!,
    }))

    let previousTotal = Number(plan.startingValue)
    const sheetRows: Record<string, unknown>[] = []

    for (const rec of recordRows) {
      const items = itemByRecord.get(rec.id) || []
      const notes = noteByRecord.get(rec.id) || []

      const monthIncome = items.filter(i => i.itemType === 'income').reduce((s, i) => s + Number(i.amount), 0)
      const monthExpense = items.filter(i => i.itemType === 'expense').reduce((s, i) => s + Number(i.amount), 0)
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
        月收入合计: monthIncome || '',
        月支出合计: monthExpense || '',
        月净收入: netIncome,
        总额: totalValue === 0 && rec.year === 0 && rec.month === 0 ? '' : totalValue,
      }

      for (const colKey of itemColumnKeys) {
        const [memberId, itemName] = colKey.split(':')
        const amt = items
          .filter(i => i.memberId === memberId && i.name === itemName)
          .reduce((s, i) => s + Number(i.amount), 0)
        if (amt !== 0)
          row[itemColumns.get(colKey)!] = amt
      }

      for (const m of noteMembers) {
        const note = notes.find(n => n.memberId === m.userId)
        if (note?.note?.trim())
          row[`${m.name}:备注`] = note.note.trim()
      }

      sheetRows.push(row)
    }

    const ws = XLSX.utils.json_to_sheet(sheetRows)
    const colCount = 6 + itemColumnKeys.length + noteMembers.filter(m =>
      [...noteByRecord.values()].some(notes => notes.some(n => n.memberId === m.userId && n.note.trim())),
    ).length
    ws['!cols'] = Array.from({ length: Math.max(colCount, 6) }, () => ({ wch: 12 }))
    const sheetName = `计划-${plan.name}`.slice(0, 31)
    XLSX.utils.book_append_sheet(wb, ws, sheetName)
  }

  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as unknown as Uint8Array
}

async function getAssetData(userId: string) {
  const rows = await db
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
      tradedFromAssetId: assets.tradedFromAssetId,
      createdAt: assets.createdAt,
      updatedAt: assets.updatedAt,
    })
    .from(assets)
    .leftJoin(categories, eq(assets.categoryId, categories.id))
    .leftJoin(paymentTypes, eq(assets.paymentTypeId, paymentTypes.id))
    .leftJoin(paymentAccounts, eq(assets.paymentAccountId, paymentAccounts.id))
    .where(and(eq(assets.userId, userId), isNull(assets.deletedAt)))
    .orderBy(assets.createdAt)

  return rows
}

async function getPlanData(userId: string) {
  return db
    .select({
      id: plans.id,
      name: plans.name,
      emoji: plans.emoji,
      planMode: plans.mode,
      startingValue: plans.startingValue,
    })
    .from(planMembers)
    .innerJoin(plans, eq(planMembers.planId, plans.id))
    .where(and(
      eq(planMembers.userId, userId),
      isNull(planMembers.deletedAt),
      isNull(plans.deletedAt),
    ))
}

function esc(text: unknown): string {
  return String(text ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

export async function generateBackupHtml(userId: string): Promise<string> {
  const assetRows = await getAssetData(userId)
  const plans = await getPlanData(userId)
  const tagRows = await getAssetTagsByUserId(userId)

  const tagMap = new Map<string, string>()
  for (const row of tagRows) {
    const existing = tagMap.get(row.assetId) || ''
    tagMap.set(row.assetId, existing ? `${existing}、${row.tagName}` : row.tagName)
  }

  let html = '<html><head><meta charset="utf-8"><style>'
  html += 'body{font-family:sans-serif;color:#333;padding:20px}'
  html += 'h2{margin-top:30px;color:#555}'
  html += 'table{border-collapse:collapse;width:100%;margin-bottom:20px;font-size:13px}'
  html += 'th,td{border:1px solid #ddd;padding:6px 10px;text-align:left;white-space:nowrap}'
  html += 'th{background:#f5f5f5;font-weight:600}'
  html += '.num{text-align:right}'
  html += '</style></head><body>'
  html += `<h1>Holdly 数据备份 - ${new Date().toISOString().slice(0, 10)}</h1>`

  // ===== 资产列表 =====
  html += '<h2>资产列表</h2><table><thead><tr>'
  const assetHeaders = ['名称', '类型', '分类', '标签', '购入价', '当前估价', '购入日期', '订阅价', '周期', '下次续费日', '支付类型', '支付账户', '备注', '状态', '卖出日期', '卖出价格']
  for (const h of assetHeaders)
    html += `<th>${esc(h)}</th>`
  html += '</tr></thead><tbody>'

  for (const a of assetRows) {
    html += '<tr>'
    html += `<td>${esc(a.emoji)} ${esc(a.name)}</td>`
    html += `<td>${a.assetType === 'subscription' ? '订阅' : '买断'}</td>`
    html += `<td>${esc(a.categoryName ? `${a.categoryEmoji || ''} ${a.categoryName}`.trim() : '未分类')}</td>`
    html += `<td>${esc(tagMap.get(a.id) || '')}</td>`
    html += `<td class="num">${a.purchasePrice ? esc(a.purchasePrice) : ''}</td>`
    html += `<td class="num">${a.currentValue ? esc(a.currentValue) : ''}</td>`
    html += `<td>${esc(a.purchaseDate || '')}</td>`
    html += `<td class="num">${a.subscriptionPrice ? esc(a.subscriptionPrice) : ''}</td>`
    html += `<td>${a.billingCycle ? ({ monthly: '月付', quarterly: '季付', yearly: '年付' })[a.billingCycle] : ''}</td>`
    html += `<td>${esc(a.nextRenewalDate || '')}</td>`
    html += `<td>${esc(a.paymentTypeName || '')}</td>`
    html += `<td>${esc(a.paymentAccountName || '')}</td>`
    html += `<td>${esc(a.notes || '')}</td>`
    html += `<td>${a.subscriptionStatus === 'cancelled' ? '已取消' : a.subscriptionStoppedAt ? '已停止' : a.tradedInAt ? '已卖出' : '持有中'}</td>`
    html += `<td>${esc(a.tradedInAt || '')}</td>`
    html += `<td class="num">${a.tradeInPrice ? esc(a.tradeInPrice) : ''}</td>`
    html += '</tr>'
  }
  html += '</tbody></table>'

  // ===== 各计划 =====
  for (const plan of plans) {
    const planMemberRows = await db
      .select({
        userId: planMembers.userId,
        displayName: profiles.displayName,
      })
      .from(planMembers)
      .innerJoin(profiles, eq(planMembers.userId, profiles.id))
      .where(and(eq(planMembers.planId, plan.id), isNull(planMembers.deletedAt)))

    const memberNameMap = new Map(planMemberRows.map(m => [m.userId, m.displayName || m.userId.slice(0, 8)]))

    const recordRows = await db
      .select()
      .from(planRecords)
      .where(and(eq(planRecords.planId, plan.id), isNull(planRecords.deletedAt)))
      .orderBy(planRecords.year, planRecords.month)

    if (recordRows.length === 0)
      continue

    const recordIds = recordRows.map(r => r.id)
    const itemRows = await db
      .select()
      .from(planRecordItems)
      .where(and(inArray(planRecordItems.recordId, recordIds), isNull(planRecordItems.deletedAt)))

    const itemByRecord = new Map<string, typeof itemRows>()
    for (const item of itemRows) {
      const list = itemByRecord.get(item.recordId) || []
      list.push(item)
      itemByRecord.set(item.recordId, list)
    }

    const itemColumns = new Map<string, string>()
    const seenSet = new Set<string>()
    for (const items of itemByRecord.values()) {
      for (const item of items) {
        const key = `${item.memberId}:${item.name}`
        if (!seenSet.has(key)) {
          seenSet.add(key)
          const name = memberNameMap.get(item.memberId) || item.memberId
          itemColumns.set(key, `${name}:${item.name}`)
        }
      }
    }
    const itemColumnKeys = [...itemColumns.keys()]

    html += `<h2>计划-${esc(plan.name)}</h2><table><thead><tr>`
    html += '<th>年月</th>'
    for (const colKey of itemColumnKeys)
      html += `<th>${esc(itemColumns.get(colKey)!)}</th>`
    html += '<th>月收入合计</th><th>月支出合计</th><th>月净收入</th><th>总额</th>'
    html += '</tr></thead><tbody>'

    let previousTotal = Number(plan.startingValue ?? 0)
    for (const rec of recordRows) {
      const items = itemByRecord.get(rec.id) || []
      const monthIncome = items.filter(i => i.itemType === 'income').reduce((s, i) => s + Number(i.amount), 0)
      const monthExpense = items.filter(i => i.itemType === 'expense').reduce((s, i) => s + Number(i.amount), 0)
      const monthNet = monthIncome - monthExpense
      let netIncome = monthNet
      let totalValue = previousTotal + monthNet
      if (plan.planMode === 'snapshot') {
        totalValue = monthNet
        netIncome = totalValue - previousTotal
      }
      previousTotal = totalValue

      html += '<tr>'
      html += `<td>${esc(rec.year)}-${String(rec.month).padStart(2, '0')}</td>`
      for (const colKey of itemColumnKeys) {
        const [memberId, itemName] = colKey.split(':')
        const amt = items
          .filter(i => i.memberId === memberId && i.name === itemName)
          .reduce((s, i) => s + Number(i.amount), 0)
        html += `<td class="num">${amt !== 0 ? esc(amt) : ''}</td>`
      }
      html += `<td class="num">${monthIncome || ''}</td>`
      html += `<td class="num">${monthExpense || ''}</td>`
      html += `<td class="num">${esc(netIncome)}</td>`
      html += `<td class="num">${totalValue === 0 && rec.year === 0 && rec.month === 0 ? '' : esc(totalValue)}</td>`
      html += '</tr>'
    }
    html += '</tbody></table>'
  }

  html += '<p style="margin-top:40px;color:#999;font-size:12px">由 Holdly 自动生成</p>'
  html += '</body></html>'

  return html
}

export async function processUserBackup(userId: string): Promise<number> {
  const profile = await db
    .select({ email: profiles.email })
    .from(profiles)
    .where(eq(profiles.id, userId))
    .limit(1)
    .then(r => r[0])

  if (!profile?.email)
    return 0

  const todayStr = format(new Date(), 'yyyy-MM-dd')

  try {
    const html = await generateBackupHtml(userId)

    await sendEmail({
      to: profile.email,
      subject: `Holdly 数据备份 - ${todayStr}`,
      text: `请查看附件中的 HTML 内容以获取备份详情。`,
    })

    // sendEmail only supports text, so send via Resend API directly for HTML
    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey)
      return 0

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM || 'Holdly <notifications@holdly.app>',
        to: profile.email,
        subject: `Holdly 数据备份 - ${todayStr}`,
        html,
      }),
    })

    return res.ok ? 1 : 0
  }
  catch {
    return 0
  }
}
