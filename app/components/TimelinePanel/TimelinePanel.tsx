import type { EventTimelineSection } from '@/hooks/useEventTimeline'
import type { TimelineSection } from '@/hooks/useHappyHourTimeline'
import type { DiscoveryContentType, UseDiscoveryFiltersResult } from '@/hooks/useDiscoveryFilters'

import { TimelineEmptyVenueSuggest } from '@/components/TimelineEmptyVenueSuggest/TimelineEmptyVenueSuggest'

import { EventTimelineList } from './EventTimelineList'
import { TimelineSectionBlock } from './TimelineSectionBlock'
import { TimelineSkeleton } from './TimelineSkeleton'

export interface TimelinePanelProps {
  contentType: DiscoveryContentType
  citySlug: string
  venueSections: TimelineSection[]
  eventSections: EventTimelineSection[]
  isLiveDay: boolean
  loading: boolean
  selectedVenueId: string | null
  hoveredVenueId: string | null
  selectedEventId: string | null
  hoveredEventId: string | null
  filters: UseDiscoveryFiltersResult
  onSelectVenue: (venueId: string) => void
  onHoverVenue: (venueId: string | null) => void
  onSelectEvent: (eventId: string, venueId: string) => void
  onHoverEvent: (eventId: string | null, venueId: string | null) => void
  nowLabel: string
}

function emptyMessage(contentType: DiscoveryContentType): string {
  if (contentType === 'events') {
    return 'No events found'
  }
  return 'No happy hours found'
}

export function TimelinePanel({
  contentType,
  citySlug,
  venueSections,
  eventSections,
  isLiveDay,
  loading,
  selectedVenueId,
  hoveredVenueId,
  selectedEventId,
  hoveredEventId,
  filters,
  onSelectVenue,
  onHoverVenue,
  onSelectEvent,
  onHoverEvent,
  nowLabel,
}: TimelinePanelProps) {
  const { hasActiveFilters, clearAllFilters } = filters
  const isEventsMode = contentType === 'events'
  const hasVenueSections = !isEventsMode && venueSections.length > 0
  const hasEventEntries = isEventsMode && eventSections.some((section) => section.entries.length > 0)
  const isEmpty = isEventsMode ? !hasEventEntries : !hasVenueSections

  return (
    <aside className="discovery-shell__timeline flex h-full min-h-0 flex-col bg-background">
      <div className="min-h-0 flex-1 overflow-y-auto scroll-smooth px-3 py-4">
        {loading ? (
          <TimelineSkeleton />
        ) : isEmpty ? (
          isEventsMode ? (
            <div className="rounded-xl border border-dashed border-border bg-card p-6 text-center">
              <p className="text-2xl" aria-hidden>
                🎟️
              </p>
              <p className="font-heading mt-2 text-sm font-semibold text-dark">
                {emptyMessage(contentType)}
              </p>
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
            <TimelineEmptyVenueSuggest
              citySlug={citySlug}
              hasActiveFilters={hasActiveFilters}
              onClearFilters={clearAllFilters}
            />
          )
        ) : isEventsMode ? (
          <EventTimelineList
            sections={eventSections}
            selectedEventId={selectedEventId}
            hoveredEventId={hoveredEventId}
            onSelectEvent={onSelectEvent}
            onHoverEvent={onHoverEvent}
          />
        ) : (
          <div className="hh-timeline">
            {venueSections.map((section, index) => (
              <TimelineSectionBlock
                key={`venue-${section.id}`}
                section={section}
                nowLabel={section.id === 'happening_now' && isLiveDay ? nowLabel : null}
                isLiveDay={isLiveDay}
                selectedVenueId={selectedVenueId}
                hoveredVenueId={hoveredVenueId}
                isLast={index === venueSections.length - 1}
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
