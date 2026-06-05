import type { DiscoveryContentType } from '@/hooks/useDiscoveryFilters'
import { cn } from '@/utils'

const OPTIONS: Array<{ id: DiscoveryContentType; label: string }> = [
  { id: 'happy_hours', label: 'Happy hours' },
  { id: 'events', label: 'Events' },
]

export interface ContentTypeToggleProps {
  value: DiscoveryContentType
  onChange: (value: DiscoveryContentType) => void
}

export function ContentTypeToggle({ value, onChange }: ContentTypeToggleProps) {
  return (
    <div
      className="inline-flex w-fit rounded-xl border border-border/70 bg-card p-1 shadow-sm"
      role="group"
      aria-label="Discover happy hours or events"
    >
      {OPTIONS.map((option) => {
        const active = value === option.id
        return (
          <button
            key={option.id}
            type="button"
            onClick={() => onChange(option.id)}
            aria-pressed={active}
            className={cn(
              'min-h-9 shrink-0 whitespace-nowrap rounded-lg px-4 text-sm font-semibold transition-colors',
              active
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:bg-accent hover:text-dark',
            )}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
