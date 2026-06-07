import type { DiscoveryFiltersState } from '@/hooks/useDiscoveryFilters'
import type { EventDetail } from '@/types/event'
import { eventMatchesTimeAt, getEventTimelinePlacement, isEventOnViewDay } from '@/utils/eventTime'
import { venueMatchesVenueType } from '@/utils/venueType'
import { venueMatchesVibes } from '@/utils/vibe'
function eventMatchesSearch(event: EventDetail, query: string): boolean {
  const haystack = [
    event.title,
    event.description,
    event.venue.name,
    event.venue.address_line1,
    event.event_type.replace(/_/g, ' '),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
  return haystack.includes(query)
}

function eventVenueMatchesVibes(
  event: EventDetail,
  vibes: DiscoveryFiltersState['vibes'],
): boolean {
  if (vibes.length === 0) {
    return true
  }
  return venueMatchesVibes({ vibes: event.venue.vibes }, vibes)
}

function eventMatchesPriceLevels(
  event: EventDetail,
  priceLevels: DiscoveryFiltersState['priceLevels'],
): boolean {
  if (priceLevels.length === 0) {
    return true
  }
  return priceLevels.includes(event.venue.price_level)
}

function eventVenueMatchesType(
  event: EventDetail,
  venueTypes: DiscoveryFiltersState['venueTypes'],
): boolean {
  if (venueTypes.length === 0) {
    return true
  }
  return venueMatchesVenueType(
    { name: event.venue.name, description: null, venue_types: event.venue.venue_types },
    venueTypes,
  )
}

export function eventMatchesDiscoveryFilters(
  event: EventDetail,
  filters: DiscoveryFiltersState,
  now: Date,
): boolean {
  const search = filters.search.trim().toLowerCase()
  if (search && !eventMatchesSearch(event, search)) {
    return false
  }

  if (!eventVenueMatchesType(event, filters.venueTypes)) {
    return false
  }

  if (!eventVenueMatchesVibes(event, filters.vibes)) {
    return false
  }

  if (!eventMatchesPriceLevels(event, filters.priceLevels)) {
    return false
  }

  const timeZone = event.city.timezone

  if (filters.timeAtMinutes !== null) {
    return eventMatchesTimeAt(
      event,
      filters.viewDay,
      filters.timeAtMinutes,
      now,
      timeZone,
    )
  }

  if (search) {
    return true
  }

  const viewDay = filters.viewDay

  if (viewDay !== 'any' && !isEventOnViewDay(event, viewDay, now, timeZone)) {
    return false
  }

  const placement = getEventTimelinePlacement(event, viewDay, now, timeZone)

  return placement !== null
}
