import type { TimelineSection } from '@/hooks/useHappyHourTimeline'
import { VenueTimelineCard } from '@/components/VenueTimelineCard/VenueTimelineCard'
import { cn } from '@/utils'

export type TimelineSectionDotTone = 'now' | 'soon' | 'time' | 'later'

export function getTimelineSectionDotTone(sectionId: string): TimelineSectionDotTone {
  if (sectionId === 'happening_now') {
    return 'now'
  }
  if (sectionId === 'starting_soon') {
    return 'soon'
  }
  if (sectionId === 'later_tonight') {
    return 'later'
  }
  return 'time'
}

function formatSectionHeading(section: TimelineSection, nowLabel: string | null): string {
  if (section.id === 'happening_now' && nowLabel) {
    return `NOW · ${nowLabel}`
  }
  if (section.id === 'starting_soon') {
    return 'STARTING SOON'
  }
  if (section.id === 'later_tonight') {
    return 'LATER TONIGHT'
  }
  return section.title.toUpperCase()
}

export interface TimelineSectionBlockProps {
  section: TimelineSection
  nowLabel: string | null
  isLiveDay: boolean
  selectedVenueId: string | null
  hoveredVenueId: string | null
  isLast: boolean
  onSelectVenue: (venueId: string) => void
  onHoverVenue: (venueId: string | null) => void
}

export function TimelineSectionBlock({
  section,
  nowLabel,
  isLiveDay,
  selectedVenueId,
  hoveredVenueId,
  isLast,
  onSelectVenue,
  onHoverVenue,
}: TimelineSectionBlockProps) {
  const dotTone = getTimelineSectionDotTone(section.id)
  const heading = formatSectionHeading(section, nowLabel)

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
          <VenueTimelineCard
            key={entry.venue.id}
            entry={entry}
            isLiveDay={isLiveDay}
            selected={selectedVenueId === entry.venue.id}
            hovered={hoveredVenueId === entry.venue.id}
            onSelect={() => onSelectVenue(entry.venue.id)}
            onHover={() => onHoverVenue(entry.venue.id)}
            onHoverEnd={() => onHoverVenue(null)}
          />
        ))}
      </div>
    </section>
  )
}
