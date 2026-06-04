import { Clock, MapPin } from 'lucide-react'

import { NowBadge } from '@/components/NowBadge/NowBadge'
import { VenuePriceLevel } from '@/components/VenuePriceLevel/VenuePriceLevel'
import type { TimelineVenueEntry } from '@/hooks/useHappyHourTimeline'
import type { VenueDetail } from '@/types/venue'
import type { VenueTypeFilter } from '@/utils/venueType'
import { isStartsInBadgeLabel } from '@/utils/happyHour'
import { inferVenueType } from '@/utils/venueType'
import { cn } from '@/utils'

export interface VenueTimelineCardProps {
  entry: TimelineVenueEntry
  selected?: boolean
  hovered?: boolean
  isLiveDay: boolean
  onSelect: () => void
  onHover: () => void
  onHoverEnd: () => void
}

const VENUE_TYPE_LABELS: Record<VenueTypeFilter, string> = {
  bar: 'Bar',
  brewery: 'Brewery',
  restaurant: 'Restaurant',
  wine_bar: 'Wine bar',
  taproom: 'Taproom',
}

function getVenueSubtitle(venue: VenueDetail): string {
  if (venue.description?.trim()) {
    return venue.description.trim()
  }

  const type = inferVenueType(venue)
  return type ? VENUE_TYPE_LABELS[type] : 'Happy hour spot'
}

export function VenueTimelineCard({
  entry,
  selected,
  hovered,
  isLiveDay,
  onSelect,
  onHover,
  onHoverEnd,
}: VenueTimelineCardProps) {
  const { venue, hhWindow, badgeTone, badgeLabel, emphasis } = entry
  const isOpenNow = badgeTone === 'open'
  const showScheduleBadge =
    !isOpenNow && badgeLabel && (!isStartsInBadgeLabel(badgeLabel) || isLiveDay)
  const subtitle = getVenueSubtitle(venue)

  return (
    <button
      type="button"
      data-venue-id={venue.id}
      onClick={onSelect}
      onMouseEnter={onHover}
      onMouseLeave={onHoverEnd}
      onFocus={onHover}
      onBlur={onHoverEnd}
      aria-pressed={selected}
      className={cn(
        'venue-timeline-card w-full rounded-2xl border border-primary/35 bg-card p-4 text-left transition-all duration-200',
        'hover:border-primary/50 hover:shadow-md',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
        selected && 'border-primary ring-2 ring-primary/20 shadow-md',
        hovered && !selected && 'border-primary/45 shadow-sm',
        emphasis && !selected && !hovered && 'border-primary/40',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <p className="font-heading text-base leading-snug font-bold break-words text-dark">
              {venue.name}
            </p>
            <VenuePriceLevel level={venue.price_level} className="text-sm" />
          </div>
          <p className="mt-0.5 text-sm leading-snug text-muted-foreground line-clamp-2">
            {subtitle}
          </p>
        </div>
        {isOpenNow ? (
          <NowBadge />
        ) : showScheduleBadge ? (
          <span
            className={cn(
              'inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-[10px] font-bold tracking-wide uppercase',
              isLiveDay &&
                badgeTone === 'soon' &&
                'bg-[color-mix(in_oklab,var(--color-map-starting-soon)_16%,transparent)] text-[color-mix(in_oklab,var(--color-map-starting-soon)_75%,var(--color-deep-plum))]',
              (!isLiveDay || badgeTone === 'scheduled') && 'bg-muted text-muted-foreground',
            )}
          >
            {badgeLabel}
          </span>
        ) : null}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-muted-foreground">
        {hhWindow ? (
          <span className="inline-flex items-center gap-1.5">
            <Clock className="size-3.5 shrink-0 text-primary" aria-hidden />
            {hhWindow}
          </span>
        ) : null}
        <span className="inline-flex min-w-0 items-center gap-1.5">
          <MapPin className="size-3.5 shrink-0 text-primary" aria-hidden />
          <span className="break-words">{venue.address_line1}</span>
        </span>
      </div>
    </button>
  )
}
