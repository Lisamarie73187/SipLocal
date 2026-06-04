import type { VenuePriceLevel as VenuePriceLevelValue } from '@/types/venue'
import { getVenuePriceLevelAriaLabel } from '@/utils/venuePrice'
import { cn } from '@/utils'

export interface VenuePriceLevelProps {
  level: VenuePriceLevelValue
  className?: string
}

export function VenuePriceLevel({ level, className }: VenuePriceLevelProps) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 font-semibold tracking-tight text-secondary tabular-nums',
        className,
      )}
      aria-label={getVenuePriceLevelAriaLabel(level)}
    >
      {level}
    </span>
  )
}
