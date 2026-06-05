import type { EventTimelineSection } from '@/hooks/useEventTimeline'
import { EventTimelineCard } from '@/components/EventTimelineCard/EventTimelineCard'
import {
  getTimelineSectionDotTone,
  type TimelineSectionDotTone,
} from './TimelineSectionBlock'
import { cn } from '@/utils'

function formatEventSectionHeading(section: EventTimelineSection, nowLabel: string | null): string {
  if (section.id === 'happening_now' && nowLabel) {
    return `NOW · ${nowLabel}`
  }
  if (section.id === 'starting_soon') {
    return 'STARTING SOON'
  }
  if (section.id === 'later_tonight') {
    return 'LATER TONIGHT'
  }
  if (section.id === 'upcoming') {
    return 'UPCOMING'
  }
  return section.title.toUpperCase()
}

export interface EventTimelineSectionBlockProps {
  section: EventTimelineSection
  nowLabel: string | null
  isLiveDay: boolean
  selectedEventId: string | null
  hoveredEventId: string | null
  isLast: boolean
  onSelectEvent: (eventId: string, venueId: string) => void
  onHoverEvent: (eventId: string | null, venueId: string | null) => void
}

export function EventTimelineSectionBlock({
  section,
  nowLabel,
  isLiveDay,
  selectedEventId,
  hoveredEventId,
  isLast,
  onSelectEvent,
  onHoverEvent,
}: EventTimelineSectionBlockProps) {
  const dotTone: TimelineSectionDotTone = getTimelineSectionDotTone(section.id)
  const heading = formatEventSectionHeading(section, nowLabel)

  return (
    <section
      className={cn('hh-timeline__block', isLast && 'hh-timeline__block--last')}
      aria-label={section.title}
    >
      <div className="hh-timeline__marker" aria-hidden>
        <span className={cn('hh-timeline__dot', `hh-timeline__dot--${dotTone}`)} />
      </div>

      <div className="hh-timeline__heading min-w-0">
        <h2
          className={cn(
            'min-h-[1.125rem] font-heading text-xs font-bold leading-[1.125rem] tracking-wider uppercase',
            dotTone === 'now' && 'text-[var(--color-map-happening-now)]',
            dotTone === 'soon' && 'text-dark',
            dotTone === 'later' && 'text-[var(--color-map-later-tonight)]',
          )}
        >
          {heading}
        </h2>
      </div>

      <div className="hh-timeline__entries min-w-0 space-y-3">
        {section.entries.map((entry) => (
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
    </section>
  )
}
