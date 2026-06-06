import type { HappyHourSlotFormState } from '@/components/HappyHourSlotsEditor/HappyHourSlotsEditor.types'
import { VenueMapPlacePanel } from '@/components/VenueMapPlacePanel/VenueMapPlacePanel'
import { VenueTimelineCard } from '@/components/VenueTimelineCard/VenueTimelineCard'
import type { OwnerVenueDetail } from '@/server/ownerVenues'
import {
  buildOwnerPreviewTimelineEntry,
  buildOwnerPreviewVenue,
} from '@/utils/ownerPreviewVenue'
import { cn } from '@/utils'

export interface OwnerVenuePreviewProps {
  venue: OwnerVenueDetail
  slots: HappyHourSlotFormState[]
  className?: string
}

export function OwnerVenuePreview({ venue, slots, className }: OwnerVenuePreviewProps) {
  const previewVenue = buildOwnerPreviewVenue(venue, slots)
  const now = new Date()
  const entry = buildOwnerPreviewTimelineEntry(previewVenue, now)

  return (
    <div className={cn('space-y-4', className)}>
      <p className="font-heading text-sm font-semibold text-dark">Live preview</p>
      <p className="text-xs text-muted-foreground">
        Updates as you edit — this is how guests see your listing on the map.
      </p>

      <section className="space-y-2">
        <h3 className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
          List view
        </h3>
        <VenueTimelineCard
          entry={entry}
          isLiveDay
          preview
          onSelect={() => {}}
          onHover={() => {}}
          onHoverEnd={() => {}}
        />
      </section>

      <section className="space-y-2">
        <h3 className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
          Map panel
        </h3>
        <div className="owner-venue-preview-panel overflow-hidden rounded-2xl border border-border/70 bg-card shadow-md">
          <VenueMapPlacePanel venue={previewVenue} viewDay="any" preview />
        </div>
      </section>
    </div>
  )
}
