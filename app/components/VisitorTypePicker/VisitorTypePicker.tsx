import type { ProfileVisitorType } from '@/types/venue'
import { cn } from '@/utils'

const VISITOR_TYPE_OPTIONS = [
  { value: 'local' as const, label: 'Local' },
  { value: 'visiting' as const, label: 'Tourist' },
] as const

export interface VisitorTypePickerProps {
  value: ProfileVisitorType | null
  onChange: (value: ProfileVisitorType | null) => void
  allowClear?: boolean
  className?: string
}

export function VisitorTypePicker({
  value,
  onChange,
  allowClear = true,
  className,
}: VisitorTypePickerProps) {
  return (
    <div className={cn('grid grid-cols-2 gap-2', className)}>
      {VISITOR_TYPE_OPTIONS.map((option) => {
        const selected = value === option.value

        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={selected}
            onClick={() => {
              if (selected && allowClear) {
                onChange(null)
                return
              }

              if (!selected) {
                onChange(option.value)
              }
            }}
            className={cn(
              'min-h-11 rounded-xl border px-3 text-sm font-medium transition-colors',
              selected
                ? 'border-primary bg-primary/10 text-dark'
                : 'border-border/70 bg-background text-muted-foreground hover:border-primary/30',
            )}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
