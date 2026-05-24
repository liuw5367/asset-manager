import type { PlanDefaultItemView, PlanMemberView } from '~/db/queries/plans'
import {
  getActiveInviteLink,
  getPlanDetailById,
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
        avatarEmoji: '😊',
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
