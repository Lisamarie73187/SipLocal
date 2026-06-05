import { Calendar, Clock, MapPin } from 'lucide-react'

import { NowBadge } from '@/components/NowBadge/NowBadge'
import type { TimelineEventEntry } from '@/hooks/useEventTimeline'
import { formatEventDateLabel, formatEventTimeRange } from '@/utils/eventTime'
import { getEventTypeLabel } from '@/utils/eventType'
import { cn } from '@/utils'

export interface EventTimelineCardProps {
  entry: TimelineEventEntry
  selected?: boolean
  hovered?: boolean
  onSelect: () => void
  onHover: () => void
  onHoverEnd: () => void
}

export function EventTimelineCard({
  entry,
  selected,
  hovered,
  onSelect,
  onHover,
  onHoverEnd,
}: EventTimelineCardProps) {
  const { event, badgeTone, badgeLabel } = entry
  const isOpenNow = badgeTone === 'open'
  const showScheduleBadge = !isOpenNow && badgeLabel
  const dateLabel = formatEventDateLabel(event)
  const timeLabel = formatEventTimeRange(event)

  return (
    <button
      type="button"
      data-event-id={event.id}
      data-venue-id={event.venue.id}
      onClick={onSelect}
      onMouseEnter={onHover}
      onMouseLeave={onHoverEnd}
      onFocus={onHover}
      onBlur={onHoverEnd}
      aria-pressed={selected}
      className={cn(
        'event-timeline-card w-full rounded-2xl border border-secondary/35 bg-card p-4 text-left transition-all duration-200',
        'hover:border-secondary/55 hover:shadow-md',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary/50',
        selected && 'border-secondary ring-2 ring-secondary/20 shadow-md',
        hovered && !selected && 'border-secondary/50 shadow-sm',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-dark">
            {dateLabel ? (
              <span className="inline-flex items-center gap-1.5">
                <Calendar className="size-3.5 shrink-0 text-secondary" aria-hidden />
                {dateLabel}
              </span>
            ) : null}
            <span className="inline-flex items-center gap-1.5 text-muted-foreground">
              <Clock className="size-3.5 shrink-0 text-secondary" aria-hidden />
              {timeLabel}
            </span>
          </div>

          <p className="mt-2 font-heading text-base leading-snug font-bold break-words text-dark">
            {event.title}
          </p>
          <p className="mt-0.5 text-sm text-muted-foreground">{event.venue.name}</p>
          {event.description?.trim() ? (
            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{event.description}</p>
          ) : null}
        </div>
        {isOpenNow ? (
          <NowBadge label={badgeLabel} />
        ) : showScheduleBadge ? (
          <span className="shrink-0 rounded-full bg-secondary/20 px-2.5 py-1 text-xs font-semibold text-dark">
            {badgeLabel}
          </span>
        ) : null}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <MapPin className="size-3.5 shrink-0" aria-hidden />
          {event.venue.address_line1}
        </span>
        <span className="rounded-full bg-muted px-2 py-0.5 font-medium text-dark">
          {getEventTypeLabel(event.event_type)}
        </span>
      </div>
    </button>
  )
}
