import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

import { cn } from '@/utils'

export interface DiscoveryFilterButtonProps {
  label: string
  icon: LucideIcon
  active?: boolean
  disabled?: boolean
  badge?: ReactNode
  variant?: 'default' | 'filters'
  onClick?: () => void
  'aria-expanded'?: boolean
  'aria-haspopup'?: boolean | 'dialog'
}

export function DiscoveryFilterButton({
  label,
  icon: Icon,
  active = false,
  disabled = false,
  badge,
  variant = 'default',
  onClick,
  'aria-expanded': ariaExpanded,
  'aria-haspopup': ariaHaspopup,
}: DiscoveryFilterButtonProps) {
  const isFiltersVariant = variant === 'filters'

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      aria-pressed={active}
      aria-expanded={ariaExpanded}
      aria-haspopup={ariaHaspopup}
      className={cn(
        'discovery-filter-btn inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold shadow-sm transition-[background,box-shadow,color,border-color] md:gap-2 md:px-4 md:py-2 md:text-sm',
        'disabled:cursor-not-allowed disabled:opacity-50',
        active
          ? isFiltersVariant
            ? 'discovery-filter-btn--filters-active'
            : 'discovery-filter-btn--active'
          : 'border-border/80 bg-card text-dark hover:border-primary/25 hover:bg-accent/80',
      )}
    >
      <Icon
        className={cn('size-3.5 shrink-0 md:size-4', active && 'text-white')}
        aria-hidden
      />
      <span className="whitespace-nowrap">{label}</span>
      {badge}
    </button>
  )
}
