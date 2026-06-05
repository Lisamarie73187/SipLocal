import { Calendar, Clock, ExternalLink, MapPin, X } from 'lucide-react'
import { useEffect, useRef } from 'react'

import { NowBadge } from '@/components/NowBadge/NowBadge'
import { VenueMapOverlayDirections } from '@/components/VenueMapOverlayDirections/VenueMapOverlayDirections'
import { VenueTrustFooter } from '@/components/VenueTrustFooter/VenueTrustFooter'
import type { ViewDayFilter } from '@/hooks/useDiscoveryFilters'
import type { EventDetail } from '@/types/event'
import {
  formatEventDateLabel,
  formatEventTimeRange,
  getEventTimelinePlacement,
} from '@/utils/eventTime'
import { formatVenueWebsiteUrl } from '@/utils/venueLinks'
import { getEventTrustMeta } from '@/utils/venueTrust'
import { cn } from '@/utils'

export interface EventMapPlacePanelProps {
  event: EventDetail
  viewDay: ViewDayFilter
  distanceLabel?: string
  onClose: () => void
}

export function EventMapPlacePanel({
  event,
  viewDay,
  distanceLabel,
  onClose,
}: EventMapPlacePanelProps) {
  const closeRef = useRef<HTMLButtonElement>(null)
  const timeZone = event.city.timezone
  const now = new Date()
  const placement = getEventTimelinePlacement(event, viewDay, now, timeZone)
  const dateLabel = formatEventDateLabel(event, { long: true })
  const timeLabel = formatEventTimeRange(event)
  const isOpenNow = placement?.badgeTone === 'open'
  const showStatusPill = placement && !isOpenNow && placement.badgeLabel
  const trustMeta = getEventTrustMeta(event)
  const websiteUrl = event.venue.website_url?.trim()
    ? formatVenueWebsiteUrl(event.venue.website_url)
    : null

  useEffect(() => {
    closeRef.current?.focus()
  }, [event.id])

  return (
    <aside
      className="event-map-place-panel pointer-events-auto absolute z-40 flex flex-col bg-card shadow-xl"
      role="dialog"
      aria-label={`${event.title} details`}
    >
      <div className="event-map-place-panel__header relative shrink-0 px-4 pt-4 pb-5">
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 flex size-8 items-center justify-center rounded-full bg-card/90 text-muted-foreground shadow-sm transition-colors hover:bg-card hover:text-foreground"
          aria-label="Close"
        >
          <X className="size-4" />
        </button>

        {(isOpenNow || showStatusPill || distanceLabel) ? (
          <div className="flex flex-wrap items-center gap-2">
            {isOpenNow ? (
              <NowBadge label={placement?.badgeLabel} />
            ) : showStatusPill ? (
              <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-1 text-[10px] font-bold tracking-wide text-muted-foreground uppercase">
                {placement.badgeLabel}
              </span>
            ) : null}
            {distanceLabel ? (
              <span className="text-xs text-muted-foreground">{distanceLabel}</span>
            ) : null}
          </div>
        ) : null}

        <div className={cn('flex flex-col gap-1.5', (isOpenNow || showStatusPill || distanceLabel) && 'mt-4')}>
          {dateLabel ? (
            <p className="flex items-center gap-2 font-heading text-base font-bold text-dark">
              <Calendar className="size-4 shrink-0 text-secondary" aria-hidden />
              <span>{dateLabel}</span>
            </p>
          ) : null}
          <p className="flex items-center gap-2 text-base font-semibold text-dark">
            <Clock className="size-4 shrink-0 text-secondary" aria-hidden />
            <span>{timeLabel}</span>
          </p>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain border-t border-border/60 px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="pt-4">
          <h2 className="font-heading text-xl font-bold text-dark">{event.title}</h2>
          <p className="mt-1 text-sm font-medium text-muted-foreground">{event.venue.name}</p>
          {event.description?.trim() ? (
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{event.description}</p>
          ) : null}
        </div>

        <div className="mt-4 space-y-1.5 text-sm text-muted-foreground">
          <p className="inline-flex items-start gap-1.5">
            <MapPin className="mt-0.5 size-3.5 shrink-0 text-secondary" aria-hidden />
            <span className="break-words">{event.venue.address_line1}</span>
          </p>
          {websiteUrl ? (
            <a
              href={websiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center gap-1.5 font-medium text-secondary underline-offset-2 hover:underline"
            >
              <ExternalLink className="size-3.5 shrink-0" aria-hidden />
              Website
            </a>
          ) : null}
          <VenueMapOverlayDirections
            venue={event.venue}
            className={cn('mt-0 text-secondary hover:text-secondary')}
          />
        </div>

        <VenueTrustFooter
          meta={trustMeta}
          ariaLabel="Event data sources"
          className="mt-4 border-t border-border/60 pt-4"
        />
      </div>
    </aside>
  )
}
