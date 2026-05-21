import * as React from 'react'

import { cn } from '~/lib/utils'

function Input({ className, type, onFocus, onClick, ...props }: React.ComponentProps<'input'>) {
  const maybeShowDatePicker = (event: React.FocusEvent<HTMLInputElement> | React.MouseEvent<HTMLInputElement>) => {
    const input = event.currentTarget
    if (type === 'date' && typeof input.showPicker === 'function')
      input.showPicker()
  }

  return (
    <input
      type={type}
      data-slot="input"
      onFocus={(event) => {
        maybeShowDatePicker(event)
        onFocus?.(event)
      }}
      onClick={(event) => {
        maybeShowDatePicker(event)
        onClick?.(event)
      }}
      className={cn(
        'h-11 w-full min-w-0 rounded-[10px] border border-[var(--color-hairline)] bg-background px-3 py-2 text-[15px] transition-colors outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40',
        className,
      )}
      {...props}
    />
  )
}

export { Input }
