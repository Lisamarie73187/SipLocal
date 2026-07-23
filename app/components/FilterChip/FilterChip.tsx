import { cn } from '@/utils'

export interface FilterChipProps {
  label: string
  emoji?: string
  active?: boolean
  onClick: () => void
  variant?: 'time' | 'tag' | 'day' | 'pill'
}

export function FilterChip({
  label,
  emoji,
  active = false,
  onClick,
  variant = 'tag',
}: FilterChipProps) {
  const isTime = variant === 'time'
  const isDay = variant === 'day'
  const isPill = variant === 'pill'

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'inline-flex items-center font-medium transition-all duration-200',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45',
        emoji ? 'gap-1.5' : 'gap-0',
        isPill &&
          cn(
            'rounded-full border px-3 py-1.5 text-xs md:px-4 md:py-2 md:text-sm',
            active
              ? 'filter-chip--pill-active border-primary/40 bg-primary/10 text-dark'
              : 'border-border/70 bg-card text-dark hover:border-primary/25',
          ),
        (isTime || isDay) &&
          cn(
            'rounded-full px-2.5 py-1 text-xs md:px-3 md:py-1.5 md:text-sm',
            active
              ? 'bg-card text-dark shadow-sm ring-1 ring-primary/25'
              : 'text-muted-foreground hover:text-dark',
          ),
        !isPill &&
          !isTime &&
          !isDay &&
          cn(
            'rounded-lg border px-2 py-1 text-xs md:px-2.5 md:py-1.5 md:text-sm',
            active
              ? 'filter-chip--tag-active border-primary/50 bg-gradient-to-br from-primary/12 via-card to-secondary/10 text-dark shadow-sm'
              : 'border-border/80 bg-card text-muted-foreground hover:border-primary/25 hover:bg-accent/60 hover:text-dark',
          ),
      )}
    >
      {emoji ? (
        <span className="text-base leading-none" aria-hidden>
          {emoji}
        </span>
      ) : null}
      <span>{label}</span>
    </button>
  )
}
