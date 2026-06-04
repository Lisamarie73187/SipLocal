import { Clock, MapPin, X } from 'lucide-react'
import { useEffect, useRef } from 'react'

import { NowBadge } from '@/components/NowBadge/NowBadge'
import { VenueExpandedDetails } from '@/components/VenueExpandedDetails/VenueExpandedDetails'
import { VenueMapOverlayDirections } from '@/components/VenueMapOverlayDirections/VenueMapOverlayDirections'
import { VenueMapOverlaySpecials } from '@/components/VenueMap/VenueMapOverlaySpecials'
import { VenuePriceLevel } from '@/components/VenuePriceLevel/VenuePriceLevel'
import { VenueThumbnail } from '@/components/VenueThumbnail/VenueThumbnail'
import type { ViewDayFilter } from '@/hooks/useDiscoveryFilters'
import type { VenueDetail } from '@/types/venue'
import { getDealChipsForSlot, getTodayDealChips } from '@/utils/dealChips'
import { getVenueOverlayStatusForVenue } from '@/utils/venueOverlayStatus'
import type { VenueTypeFilter } from '@/utils/venueType'
import { inferVenueType } from '@/utils/venueType'
import { cn } from '@/utils'

/** Pixel offset so the selected pin sits in the visible map beside the panel. */
export const VENUE_MAP_PLACE_PANEL_OFFSET_PX = 200

export interface VenueMapPlacePanelProps {
  venue: VenueDetail
  viewDay: ViewDayFilter
  distanceLabel?: string
  onClose: () => void
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

export function VenueMapPlacePanel({
  venue,
  viewDay,
  distanceLabel,
  onClose,
}: VenueMapPlacePanelProps) {
  const closeRef = useRef<HTMLButtonElement>(null)
  const timeZone = venue.city.timezone
  const now = new Date()
  const { placement, pinStatus, isLiveDay, statusBadgeLabel } = getVenueOverlayStatusForVenue(
    venue,
    viewDay,
    now,
  )
  const dealChips = placement
    ? getDealChipsForSlot(venue.happy_hour_slots, placement.focusSlot, 6)
    : getTodayDealChips(venue.happy_hour_slots, now, timeZone, 6)
  const hhWindow = placement?.hhWindow ?? null
  const subtitle = getVenueSubtitle(venue)
  const isOpenNow = pinStatus === 'happening_now'
  const showStartsInPill = isLiveDay && pinStatus === 'starting_soon'

  useEffect(() => {
    closeRef.current?.focus()
  }, [venue.id])

  return (
    <aside
      className="venue-map-place-panel pointer-events-auto absolute z-40 flex flex-col bg-card shadow-xl"
      role="dialog"
      aria-label={`${venue.name} details`}
    >
      <div className="relative shrink-0">
        <VenueThumbnail
          imageUrl={venue.image_url}
          venueName={venue.name}
          fallback="hidden"
          className="h-36 w-full sm:h-40"
        />
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 flex size-8 items-center justify-center rounded-full bg-card/90 text-muted-foreground shadow-sm transition-colors hover:bg-card hover:text-foreground"
          aria-label="Close"
        >
          <X className="size-4" />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="pt-3">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <h2 className="font-heading text-lg font-bold text-dark">{venue.name}</h2>
            <VenuePriceLevel level={venue.price_level} className="text-sm" />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {isOpenNow ? (
              <NowBadge />
            ) : statusBadgeLabel ? (
              <span
                className={cn(
                  'inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-bold tracking-wide uppercase',
                  showStartsInPill &&
                    'bg-[color-mix(in_oklab,var(--color-map-starting-soon)_16%,transparent)] text-[color-mix(in_oklab,var(--color-map-starting-soon)_75%,var(--color-deep-plum))]',
                  !showStartsInPill && 'bg-muted text-muted-foreground',
                )}
              >
                {statusBadgeLabel}
              </span>
            ) : null}
            {distanceLabel ? (
              <span className="text-xs text-muted-foreground">{distanceLabel}</span>
            ) : null}
          </div>
        </div>

        <div className="mt-3 space-y-1.5 text-sm text-muted-foreground">
          {hhWindow ? (
            <p className="inline-flex items-start gap-1.5 font-medium text-primary">
              <Clock className="mt-0.5 size-3.5 shrink-0" aria-hidden />
              <span>{hhWindow}</span>
            </p>
          ) : null}
          <p className="inline-flex items-start gap-1.5">
            <MapPin className="mt-0.5 size-3.5 shrink-0 text-primary" aria-hidden />
            <span className="break-words">{venue.address_line1}</span>
          </p>
        </div>

        <VenueMapOverlaySpecials chips={dealChips} />

        <VenueMapOverlayDirections venue={venue} />

        <VenueExpandedDetails venue={venue} className="mt-4 border-t border-border pt-4" />
      </div>
    </aside>
  )
}
