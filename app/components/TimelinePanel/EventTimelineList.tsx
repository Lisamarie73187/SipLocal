import { EventTimelineCard } from '@/components/EventTimelineCard/EventTimelineCard'
import type { EventTimelineSection } from '@/hooks/useEventTimeline'

export interface EventTimelineListProps {
  sections: EventTimelineSection[]
  selectedEventId: string | null
  hoveredEventId: string | null
  onSelectEvent: (eventId: string, venueId: string) => void
  onHoverEvent: (eventId: string | null, venueId: string | null) => void
}

export function EventTimelineList({
  sections,
  selectedEventId,
  hoveredEventId,
  onSelectEvent,
  onHoverEvent,
}: EventTimelineListProps) {
  const entries = sections.flatMap((section) => section.entries)

  return (
    <div className="event-timeline-list space-y-3">
      {entries.map((entry) => (
        <EventTimelineCard
          key={entry.event.id}
          entry={entry}
          selected={selectedEventId === entry.event.id}
          hovered={hoveredEventId === entry.event.id}
          onSelect={() => onSelectEvent(entry.event.id, entry.event.venue.id)}
          onHover={() => onHoverEvent(entry.event.id, entry.event.venue.id)}
          onHoverEnd={() => onHoverEvent(null, null)}
        />
      ))}
    </div>
  )
}
