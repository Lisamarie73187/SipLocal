import type { TimelineSection } from '@/hooks/useHappyHourTimeline'
import type { UseDiscoveryFiltersResult } from '@/hooks/useDiscoveryFilters'

import { TimelineSectionBlock } from './TimelineSectionBlock'
import { TimelineSkeleton } from './TimelineSkeleton'

export interface TimelinePanelProps {
  sections: TimelineSection[]
  isLiveDay: boolean
  loading: boolean
  selectedVenueId: string | null
  hoveredVenueId: string | null
  filters: UseDiscoveryFiltersResult
  onSelectVenue: (venueId: string) => void
  onHoverVenue: (venueId: string | null) => void
  nowLabel: string
}

export function TimelinePanel({
  sections,
  isLiveDay,
  loading,
  selectedVenueId,
  hoveredVenueId,
  filters,
  onSelectVenue,
  onHoverVenue,
  nowLabel,
}: TimelinePanelProps) {
  const { hasActiveFilters, clearAllFilters } = filters

  return (
    <aside className="discovery-shell__timeline flex h-full min-h-0 flex-col bg-background">
      <div className="min-h-0 flex-1 overflow-y-auto scroll-smooth px-3 py-4">
        {loading ? (
          <TimelineSkeleton />
        ) : sections.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card p-6 text-center">
            <p className="text-2xl" aria-hidden>
              🌅
            </p>
            <p className="font-heading mt-2 text-sm font-semibold text-dark">No happy hours found</p>
            {hasActiveFilters ? (
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                Try clearing some filters.
              </p>
            ) : null}
            {hasActiveFilters ? (
              <button
                type="button"
                onClick={clearAllFilters}
                className="btn-gradient mt-4 rounded-full px-4 py-1.5 text-xs font-medium"
              >
                Clear filters
              </button>
            ) : null}
          </div>
        ) : (
          <div className="hh-timeline">
            {sections.map((section, index) => (
              <TimelineSectionBlock
                key={section.id}
                section={section}
                nowLabel={section.id === 'happening_now' && isLiveDay ? nowLabel : null}
                isLiveDay={isLiveDay}
                selectedVenueId={selectedVenueId}
                hoveredVenueId={hoveredVenueId}
                isLast={index === sections.length - 1}
                onSelectVenue={onSelectVenue}
                onHoverVenue={onHoverVenue}
              />
            ))}
          </div>
        )}
      </div>
    </aside>
  )
}
