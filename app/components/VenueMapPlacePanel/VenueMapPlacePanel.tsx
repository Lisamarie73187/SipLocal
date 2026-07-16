import { Clock, MapPin, X } from 'lucide-react'
import { useEffect, useRef } from 'react'

import { NowBadge } from '@/components/NowBadge/NowBadge'
import { VenueDetailActions } from '@/components/VenueDetailActions/VenueDetailActions'
import { VenueExpandedDetails } from '@/components/VenueExpandedDetails/VenueExpandedDetails'
import { VenueFavoriteButton } from '@/components/VenueFavoriteButton/VenueFavoriteButton'
import { VenueMapOverlaySpecials } from '@/components/VenueMap/VenueMapOverlaySpecials'
import { VenuePriceLevel } from '@/components/VenuePriceLevel/VenuePriceLevel'
import { VenueThumbnail } from '@/components/VenueThumbnail/VenueThumbnail'
import type { ViewDayFilter } from '@/hooks/useDiscoveryFilters'
import type { VenueDetail } from '@/types/venue'
import { getDealChipsForVenuePanel } from '@/utils/dealChips'
import { getOwnerPreviewOverlayStatus } from '@/utils/ownerPreviewVenue'
import { getVenueOverlayStatusForVenue } from '@/utils/venueOverlayStatus'
import { getVenueDisplaySubtitle } from '@/utils/venueDisplay'
import { getVenueTrustMeta } from '@/utils/venueTrust'
import { cn } from '@/utils'

/** Pixel offset so the selected pin sits in the visible map beside the panel. */
export const VENUE_MAP_PLACE_PANEL_OFFSET_PX = 200

export interface VenueMapPlacePanelProps {
  venue: VenueDetail
  viewDay: ViewDayFilter
  distanceLabel?: string
  onClose?: () => void
  /** Owner portal static preview — same UI without map overlay positioning. */
  preview?: boolean
}

export function VenueMapPlacePanel({
  venue,
  viewDay,
  distanceLabel,
  onClose,
  preview = false,
}: VenueMapPlacePanelProps) {
  const closeRef = useRef<HTMLButtonElement>(null)
  const timeZone = venue.city.timezone
  const now = new Date()
  const { placement, pinStatus, isLiveDay, statusBadgeLabel } = preview
    ? getOwnerPreviewOverlayStatus(venue, now)
    : getVenueOverlayStatusForVenue(venue, viewDay, now)
  const dealChips = getDealChipsForVenuePanel(
    venue.happy_hour_slots,
    placement?.focusSlot ?? null,
    now,
    timeZone,
    6,
  )
  const hhWindow = placement?.hhWindow ?? null
  const subtitle = getVenueDisplaySubtitle(venue)
  const isOpenNow = pinStatus === 'happening_now'
  const showStartsInPill = isLiveDay && pinStatus === 'starting_soon'
  const trustMeta = getVenueTrustMeta(venue, placement?.focusSlot)

  useEffect(() => {
    if (preview) {
      return
    }
    closeRef.current?.focus()
  }, [preview, venue.id])

  return (
    <aside
      className={cn(
        'venue-map-place-panel pointer-events-auto flex flex-col bg-card shadow-xl',
        preview ? 'venue-map-place-panel--preview relative z-auto' : 'absolute z-40',
      )}
      role={preview ? 'region' : 'dialog'}
      aria-label={`${venue.name} details`}
    >
      <div className="relative shrink-0">
        <VenueThumbnail
          imageUrl={venue.image_url}
          venueName={venue.name}
          fallback="hidden"
          className="h-36 w-full sm:h-40"
        />
        {!preview ? (
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="absolute top-3 right-3 flex size-8 items-center justify-center rounded-full bg-card/90 text-muted-foreground shadow-sm transition-colors hover:bg-card hover:text-foreground"
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        ) : null}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="pt-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">
              <h2 className="font-heading text-lg font-bold text-dark">{venue.name}</h2>
              <VenuePriceLevel level={venue.price_level} className="text-sm" />
            </div>
            {!preview ? (
              <VenueFavoriteButton
                venueId={venue.id}
                variant="overlay"
                className="-mt-1 shrink-0"
              />
            ) : null}
          </div>
          <p className="mt-1 line-clamp-3 text-sm leading-snug text-muted-foreground">{subtitle}</p>
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

        <VenueDetailActions venue={venue} className="mt-4" />

        <VenueExpandedDetails
          venue={venue}
          trustMeta={trustMeta}
          showInfoCorrection={!preview}
          className="mt-4 border-t border-border pt-4"
        />
      </div>
    </aside>
  )
}
