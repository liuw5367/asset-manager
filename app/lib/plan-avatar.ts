export interface PlanAvatarTone {
  backgroundColor: string
  textColor: string
}

const PLAN_AVATAR_TONES: PlanAvatarTone[] = [
  { backgroundColor: 'var(--color-primary)', textColor: '#ffffff' },
  { backgroundColor: '#3f8f7f', textColor: '#ffffff' },
  { backgroundColor: '#a36b18', textColor: '#ffffff' },
  { backgroundColor: '#5b6fb2', textColor: '#ffffff' },
  { backgroundColor: '#a05a8f', textColor: '#ffffff' },
  { backgroundColor: '#6f7f2f', textColor: '#ffffff' },
]

export function getPlanAvatarToneByIndex(index: number): PlanAvatarTone {
  if (index < 0)
    return PLAN_AVATAR_TONES[0]
  return PLAN_AVATAR_TONES[index % PLAN_AVATAR_TONES.length]
}

export function buildPlanAvatarToneMap(memberIds: string[]) {
  const map = new Map<string, PlanAvatarTone>()
  memberIds.forEach((memberId, index) => {
    map.set(memberId, getPlanAvatarToneByIndex(index))
  })
  return map
}
