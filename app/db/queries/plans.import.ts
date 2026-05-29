import type { ImportPlanSnapshotHistoryInput, ImportPlanSnapshotHistoryResult } from './plans.types'
import currency from 'currency.js'
import { and, eq, isNull } from 'drizzle-orm'
import { db } from '~/db'
import { planMembers, planRecordItems, planRecordMemberNotes, planRecords, profiles } from '~/db/schema'
import { getActivePlanForUser } from './plans.read'
import { formatMonthKey } from './plans.types'

export async function importPlanSnapshotHistory(
  input: ImportPlanSnapshotHistoryInput,
): Promise<ImportPlanSnapshotHistoryResult> {
  const access = await getActivePlanForUser(input.planId, input.userId)
  if (!access)
    throw new Error('计划不存在或无访问权限')
  if (!access.canManage)
    throw new Error('无权限导入历史数据')
  if (access.plan.mode !== 'snapshot')
    throw new Error('仅支持总额记录模式（snapshot）导入')
  if (input.rows.length === 0)
    return { insertedMonths: 0, skippedDuplicateMonths: 0, skippedExistingMonths: 0 }

  const memberRows = await db
    .select({
      userId: planMembers.userId,
      email: profiles.email,
    })
    .from(planMembers)
    .innerJoin(profiles, eq(planMembers.userId, profiles.id))
    .where(and(
      eq(planMembers.planId, input.planId),
      isNull(planMembers.deletedAt),
    ))

  const emailToMemberId = new Map<string, string>()
  for (const row of memberRows) {
    const email = row.email?.trim().toLowerCase()
    if (!email)
      continue
    emailToMemberId.set(email, row.userId)
  }

  const requiredEmails = new Set<string>()
  for (const row of input.rows) {
    for (const value of row.values)
      requiredEmails.add(value.memberEmail.trim().toLowerCase())
  }
  const missingEmails = [...requiredEmails].filter(email => !emailToMemberId.has(email))
  if (missingEmails.length) {
    throw new Error(`以下邮箱不是该计划成员：${missingEmails.join('、')}`)
  }

  const existingRecords = await db
    .select({
      year: planRecords.year,
      month: planRecords.month,
    })
    .from(planRecords)
    .where(eq(planRecords.planId, input.planId))

  const existingMonthKeys = new Set(existingRecords.map(record => formatMonthKey(record.year, record.month)))
  const seenInputMonthKeys = new Set<string>()
  let insertedMonths = 0
  let skippedDuplicateMonths = 0
  let skippedExistingMonths = 0
  const now = new Date()

  await db.transaction(async (tx) => {
    for (const row of input.rows) {
      const monthKey = formatMonthKey(row.year, row.month)
      if (seenInputMonthKeys.has(monthKey)) {
        skippedDuplicateMonths += 1
        continue
      }
      seenInputMonthKeys.add(monthKey)

      if (existingMonthKeys.has(monthKey)) {
        skippedExistingMonths += 1
        continue
      }

      const insertedRecord = await tx
        .insert(planRecords)
        .values({
          planId: input.planId,
          year: row.year,
          month: row.month,
          deletedAt: null,
          updatedAt: now,
        })
        .returning({ id: planRecords.id })

      const recordId = insertedRecord[0]?.id
      if (!recordId)
        continue

      const itemValues = row.values
        .map(value => ({
          recordId,
          memberId: emailToMemberId.get(value.memberEmail.trim().toLowerCase())!,
          itemType: 'income' as const,
          name: value.itemName.trim(),
          amount: currency(value.amount).value.toFixed(2),
          deletedAt: null,
          updatedAt: now,
        }))
        .filter(item => item.name && Number(item.amount) >= 0)

      if (itemValues.length > 0) {
        await tx
          .insert(planRecordItems)
          .values(itemValues)
      }

      const note = row.note?.trim()
      if (note) {
        await tx
          .insert(planRecordMemberNotes)
          .values({
            recordId,
            memberId: input.userId,
            note,
            deletedAt: null,
            updatedAt: now,
          })
      }

      insertedMonths += 1
    }
  })

  return {
    insertedMonths,
    skippedDuplicateMonths,
    skippedExistingMonths,
  }
}
