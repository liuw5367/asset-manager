import { IconCheck, IconChevronDown, IconX } from '@tabler/icons-react'
import { useState } from 'react'
import { Badge } from '~/components/ui/badge'
import { Popover, PopoverContent, PopoverTrigger } from '~/components/ui/popover'

interface MultiSelectItem {
  value: string
  label: string
  color?: string
}

interface MultiSelectProps {
  items: MultiSelectItem[]
  selected: string[]
  onToggle: (value: string) => void
  placeholder?: string
}

export function MultiSelect({
  items,
  selected,
  onToggle,
  placeholder = '请选择',
}: MultiSelectProps) {
  const [open, setOpen] = useState(false)

  const selectedItems = items.filter(item => selected.includes(item.value))

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className="flex min-h-10 w-full items-center justify-between rounded-md border px-3 py-2 text-sm"
        style={{
          borderColor: 'var(--color-hairline)',
          background: 'var(--color-canvas)',
        }}
      >
        <div className="flex flex-1 flex-wrap gap-1">
          {selectedItems.length === 0
            ? (
                <span style={{ color: 'var(--color-muted)' }}>{placeholder}</span>
              )
            : (
                selectedItems.map(item => (
                  <Badge
                    key={item.value}
                    className="rounded-full px-2 py-0.5 text-[12px] font-medium"
                    style={{
                      background: item.color ? `${item.color}22` : 'var(--color-surface-strong)',
                      color: item.color || 'var(--color-body)',
                    }}
                  >
                    {item.label}
                    <button
                      type="button"
                      className="ml-1 inline-flex"
                      onClick={(e) => {
                        e.stopPropagation()
                        onToggle(item.value)
                      }}
                      style={{ color: item.color || 'var(--color-muted)' }}
                    >
                      <IconX size={12} />
                    </button>
                  </Badge>
                ))
              )}
        </div>
        <IconChevronDown size={14} className="ml-2 shrink-0" style={{ color: 'var(--color-muted)' }} />
      </PopoverTrigger>
      <PopoverContent className="w-72 p-1" align="start">
        <div className="max-h-[240px] overflow-y-auto">
          {items.map((item) => {
            const isSelected = selected.includes(item.value)
            return (
              <button
                key={item.value}
                type="button"
                onClick={() => onToggle(item.value)}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[14px] transition-colors hover:opacity-80"
                style={{
                  background: isSelected ? 'var(--color-primary-muted)' : 'transparent',
                  color: isSelected ? 'var(--color-primary)' : 'var(--color-ink)',
                }}
              >
                <span
                  className="flex h-4 w-4 items-center justify-center rounded border"
                  style={{
                    borderColor: isSelected ? 'var(--color-primary)' : 'var(--color-hairline)',
                    background: isSelected ? 'var(--color-primary)' : 'transparent',
                  }}
                >
                  {isSelected && <IconCheck size={12} style={{ color: '#fff' }} />}
                </span>
                {item.color && (
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ background: item.color }}
                  />
                )}
                <span className="flex-1">{item.label}</span>
              </button>
            )
          })}
        </div>
      </PopoverContent>
    </Popover>
  )
}
