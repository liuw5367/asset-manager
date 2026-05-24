import { cn } from '~/lib/utils'

const sizeClassMap = {
  sm: 'h-7 w-7',
  md: 'h-8 w-8',
  lg: 'h-10 w-10',
  xl: 'h-14 w-14',
} as const

const emojiClassMap = {
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-lg',
  xl: 'text-2xl',
} as const

const textClassMap = {
  sm: 'text-xs',
  md: 'text-xs',
  lg: 'text-sm',
  xl: 'text-lg',
} as const

function firstChar(name?: string | null) {
  const normalized = (name || '').trim()
  if (!normalized)
    return 'U'

  return Array.from(normalized)[0] || 'U'
}

interface PublicAvatarProps {
  emoji?: string | null
  nickname?: string | null
  size?: keyof typeof sizeClassMap
  backgroundColor?: string
  textColor?: string
  className?: string
  title?: string
}

export function PublicAvatar({
  emoji,
  nickname,
  size = 'md',
  backgroundColor = 'var(--color-primary-muted)',
  textColor = 'var(--color-primary)',
  className,
  title,
}: PublicAvatarProps) {
  const hasEmoji = Boolean(emoji?.trim())
  const fallback = firstChar(nickname)

  return (
    <div
      className={cn(
        'flex shrink-0 items-center justify-center rounded-full',
        sizeClassMap[size],
        className,
      )}
      style={{
        backgroundColor,
        color: textColor,
      }}
      title={title}
    >
      <span className={cn(hasEmoji ? emojiClassMap[size] : `${textClassMap[size]} font-semibold`)}>
        {hasEmoji ? emoji : fallback}
      </span>
    </div>
  )
}
