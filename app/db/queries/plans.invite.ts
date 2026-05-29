import type { AcceptInviteResult } from './plans.types'
import { randomBytes } from 'node:crypto'
import { and, desc, eq, isNull, sql } from 'drizzle-orm'
import { db } from '~/db'
import { planInviteLinks, planMembers, plans } from '~/db/schema'
import { getActivePlanForUser } from './plans.read'

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
