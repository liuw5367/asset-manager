import { useNavigate } from 'react-router'

interface EmptyStateAction {
  label: string
  to?: string
  onClick?: () => void
}

interface EmptyStateProps {
  emoji: string
  title: string
  description?: string
  actions?: EmptyStateAction[]
}

export function EmptyState({ emoji, title, description, actions }: EmptyStateProps) {
  const navigate = useNavigate()

  return (
    <div
      className="flex flex-col items-center justify-center rounded-2xl border py-14"
      style={{ borderColor: 'var(--color-hairline)' }}
    >
      <span className="mb-2 text-4xl">{emoji}</span>
      <p className="mb-4 text-sm" style={{ color: 'var(--color-muted)' }}>{title}</p>
      {description && (
        <p className="mb-4 text-xs" style={{ color: 'var(--color-muted-soft)' }}>{description}</p>
      )}
      {actions && actions.length > 0 && (
        <div className="flex gap-3">
          {actions.map(action => (
            <button
              key={action.label}
              onClick={() => {
                if (action.onClick) {
                  action.onClick()
                }
                else if (action.to) {
                  navigate(action.to)
                }
              }}
              className="rounded-lg px-4 py-2 text-sm font-medium"
              style={{
                background: 'var(--color-primary)',
                color: '#fff',
              }}
            >
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
