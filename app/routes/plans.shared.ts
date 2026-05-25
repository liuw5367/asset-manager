import type { PlanDefaultItemView, PlanMemberView } from '~/db/queries/plans'
import {
  getActiveInviteLink,
  getPlanDetailById,
  importPlanSnapshotHistory,
  regenerateInviteLink,
  revokeInviteLink,
  savePlan,
} from '~/db/queries/plans'
import { planSaveSchema } from '~/lib/plan.schema'

export interface LoadPlanEditorInput {
  planId?: string
  userId: string
  origin: string
  userEmail?: string | null
}

export interface PlanEditorLoaderData {
  mode: 'create' | 'edit'
  planId?: string
  name: string
  emoji: string
  planMode: 'accumulate' | 'snapshot'
  permission: 'own' | 'all'
  startingValue: string
  members: PlanMemberView[]
  defaultItems: PlanDefaultItemView[]
  canManage: boolean
  inviteLink: string | null
  inviteExpiresAt: string | null
}

export async function loadPlanEditorData(input: LoadPlanEditorInput): Promise<PlanEditorLoaderData | null> {
  if (!input.planId) {
    return {
      mode: 'create',
      name: '',
      emoji: '💰',
      planMode: 'accumulate',
      permission: 'own',
      startingValue: '0',
      members: [{
        userId: input.userId,
        role: 'owner',
        note: '',
        displayName: input.userEmail || '我',
        avatarEmoji: '',
      }],
      defaultItems: [],
      canManage: true,
      inviteLink: null,
      inviteExpiresAt: null,
    }
  }

  const detail = await getPlanDetailById(input.planId, input.userId)
  if (!detail)
    return null

  const activeInvite = await getActiveInviteLink(input.planId, input.userId)
  const inviteLink = activeInvite ? `${input.origin}/plans/invite/${activeInvite.token}` : null

  return {
    mode: 'edit',
    planId: detail.id,
    name: detail.name,
    emoji: detail.emoji,
    planMode: detail.planMode,
    permission: detail.permission,
    startingValue: String(detail.startingValue),
    members: detail.members,
    defaultItems: detail.defaultItems,
    canManage: detail.canManage,
    inviteLink,
    inviteExpiresAt: activeInvite?.expiresAt?.toISOString() || null,
  }
}

export async function handlePlanEditorAction(input: {
  planId?: string
  userId: string
  origin: string
  formData: FormData
}) {
  const intent = String(input.formData.get('intent') || 'save-plan')

  if (intent === 'regenerate-invite') {
    if (!input.planId)
      throw new Error('请先保存计划再邀请成员')
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    const { token } = await regenerateInviteLink(input.planId, input.userId, expiresAt)
    return {
      ok: true,
      intent,
      inviteLink: `${input.origin}/plans/invite/${token}`,
      inviteExpiresAt: expiresAt.toISOString(),
    }
  }

  if (intent === 'revoke-invite') {
    if (!input.planId)
      throw new Error('当前没有可吊销的邀请链接')
    await revokeInviteLink(input.planId, input.userId)
    return {
      ok: true,
      intent,
      inviteLink: null,
      inviteExpiresAt: null,
    }
  }

  if (intent === 'import-history') {
    if (!input.planId)
      throw new Error('请先保存计划再导入历史数据')

    const file = input.formData.get('csvFile')
    if (!file || typeof file === 'string' || typeof file.text !== 'function')
      throw new Error('请选择要导入的 CSV 文件')

    const text = await file.text()
    const rows = parsePlanHistoryCsv(text)
    const importResult = await importPlanSnapshotHistory({
      planId: input.planId,
      userId: input.userId,
      rows,
    })

    return {
      ok: true,
      intent,
      importResult,
    }
  }

  const payloadText = String(input.formData.get('payload') || '')
  let payloadRaw: unknown
  try {
    payloadRaw = JSON.parse(payloadText)
  }
  catch {
    throw new Error('提交数据格式错误')
  }

  const parsed = planSaveSchema.safeParse(payloadRaw)
  if (!parsed.success)
    throw new Error(parsed.error.issues[0].message)

  const data = parsed.data
  const planId = await savePlan({
    planId: input.planId,
    userId: input.userId,
    name: data.name,
    emoji: data.emoji,
    planMode: data.planMode,
    permission: data.permission,
    startingValue: data.startingValue,
    members: data.members,
    defaultItems: data.defaultItems,
  })

  return {
    ok: true,
    intent,
    planId,
  }
}

interface CsvMemberColumn {
  index: number
  memberEmail: string
  itemName: string
}

function splitCsvLine(line: string) {
  return line.split(',').map(cell => cell.trim())
}

function parseDateToYearMonth(dateText: string, rowNumber: number) {
  const matched = dateText.match(/^(\d{4})[/-](\d{1,2})(?:[/-](\d{1,2}))?$/)
  if (!matched)
    throw new Error(`第 ${rowNumber} 行日期格式错误：${dateText}`)

  const year = Number(matched[1])
  const month = Number(matched[2])
  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12)
    throw new Error(`第 ${rowNumber} 行日期超出范围：${dateText}`)

  return { year, month }
}

function parsePlanHistoryCsv(text: string) {
  const normalized = text.replace(/^\uFEFF/, '').trim()
  if (!normalized)
    throw new Error('CSV 内容为空')

  const lines = normalized.split(/\r?\n/).filter(line => line.trim())
  if (lines.length < 2)
    throw new Error('CSV 至少需要表头和一行数据')

  const header = splitCsvLine(lines[0])
  const dateCol = header.findIndex(cell => cell === '记录日期')
  if (dateCol < 0)
    throw new Error('CSV 缺少“记录日期”列')

  const noteCol = header.findIndex(cell => cell === '备注')
  const memberCols: CsvMemberColumn[] = []
  header.forEach((cell, index) => {
    const [leftRaw, rightRaw] = cell.split('|')
    const memberEmail = leftRaw?.trim().toLowerCase()
    const itemName = rightRaw?.trim()
    if (!memberEmail || !itemName)
      return
    if (!memberEmail.includes('@'))
      return
    memberCols.push({
      index,
      memberEmail,
      itemName,
    })
  })

  if (memberCols.length === 0)
    throw new Error('CSV 缺少“邮箱|项目名”金额列（示例：a@b.com|余额）')

  const rows: Array<{
    year: number
    month: number
    note?: string
    values: Array<{ memberEmail: string, itemName: string, amount: string }>
  }> = []

  for (let i = 1; i < lines.length; i++) {
    const rowNumber = i + 1
    const cells = splitCsvLine(lines[i])
    const dateText = cells[dateCol]
    if (!dateText)
      continue

    const { year, month } = parseDateToYearMonth(dateText, rowNumber)

    const values = memberCols.flatMap((col) => {
      const raw = (cells[col.index] || '').trim()
      if (!raw)
        return []
      const amount = Number(raw)
      if (!Number.isFinite(amount) || amount < 0)
        throw new Error(`第 ${rowNumber} 行金额格式错误：${raw}`)
      return [{
        memberEmail: col.memberEmail,
        itemName: col.itemName,
        amount: amount.toFixed(2),
      }]
    })

    if (values.length === 0)
      continue

    const note = noteCol >= 0 ? (cells[noteCol] || '').trim() : ''
    rows.push({
      year,
      month,
      note,
      values,
    })
  }

  if (rows.length === 0)
    throw new Error('CSV 没有可导入的数据行')

  return rows
}
