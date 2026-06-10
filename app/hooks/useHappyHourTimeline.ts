import { useEffect, useMemo, useState } from 'react'

import type { DiscoveryFiltersState } from '@/hooks/useDiscoveryFilters'
import type { VenueDetail } from '@/types/venue'
import { distanceMiles, formatDistanceMiles } from '@/utils/geo'
import {
  getDayName,
  getDayOfWeekInTimezone,
  getDealSummaryForSlot,
  getVenueTimelinePlacementForTimeAt,
  getVenueTimelinePlacementForViewDay,
  isViewingToday,
} from '@/utils/happyHour'
import { venueMatchesDiscoveryFilters } from '@/utils/discoveryFilters'

export interface TimelineVenueEntry {
  venue: VenueDetail
  distanceLabel: string
  hhWindow: string
  dealSummary: string
  badgeTone: 'open' | 'soon' | 'scheduled'
  badgeLabel: string
  emphasis: boolean
}

export interface TimelineSection {
  id: string
  title: string
  sortKey: number
  emphasis: boolean
  entries: TimelineVenueEntry[]
}

export interface UseHappyHourTimelineOptions {
  venues: VenueDetail[]
  filters: DiscoveryFiltersState
  origin?: { latitude: number; longitude: number } | null
}

export interface UseHappyHourTimelineResult {
  sections: TimelineSection[]
  nowLabel: string
  viewDayLabel: string
  isLiveDay: boolean
  filteredVenues: VenueDetail[]
}

export function useHappyHourTimeline(
  options: UseHappyHourTimelineOptions,
): UseHappyHourTimelineResult {
  const { venues, filters, origin } = options
  const [now, setNow] = useState(() => new Date())

  const timeZone = venues[0]?.city.timezone ?? 'America/Los_Angeles'
  const today = getDayOfWeekInTimezone(now, timeZone)
  const isLiveDay = isViewingToday(filters.viewDay, today)

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

  const viewDayLabel = useMemo(() => {
    if (filters.viewDay === 'any') {
      return 'Today'
    }
    return getDayName(filters.viewDay)
  }, [filters.viewDay])

  const filteredVenues = useMemo(
    () => venues.filter((venue) => venueMatchesDiscoveryFilters(venue, filters, now)),
    [venues, filters, now],
  )

  const searchQuery = filters.search.trim()
  const sections = useMemo(() => {
    const sectionMap = new Map<string, TimelineSection>()
    const fallbackEntries: TimelineVenueEntry[] = []

    for (const venue of filteredVenues) {
      const placement =
        filters.timeAtMinutes !== null
          ? getVenueTimelinePlacementForTimeAt(
              venue.happy_hour_slots,
              filters.viewDay,
              filters.timeAtMinutes,
              now,
              venue.city.timezone,
            )
          : getVenueTimelinePlacementForViewDay(
              venue.happy_hour_slots,
              filters.viewDay,
              now,
              venue.city.timezone,
            )

      const distanceLabel =
        origin != null
          ? formatDistanceMiles(
              distanceMiles(origin.latitude, origin.longitude, venue.lat, venue.lng),
            )
          : '—'

      if (!placement) {
        if (searchQuery || filters.viewDay === 'any') {
          fallbackEntries.push({
            venue,
            distanceLabel,
            hhWindow: '',
            dealSummary:
              venue.happy_hour_slots.length > 0
                ? getDealSummaryForSlot(venue.happy_hour_slots, venue.happy_hour_slots[0])
                : '',
            badgeTone: 'scheduled',
            badgeLabel: searchQuery ? 'Search match' : 'No happy hour today',
            emphasis: false,
          })
        }
        continue
      }

      const entry: TimelineVenueEntry = {
        venue,
        distanceLabel,
        hhWindow: placement.hhWindow,
        dealSummary: getDealSummaryForSlot(venue.happy_hour_slots, placement.focusSlot),
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

    if (fallbackEntries.length > 0) {
      fallbackEntries.sort((a, b) => a.venue.name.localeCompare(b.venue.name))
      const fallbackSection: TimelineSection = {
        id: searchQuery ? 'search_results' : 'more_venues',
        title: searchQuery ? 'Search results' : 'More venues',
        sortKey: searchQuery ? -1 : 100_000,
        emphasis: false,
        entries: fallbackEntries,
      }
      if (searchQuery) {
        sorted.unshift(fallbackSection)
      } else {
        sorted.push(fallbackSection)
      }
    }

    for (const section of sorted) {
      section.entries.sort((a, b) => {
        if (a.emphasis !== b.emphasis) {
          return a.emphasis ? -1 : 1
        }
        return a.venue.name.localeCompare(b.venue.name)
      })
    }

    return sorted
  }, [filteredVenues, filters, now, origin, isLiveDay, searchQuery])

  return { sections, nowLabel, viewDayLabel, isLiveDay, filteredVenues }
}
