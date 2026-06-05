import type { DiscoveryFiltersState, StatusFilter } from '@/hooks/useDiscoveryFilters'
import type { EventDetail } from '@/types/event'
import {
  eventMatchesTimeAt,
  getEventTimelinePlacement,
  isEventOnViewDay,
  isViewingTodayForEvents,
} from '@/utils/eventTime'
import { venueMatchesVenueType } from '@/utils/venueType'
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
    { name: event.venue.name, description: null, venue_type: event.venue.venue_type },
    venueTypes,
  )
}

function sectionAllowedForEventStatus(
  sectionId: string,
  statusFilters: StatusFilter[],
): boolean {
  if (statusFilters.length === 0) {
    return true
  }
  if (sectionId === 'happening_now') {
    return statusFilters.includes('happening_now')
  }
  if (sectionId === 'starting_soon') {
    return statusFilters.includes('starting_soon')
  }
  return false
}

export function eventDiscoveryFiltersExpandVisibility(filters: DiscoveryFiltersState): boolean {
  return (
    filters.search.trim().length > 0 ||
    filters.viewDay !== 'any' ||
    filters.timeAtMinutes !== null ||
    filters.statusFilters.includes('starting_soon') ||
    filters.venueTypes.length > 0 ||
    filters.priceLevels.length > 0
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

  const isLiveDay = isViewingTodayForEvents(filters.viewDay, now, timeZone)
  const happeningNowActive = filters.statusFilters.includes('happening_now')
  const viewDay = happeningNowActive ? 'any' : filters.viewDay

  if (viewDay !== 'any' && !isEventOnViewDay(event, viewDay, now, timeZone)) {
    return false
  }

  const placement = getEventTimelinePlacement(event, viewDay, now, timeZone)

  if (!placement) {
    return false
  }

  if (!eventDiscoveryFiltersExpandVisibility(filters)) {
    return placement.sectionId === 'happening_now'
  }

  if (isLiveDay && filters.statusFilters.length > 0) {
    return sectionAllowedForEventStatus(placement.sectionId, filters.statusFilters)
  }

  return true
}
