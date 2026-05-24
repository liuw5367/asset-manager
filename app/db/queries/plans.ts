import { randomBytes } from 'node:crypto'
import currency from 'currency.js'
import { and, asc, desc, eq, inArray, isNull, sql } from 'drizzle-orm'
import { db } from '~/db'
import {
  planDefaultItems,
  planInviteLinks,
  planMembers,
  planRecordItems,
  planRecordMemberNotes,
  planRecords,
  plans,
  profiles,
} from '~/db/schema'

export type PlanPermission = 'own' | 'all'
export type PlanMemberRole = 'owner' | 'editor'
export type PlanItemType = 'income' | 'expense'
export type PlanMode = 'accumulate' | 'snapshot'

export interface PlanMemberView {
  userId: string
  role: PlanMemberRole
  note: string
  displayName: string
  avatarEmoji: string
}

export interface PlanDefaultItemView {
  id: string
  name: string
  itemType: PlanItemType
  sortOrder: number
}

export interface PlanRecordItemView {
  id: string
  memberId: string
  itemType: PlanItemType
  name: string
  amount: number
  updatedAt: Date | null
}

export interface PlanRecordMemberNoteView {
  id: string
  memberId: string
  note: string
  updatedAt: Date | null
  memberName?: string
  memberEmoji?: string
}

export interface PlanRecordView {
  id: string
  year: number
  month: number
  createdAt: Date | null
  updatedAt: Date | null
  recordedTotalValue: number | null
  totalIncome: number
  totalExpense: number
  netIncome: number
  totalValue: number
  items: PlanRecordItemView[]
  memberNotes: PlanRecordMemberNoteView[]
}

export interface PlanSummaryView {
  id: string
  name: string
  emoji: string
  permission: PlanPermission
  members: PlanMemberView[]
  latestNetIncome: number
  latestMonth: string
}

export interface PlanDetailView {
  id: string
  ownerId: string
  name: string
  emoji: string
  planMode: PlanMode
  permission: PlanPermission
  startingValue: number
  members: PlanMemberView[]
  defaultItems: PlanDefaultItemView[]
  records: PlanRecordView[]
  trend: Array<{ month: string, label: string, amount: number }>
  canManage: boolean
  canEditAllItems: boolean
}

export interface SavePlanInput {
  planId?: string
  userId: string
  name: string
  emoji: string
  planMode: PlanMode
  permission: PlanPermission
  startingValue: string
  members: Array<{ userId: string, role: PlanMemberRole, note?: string }>
  defaultItems: Array<{ id?: string, name: string, itemType: PlanItemType, sortOrder: number }>
}

interface PlanRecordPatchInputBase {
  planId: string
  userId: string
  year: number
  month: number
  expectedRecordUpdatedAt?: string
}

interface PlanRecordPatchAccumulateInput extends PlanRecordPatchInputBase {
  mode: 'accumulate'
  addedItems: Array<{ memberId: string, itemType: PlanItemType, name: string, amount: string }>
  updatedItems: Array<{ id: string, memberId: string, name: string, amount: string, expectedUpdatedAt?: string }>
  deletedItems: Array<{ id: string, expectedUpdatedAt?: string }>
}

interface PlanRecordPatchSnapshotInput extends PlanRecordPatchInputBase {
  mode: 'snapshot'
  recordedTotalValue: string
  memberNotes: Array<{ memberId: string, note: string, expectedUpdatedAt?: string }>
}

export type PlanRecordPatchInput = PlanRecordPatchAccumulateInput | PlanRecordPatchSnapshotInput

export interface SavePlanRecordResult {
  recordId: string
  monthKey: string
}

export interface AcceptInviteResult {
  planId: string
  joined: boolean
}

function toAmount(value: string | number | null | undefined) {
  return currency(value ?? 0).value
}

function normalizeName(name: string) {
  return name.trim()
}

function formatMonthLabel(year: number, month: number) {
  return `${year}年${month}月`
}

function formatMonthKey(year: number, month: number) {
  return `${year}-${String(month).padStart(2, '0')}`
}

function buildMemberDisplayName(displayName: string | null, email: string | null) {
  return displayName?.trim() || email?.trim() || '成员'
}

async function getActivePlanForUser(planId: string, userId: string) {
  const planRows = await db
    .select()
    .from(plans)
    .where(and(eq(plans.id, planId), isNull(plans.deletedAt)))
    .limit(1)

  const plan = planRows[0]
  if (!plan)
    return null

  const memberRows = await db
    .select({ role: planMembers.role })
    .from(planMembers)
    .where(and(
      eq(planMembers.planId, planId),
      eq(planMembers.userId, userId),
      isNull(planMembers.deletedAt),
    ))
    .limit(1)

  if (!memberRows[0])
    return null

  const isOwner = plan.ownerId === userId
  return {
    plan,
    isOwner,
    canManage: isOwner,
    canEditAllItems: isOwner || plan.permission === 'all',
  }
}

async function getMembersByPlanIds(planIds: string[]) {
  if (!planIds.length)
    return new Map<string, PlanMemberView[]>()

  const rows = await db
    .select({
      planId: planMembers.planId,
      userId: planMembers.userId,
      role: planMembers.role,
      note: planMembers.note,
      displayName: profiles.displayName,
      email: profiles.email,
      avatarEmoji: profiles.avatarEmoji,
    })
    .from(planMembers)
    .leftJoin(profiles, eq(planMembers.userId, profiles.id))
    .where(and(inArray(planMembers.planId, planIds), isNull(planMembers.deletedAt)))
    .orderBy(asc(planMembers.createdAt))

  const map = new Map<string, PlanMemberView[]>()
  for (const row of rows) {
    const list = map.get(row.planId) || []
    list.push({
      userId: row.userId,
      role: row.role,
      note: row.note || '',
      displayName: buildMemberDisplayName(row.displayName, row.email),
      avatarEmoji: row.avatarEmoji || '😊',
    })
    map.set(row.planId, list)
  }

  return map
}

async function getRecordRowsByPlanIds(planIds: string[]) {
  if (!planIds.length)
    return [] as Array<typeof planRecords.$inferSelect>

  return db
    .select()
    .from(planRecords)
    .where(and(inArray(planRecords.planId, planIds), isNull(planRecords.deletedAt)))
    .orderBy(desc(planRecords.year), desc(planRecords.month), desc(planRecords.updatedAt))
}

async function getRecordItemsByRecordIds(recordIds: string[]) {
  if (!recordIds.length)
    return [] as Array<typeof planRecordItems.$inferSelect>

  return db
    .select()
    .from(planRecordItems)
    .where(and(inArray(planRecordItems.recordId, recordIds), isNull(planRecordItems.deletedAt)))
}

async function getRecordMemberNotesByRecordIds(recordIds: string[]) {
  if (!recordIds.length)
    return [] as Array<typeof planRecordMemberNotes.$inferSelect>

  return db
    .select()
    .from(planRecordMemberNotes)
    .where(and(inArray(planRecordMemberNotes.recordId, recordIds), isNull(planRecordMemberNotes.deletedAt)))
}

function buildRecordViews(
  recordRows: Array<typeof planRecords.$inferSelect>,
  itemRows: Array<typeof planRecordItems.$inferSelect>,
  noteRows: Array<typeof planRecordMemberNotes.$inferSelect>,
  planMode: PlanMode,
  startingValue: number,
) {
  const itemMap = new Map<string, PlanRecordItemView[]>()
  const noteMap = new Map<string, PlanRecordMemberNoteView[]>()

  for (const item of itemRows) {
    const list = itemMap.get(item.recordId) || []
    list.push({
      id: item.id,
      memberId: item.memberId,
      itemType: item.itemType,
      name: item.name,
      amount: toAmount(item.amount),
      updatedAt: item.updatedAt,
    })
    itemMap.set(item.recordId, list)
  }

  for (const note of noteRows) {
    const list = noteMap.get(note.recordId) || []
    list.push({
      id: note.id,
      memberId: note.memberId,
      note: note.note,
      updatedAt: note.updatedAt,
    })
    noteMap.set(note.recordId, list)
  }

  const ascendingRecords = [...recordRows].sort((a, b) => {
    if (a.year !== b.year)
      return a.year - b.year
    if (a.month !== b.month)
      return a.month - b.month
    return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime()
  })

  let previousTotal = startingValue
  const ascendingViews = ascendingRecords.map((record, index) => {
    const items = itemMap.get(record.id) || []
    const memberNotes = noteMap.get(record.id) || []
    let totalIncome = 0
    let totalExpense = 0
    let netIncome = 0
    let totalValue = startingValue
    let recordedTotalValue: number | null = null

    if (planMode === 'snapshot') {
      recordedTotalValue = record.recordedTotalValue === null ? null : toAmount(record.recordedTotalValue)
      const currentTotal = recordedTotalValue ?? previousTotal
      netIncome = index === 0
        ? currency(currentTotal).subtract(startingValue).value
        : currency(currentTotal).subtract(previousTotal).value
      totalIncome = netIncome
      totalExpense = 0
      totalValue = currentTotal
    }
    else {
      totalIncome = items
        .filter(item => item.itemType === 'income')
        .reduce((sum, item) => currency(sum).add(item.amount).value, 0)
      totalExpense = items
        .filter(item => item.itemType === 'expense')
        .reduce((sum, item) => currency(sum).add(item.amount).value, 0)
      netIncome = currency(totalIncome).subtract(totalExpense).value
      totalValue = currency(previousTotal).add(netIncome).value
    }

    previousTotal = totalValue

    return {
      id: record.id,
      year: record.year,
      month: record.month,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      recordedTotalValue,
      totalIncome,
      totalExpense,
      netIncome,
      totalValue,
      items,
      memberNotes,
    } satisfies PlanRecordView
  })

  return ascendingViews.sort((a, b) => {
    if (a.year !== b.year)
      return b.year - a.year
    if (a.month !== b.month)
      return b.month - a.month
    return new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime()
  })
}

function buildTrend(records: PlanRecordView[], startingValue: number) {
  const now = new Date()
  const monthMap = new Map<string, number>()
  for (const record of records) {
    monthMap.set(formatMonthKey(record.year, record.month), record.totalValue)
  }

  const trend: Array<{ month: string, label: string, amount: number }> = []
  let lastAmount = startingValue
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const year = d.getFullYear()
    const month = d.getMonth() + 1
    const key = formatMonthKey(year, month)
    const amount = monthMap.get(key) ?? lastAmount
    lastAmount = amount
    trend.push({ month: key, label: `${month}月`, amount })
  }

  return trend
}

export async function getPlanSummariesByUserId(userId: string) {
  const joinedRows = await db
    .select({
      id: plans.id,
      name: plans.name,
      emoji: plans.emoji,
      planMode: plans.mode,
      permission: plans.permission,
      startingValue: plans.startingValue,
      createdAt: plans.createdAt,
    })
    .from(planMembers)
    .innerJoin(plans, eq(planMembers.planId, plans.id))
    .where(and(
      eq(planMembers.userId, userId),
      isNull(planMembers.deletedAt),
      isNull(plans.deletedAt),
    ))
    .orderBy(desc(plans.createdAt))

  const planIds = joinedRows.map(row => row.id)
  const membersMap = await getMembersByPlanIds(planIds)
  const recordRows = await getRecordRowsByPlanIds(planIds)
  const recordIds = recordRows.map(row => row.id)
  const itemRows = await getRecordItemsByRecordIds(recordIds)
  const noteRows = await getRecordMemberNotesByRecordIds(recordIds)

  const recordIdsByPlan = new Map<string, Set<string>>()
  for (const record of recordRows) {
    const set = recordIdsByPlan.get(record.planId) || new Set<string>()
    set.add(record.id)
    recordIdsByPlan.set(record.planId, set)
  }

  const recordsByPlan = new Map<string, PlanRecordView[]>()
  for (const row of joinedRows) {
    const rows = recordRows.filter(record => record.planId === row.id)
    const ids = recordIdsByPlan.get(row.id) || new Set<string>()
    recordsByPlan.set(
      row.id,
      buildRecordViews(
        rows,
        itemRows.filter(item => ids.has(item.recordId)),
        noteRows.filter(note => ids.has(note.recordId)),
        row.planMode,
        toAmount(row.startingValue),
      ),
    )
  }

  return joinedRows.map((row) => {
    const records = recordsByPlan.get(row.id) || []
    const latest = records[0]

    return {
      id: row.id,
      name: row.name,
      emoji: row.emoji,
      permission: row.permission,
      members: membersMap.get(row.id) || [],
      latestNetIncome: latest?.netIncome ?? 0,
      latestMonth: latest ? formatMonthLabel(latest.year, latest.month) : '暂无记录',
    } satisfies PlanSummaryView
  })
}

export async function getPlanDetailById(planId: string, userId: string) {
  const access = await getActivePlanForUser(planId, userId)
  if (!access)
    return null

  const plan = access.plan
  const membersMap = await getMembersByPlanIds([planId])

  const defaultItemRows = await db
    .select()
    .from(planDefaultItems)
    .where(and(eq(planDefaultItems.planId, planId), isNull(planDefaultItems.deletedAt)))
    .orderBy(asc(planDefaultItems.sortOrder), asc(planDefaultItems.createdAt))

  const recordRows = await db
    .select()
    .from(planRecords)
    .where(and(eq(planRecords.planId, planId), isNull(planRecords.deletedAt)))
    .orderBy(desc(planRecords.year), desc(planRecords.month), desc(planRecords.updatedAt))

  const itemRows = await getRecordItemsByRecordIds(recordRows.map(r => r.id))
  const noteRows = await getRecordMemberNotesByRecordIds(recordRows.map(r => r.id))
  const records = buildRecordViews(recordRows, itemRows, noteRows, plan.mode, toAmount(plan.startingValue))

  const sortedForTrend = [...records].sort((a, b) => a.year * 100 + a.month - (b.year * 100 + b.month),
  )

  return {
    id: plan.id,
    ownerId: plan.ownerId,
    name: plan.name,
    emoji: plan.emoji,
    planMode: plan.mode,
    permission: plan.permission,
    startingValue: toAmount(plan.startingValue),
    members: membersMap.get(plan.id) || [],
    defaultItems: defaultItemRows.map(item => ({
      id: item.id,
      name: item.name,
      itemType: item.itemType,
      sortOrder: item.sortOrder,
    })),
    records,
    trend: buildTrend(sortedForTrend, toAmount(plan.startingValue)),
    canManage: access.canManage,
    canEditAllItems: access.canEditAllItems,
  } satisfies PlanDetailView
}

export async function getPlanRecordDetail(planId: string, userId: string, year: number, month: number) {
  const access = await getActivePlanForUser(planId, userId)
  if (!access)
    return null

  const allRecords = await db
    .select()
    .from(planRecords)
    .where(and(eq(planRecords.planId, planId), isNull(planRecords.deletedAt)))
    .orderBy(desc(planRecords.year), desc(planRecords.month), desc(planRecords.updatedAt))

  const record = allRecords.find(r => r.year === year && r.month === month)
  if (!record)
    return null

  const recordIds = allRecords.map(r => r.id)
  const [items, noteRows] = await Promise.all([
    getRecordItemsByRecordIds(recordIds),
    getRecordMemberNotesByRecordIds(recordIds),
  ])

  const recordViews = buildRecordViews(
    allRecords,
    items,
    noteRows,
    access.plan.mode,
    toAmount(access.plan.startingValue),
  )
  const recordView = recordViews.find(r => r.id === record.id)
  if (!recordView)
    return null

  const membersMap = await getMembersByPlanIds([planId])
  const memberMap = new Map((membersMap.get(planId) || []).map(member => [member.userId, member]))

  return {
    planId,
    planName: access.plan.name,
    permission: access.plan.permission,
    canManage: access.canManage,
    canEditAllItems: access.canEditAllItems,
    planMode: access.plan.mode,
    record: {
      ...recordView,
      items: recordView.items.map(item => ({
        ...item,
        memberName: memberMap.get(item.memberId)?.displayName || '成员',
        memberEmoji: memberMap.get(item.memberId)?.avatarEmoji || '😊',
      })),
      memberNotes: recordView.memberNotes.map(note => ({
        ...note,
        memberName: memberMap.get(note.memberId)?.displayName || '成员',
        memberEmoji: memberMap.get(note.memberId)?.avatarEmoji || '😊',
      })),
    },
    members: membersMap.get(planId) || [],
    startingValue: toAmount(access.plan.startingValue),
  }
}

export async function savePlan(input: SavePlanInput) {
  const normalizedName = normalizeName(input.name)
  if (!normalizedName)
    throw new Error('计划名称不能为空')

  const uniqueMembers = new Map<string, { userId: string, role: PlanMemberRole, note?: string }>()
  for (const member of input.members) {
    uniqueMembers.set(member.userId, member)
  }
  if (!uniqueMembers.has(input.userId)) {
    uniqueMembers.set(input.userId, { userId: input.userId, role: 'owner', note: '' })
  }

  const members = [...uniqueMembers.values()]

  return db.transaction(async (tx) => {
    let planId = input.planId

    if (planId) {
      const access = await getActivePlanForUser(planId, input.userId)
      if (!access?.canManage)
        throw new Error('无权限编辑该计划')

      await tx
        .update(plans)
        .set({
          name: normalizedName,
          emoji: input.emoji || '💰',
          mode: input.planMode,
          permission: input.permission,
          startingValue: input.startingValue,
          updatedAt: new Date(),
        })
        .where(and(eq(plans.id, planId), isNull(plans.deletedAt)))
    }
    else {
      const inserted = await tx
        .insert(plans)
        .values({
          ownerId: input.userId,
          name: normalizedName,
          emoji: input.emoji || '💰',
          mode: input.planMode,
          permission: input.permission,
          startingValue: input.startingValue,
        })
        .returning({ id: plans.id })

      planId = inserted[0].id
    }

    await tx
      .update(planMembers)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(planMembers.planId, planId), isNull(planMembers.deletedAt)))

    for (const member of members) {
      await tx
        .insert(planMembers)
        .values({
          planId,
          userId: member.userId,
          role: member.userId === input.userId ? 'owner' : member.role,
          note: member.note?.trim() || null,
        })
    }

    await tx
      .update(planDefaultItems)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(planDefaultItems.planId, planId), isNull(planDefaultItems.deletedAt)))

    if (input.defaultItems.length) {
      await tx
        .insert(planDefaultItems)
        .values(input.defaultItems
          .filter(item => item.name.trim())
          .map(item => ({
            planId,
            itemType: item.itemType,
            name: item.name.trim(),
            sortOrder: item.sortOrder,
          })))
    }

    return planId
  })
}

export function createInviteToken() {
  return randomBytes(18).toString('hex')
}

export async function getActiveInviteLink(planId: string, userId: string) {
  const access = await getActivePlanForUser(planId, userId)
  if (!access?.canManage)
    return null

  const rows = await db
    .select()
    .from(planInviteLinks)
    .where(and(
      eq(planInviteLinks.planId, planId),
      isNull(planInviteLinks.revokedAt),
      sql`${planInviteLinks.expiresAt} > now()`,
    ))
    .orderBy(desc(planInviteLinks.createdAt))
    .limit(1)

  return rows[0] || null
}

export async function regenerateInviteLink(planId: string, userId: string, expiresAt: Date) {
  const access = await getActivePlanForUser(planId, userId)
  if (!access?.canManage)
    throw new Error('无权限管理邀请链接')

  const token = createInviteToken()

  await db.transaction(async (tx) => {
    await tx
      .update(planInviteLinks)
      .set({ revokedAt: new Date(), updatedAt: new Date() })
      .where(and(
        eq(planInviteLinks.planId, planId),
        isNull(planInviteLinks.revokedAt),
      ))

    await tx
      .insert(planInviteLinks)
      .values({
        planId,
        token,
        createdByUserId: userId,
        expiresAt,
      })
  })

  return { token, expiresAt }
}

export async function revokeInviteLink(planId: string, userId: string) {
  const access = await getActivePlanForUser(planId, userId)
  if (!access?.canManage)
    throw new Error('无权限管理邀请链接')

  await db
    .update(planInviteLinks)
    .set({ revokedAt: new Date(), updatedAt: new Date() })
    .where(and(
      eq(planInviteLinks.planId, planId),
      isNull(planInviteLinks.revokedAt),
    ))
}

export async function acceptInviteByToken(token: string, userId: string): Promise<AcceptInviteResult | null> {
  const rows = await db
    .select({
      planId: planInviteLinks.planId,
      inviteId: planInviteLinks.id,
      revokedAt: planInviteLinks.revokedAt,
      expiresAt: planInviteLinks.expiresAt,
      planDeletedAt: plans.deletedAt,
    })
    .from(planInviteLinks)
    .innerJoin(plans, eq(planInviteLinks.planId, plans.id))
    .where(eq(planInviteLinks.token, token))
    .limit(1)

  const invite = rows[0]
  if (!invite)
    return null

  if (invite.revokedAt || invite.planDeletedAt || invite.expiresAt < new Date())
    return null

  const existingMember = await db
    .select()
    .from(planMembers)
    .where(and(
      eq(planMembers.planId, invite.planId),
      eq(planMembers.userId, userId),
    ))
    .orderBy(desc(planMembers.createdAt))
    .limit(1)

  if (existingMember[0] && !existingMember[0].deletedAt) {
    return { planId: invite.planId, joined: false }
  }

  if (existingMember[0] && existingMember[0].deletedAt) {
    await db
      .update(planMembers)
      .set({ deletedAt: null, role: 'editor', updatedAt: new Date() })
      .where(eq(planMembers.id, existingMember[0].id))
  }
  else {
    await db
      .insert(planMembers)
      .values({
        planId: invite.planId,
        userId,
        role: 'editor',
      })
  }

  return { planId: invite.planId, joined: true }
}

function assertMemberEditable(canEditAllItems: boolean, itemMemberId: string, userId: string) {
  if (canEditAllItems)
    return

  if (itemMemberId !== userId)
    throw new Error('权限不足：不能编辑其他成员记录')
}

export async function savePlanRecordPatch(input: PlanRecordPatchInput): Promise<SavePlanRecordResult> {
  const access = await getActivePlanForUser(input.planId, input.userId)
  if (!access)
    throw new Error('计划不存在或无访问权限')
  if (access.plan.mode !== input.mode)
    throw new Error('计划模式已变更，请刷新后重试')

  const now = new Date()

  return db.transaction(async (tx) => {
    let record = await tx
      .select()
      .from(planRecords)
      .where(and(
        eq(planRecords.planId, input.planId),
        eq(planRecords.year, input.year),
        eq(planRecords.month, input.month),
      ))
      .limit(1)
      .then(rows => rows[0])

    if (!record) {
      const inserted = await tx
        .insert(planRecords)
        .values({
          planId: input.planId,
          year: input.year,
          month: input.month,
          deletedAt: null,
          updatedAt: now,
        })
        .returning()
      record = inserted[0]
    }
    else if (record.deletedAt) {
      const revived = await tx
        .update(planRecords)
        .set({ deletedAt: null, updatedAt: now })
        .where(eq(planRecords.id, record.id))
        .returning()
      record = revived[0]
    }

    if (input.expectedRecordUpdatedAt && record.updatedAt) {
      const expected = new Date(input.expectedRecordUpdatedAt).getTime()
      const actual = new Date(record.updatedAt).getTime()
      if (expected !== actual) {
        throw new Error('记录已被其他成员更新，请刷新后重试')
      }
    }

    if (input.mode === 'snapshot') {
      const snapshotTotalValue = toAmount(input.recordedTotalValue)
      await tx
        .update(planRecords)
        .set({
          recordedTotalValue: snapshotTotalValue.toFixed(2),
          updatedAt: now,
        })
        .where(eq(planRecords.id, record.id))

      const existingNotesAll = await tx
        .select()
        .from(planRecordMemberNotes)
        .where(eq(planRecordMemberNotes.recordId, record.id))

      const existingNotesMap = new Map(existingNotesAll.map(note => [note.memberId, note]))

      for (const noteInput of input.memberNotes) {
        assertMemberEditable(access.canEditAllItems, noteInput.memberId, input.userId)

        const normalizedNote = noteInput.note.trim()
        const existing = existingNotesMap.get(noteInput.memberId)

        if (existing) {
          if (noteInput.expectedUpdatedAt && existing.updatedAt) {
            const expected = new Date(noteInput.expectedUpdatedAt).getTime()
            const actual = new Date(existing.updatedAt).getTime()
            if (expected !== actual)
              throw new Error('成员备注已变更，请刷新后重试')
          }

          await tx
            .update(planRecordMemberNotes)
            .set({
              note: normalizedNote,
              deletedAt: normalizedNote ? null : now,
              updatedAt: now,
            })
            .where(eq(planRecordMemberNotes.id, existing.id))
          continue
        }

        if (!normalizedNote)
          continue

        await tx
          .insert(planRecordMemberNotes)
          .values({
            recordId: record.id,
            memberId: noteInput.memberId,
            note: normalizedNote,
          })
      }

      await tx
        .update(planRecordItems)
        .set({ deletedAt: now, updatedAt: now })
        .where(and(eq(planRecordItems.recordId, record.id), isNull(planRecordItems.deletedAt)))

      return {
        recordId: record.id,
        monthKey: formatMonthKey(input.year, input.month),
      }
    }

    const existingItems = await tx
      .select()
      .from(planRecordItems)
      .where(and(eq(planRecordItems.recordId, record.id), isNull(planRecordItems.deletedAt)))

    const existingMap = new Map(existingItems.map(item => [item.id, item]))

    for (const item of input.deletedItems) {
      const existing = existingMap.get(item.id)
      if (!existing)
        continue

      assertMemberEditable(access.canEditAllItems, existing.memberId, input.userId)

      if (item.expectedUpdatedAt && existing.updatedAt) {
        const expected = new Date(item.expectedUpdatedAt).getTime()
        const actual = new Date(existing.updatedAt).getTime()
        if (expected !== actual)
          throw new Error('记录条目已变更，请刷新后重试')
      }

      await tx
        .update(planRecordItems)
        .set({ deletedAt: now, updatedAt: now })
        .where(eq(planRecordItems.id, item.id))
    }

    for (const item of input.updatedItems) {
      const existing = existingMap.get(item.id)
      if (!existing)
        continue

      assertMemberEditable(access.canEditAllItems, existing.memberId, input.userId)

      if (item.expectedUpdatedAt && existing.updatedAt) {
        const expected = new Date(item.expectedUpdatedAt).getTime()
        const actual = new Date(existing.updatedAt).getTime()
        if (expected !== actual)
          throw new Error('记录条目已变更，请刷新后重试')
      }

      assertMemberEditable(access.canEditAllItems, item.memberId, input.userId)

      await tx
        .update(planRecordItems)
        .set({
          memberId: item.memberId,
          name: item.name.trim(),
          amount: item.amount,
          updatedAt: now,
        })
        .where(eq(planRecordItems.id, item.id))
    }

    for (const item of input.addedItems) {
      assertMemberEditable(access.canEditAllItems, item.memberId, input.userId)

      if (!item.name.trim())
        continue

      await tx
        .insert(planRecordItems)
        .values({
          recordId: record.id,
          memberId: item.memberId,
          itemType: item.itemType,
          name: item.name.trim(),
          amount: item.amount,
        })
    }

    await tx
      .update(planRecords)
      .set({ recordedTotalValue: null, updatedAt: now })
      .where(eq(planRecords.id, record.id))

    return {
      recordId: record.id,
      monthKey: formatMonthKey(input.year, input.month),
    }
  })
}

export async function softDeletePlan(planId: string, userId: string) {
  const access = await getActivePlanForUser(planId, userId)
  if (!access?.canManage)
    throw new Error('无权限删除计划')

  await db
    .update(plans)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(eq(plans.id, planId))
}

export async function softDeletePlanRecord(planId: string, userId: string, year: number, month: number) {
  const access = await getActivePlanForUser(planId, userId)
  if (!access?.canManage)
    throw new Error('无权限删除记录')

  const rows = await db
    .select({ id: planRecords.id })
    .from(planRecords)
    .where(and(
      eq(planRecords.planId, planId),
      eq(planRecords.year, year),
      eq(planRecords.month, month),
      isNull(planRecords.deletedAt),
    ))
    .limit(1)

  if (!rows[0])
    return

  await db
    .update(planRecords)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(eq(planRecords.id, rows[0].id))
}
