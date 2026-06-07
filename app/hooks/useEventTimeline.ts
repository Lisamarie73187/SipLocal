import { useEffect, useMemo, useState } from 'react'

import type { DiscoveryFiltersState } from '@/hooks/useDiscoveryFilters'
import type { EventDetail } from '@/types/event'
import { distanceMiles, formatDistanceMiles } from '@/utils/geo'
import { eventMatchesDiscoveryFilters } from '@/utils/eventDiscoveryFilters'
import {
  getEventTimelinePlacement,
  isViewingTodayForEvents,
} from '@/utils/eventTime'
export interface TimelineEventEntry {
  event: EventDetail
  distanceLabel: string
  timeWindow: string
  badgeTone: 'open' | 'soon' | 'scheduled'
  badgeLabel: string
  emphasis: boolean
}

export interface EventTimelineSection {
  id: string
  title: string
  sortKey: number
  emphasis: boolean
  entries: TimelineEventEntry[]
}

export interface UseEventTimelineOptions {
  events: EventDetail[]
  filters: DiscoveryFiltersState
  origin?: { latitude: number; longitude: number } | null
}

export interface UseEventTimelineResult {
  sections: EventTimelineSection[]
  nowLabel: string
  isLiveDay: boolean
  filteredEvents: EventDetail[]
}

export function useEventTimeline(options: UseEventTimelineOptions): UseEventTimelineResult {
  const { events, filters, origin } = options
  const [now, setNow] = useState(() => new Date())

  const timeZone = events[0]?.city.timezone ?? 'America/Los_Angeles'
  const isLiveDay = isViewingTodayForEvents(filters.viewDay, now, timeZone)

  useEffect(() => {
    if (!isLiveDay) {
      return
    }
    const interval = window.setInterval(() => setNow(new Date()), 60_000)
    return () => window.clearInterval(interval)
  }, [isLiveDay])

  const nowLabel = useMemo(() => {
    return new Intl.DateTimeFormat('en-US', {
      timeZone,
      hour: 'numeric',
      minute: '2-digit',
    }).format(now)
  }, [now, timeZone])

  const filteredEvents = useMemo(
    () => events.filter((event) => eventMatchesDiscoveryFilters(event, filters, now)),
    [events, filters, now],
  )

  const searchQuery = filters.search.trim()

  const sections = useMemo(() => {
    const sectionMap = new Map<string, EventTimelineSection>()
    const searchOnlyEntries: TimelineEventEntry[] = []

    for (const event of filteredEvents) {
      const placement = getEventTimelinePlacement(event, filters.viewDay, now, timeZone)

      const distanceLabel =
        origin != null
          ? formatDistanceMiles(
              distanceMiles(
                origin.latitude,
                origin.longitude,
                event.venue.lat,
                event.venue.lng,
              ),
            )
          : '—'

      if (!placement) {
        if (searchQuery) {
          searchOnlyEntries.push({
            event,
            distanceLabel,
            timeWindow: '',
            badgeTone: 'scheduled',
            badgeLabel: 'Search match',
            emphasis: false,
          })
        }
        continue
      }

      const entry: TimelineEventEntry = {
        event,
        distanceLabel,
        timeWindow: placement.timeWindow,
        badgeTone: placement.badgeTone,
        badgeLabel: placement.badgeLabel,
        emphasis: isLiveDay && placement.sectionId === 'happening_now',
      }

      const existing = sectionMap.get(placement.sectionId)
      if (existing) {
        existing.entries.push(entry)
      } else {
        sectionMap.set(placement.sectionId, {
          id: placement.sectionId,
          title: placement.sectionTitle,
          sortKey: placement.sectionSortKey,
          emphasis: isLiveDay && placement.sectionId === 'happening_now',
          entries: [entry],
        })
      }
    }

    const sorted = [...sectionMap.values()].sort((a, b) => a.sortKey - b.sortKey)

    if (searchOnlyEntries.length > 0) {
      searchOnlyEntries.sort((a, b) => a.event.title.localeCompare(b.event.title))
      sorted.unshift({
        id: 'search_results',
        title: 'Search results',
        sortKey: -1,
        emphasis: false,
        entries: searchOnlyEntries,
      })
    }

    for (const section of sorted) {
      section.entries.sort((a, b) => {
        if (a.emphasis !== b.emphasis) {
          return a.emphasis ? -1 : 1
        }
        return a.event.title.localeCompare(b.event.title)
      })
    }

    return sorted
  }, [filteredEvents, filters, now, origin, isLiveDay, searchQuery, timeZone])

  return {
    sections,
    nowLabel,
    isLiveDay,
    filteredEvents,
  }
}
