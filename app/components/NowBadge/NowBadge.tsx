import { cn } from '@/utils'

export interface NowBadgeProps {
  className?: string
}

export function NowBadge({ className }: NowBadgeProps) {
  return (
    <span
      className={cn(
        'now-badge inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1',
        className,
      )}
    >
      <span className="now-badge__dot size-1.5 shrink-0 rounded-full" aria-hidden />
      <span className="text-xs font-bold text-white">Now</span>
    </span>
  )
}
