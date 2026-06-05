import type { DiscoveryFiltersState, PriceFilter, StatusFilter } from '@/hooks/useDiscoveryFilters'
import type { VenueDetail } from '@/types/venue'
import {
  getDayOfWeekInTimezone,
  getSlotsForDay,
  getVenueTimelinePlacementForViewDay,
  isViewingToday,
  resolveViewDayForSlots,
  slotMatchesDealFilter,
  slotMatchesTimeAt,
} from '@/utils/happyHour'
import { venueMatchesVenueType } from '@/utils/venueType'

function venueMatchesSearch(venue: VenueDetail, query: string): boolean {
  const slotSummaries = venue.happy_hour_slots
    .map((slot) => slot.deal_summary)
    .filter(Boolean)
    .join(' ')
  const haystack = [venue.name, venue.description, venue.address_line1, slotSummaries]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
  return haystack.includes(query)
}

function venueMatchesDeals(
  venue: VenueDetail,
  deals: DiscoveryFiltersState['deals'],
  viewDay: DiscoveryFiltersState['viewDay'],
  now: Date,
): boolean {
  if (deals.length === 0) {
    return true
  }
  const timeZone = venue.city.timezone
  const targetDay = resolveViewDayForSlots(viewDay, now, timeZone)
  const daySlots = getSlotsForDay(venue.happy_hour_slots, targetDay)
  return deals.some((deal) => daySlots.some((slot) => slotMatchesDealFilter(slot, deal)))
}

function venueMatchesPriceLevels(
  venue: VenueDetail,
  priceLevels: PriceFilter[],
): boolean {
  if (priceLevels.length === 0) {
    return true
  }

  return priceLevels.includes(venue.price_level)
}

function venueHasSlotMatchingTime(
  venue: VenueDetail,
  viewDay: DiscoveryFiltersState['viewDay'],
  timeAtMinutes: number,
  now: Date,
): boolean {
  const timeZone = venue.city.timezone
  const targetDay = resolveViewDayForSlots(viewDay, now, timeZone)
  const daySlots = getSlotsForDay(venue.happy_hour_slots, targetDay)
  return daySlots.some((slot) => slotMatchesTimeAt(slot, timeAtMinutes))
}

/** When false, only venues with an active happy hour (happening now) appear — plus search matches. */
export function discoveryFiltersExpandVisibility(filters: DiscoveryFiltersState): boolean {
  return (
    filters.search.trim().length > 0 ||
    filters.viewDay !== 'any' ||
    filters.timeAtMinutes !== null ||
    filters.statusFilters.includes('starting_soon') ||
    filters.deals.length > 0 ||
    filters.venueTypes.length > 0 ||
    filters.priceLevels.length > 0
  )
}

export function sectionAllowedForStatusFilters(
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

export function venueMatchesDiscoveryFilters(
  venue: VenueDetail,
  filters: DiscoveryFiltersState,
  now: Date,
): boolean {
  const search = filters.search.trim().toLowerCase()
  if (search && !venueMatchesSearch(venue, search)) {
    return false
  }
  if (!venueMatchesVenueType(venue, filters.venueTypes)) {
    return false
  }
  if (!venueMatchesDeals(venue, filters.deals, filters.viewDay, now)) {
    return false
  }
  if (!venueMatchesPriceLevels(venue, filters.priceLevels)) {
    return false
  }

  if (filters.timeAtMinutes !== null) {
    return venueHasSlotMatchingTime(venue, filters.viewDay, filters.timeAtMinutes, now)
  }

  if (search) {
    return true
  }

  const timeZone = venue.city.timezone
  const today = getDayOfWeekInTimezone(now, timeZone)
  const isLiveDay = isViewingToday(filters.viewDay, today)
  const happeningNowActive = filters.statusFilters.includes('happening_now')
  const viewDayForPlacement = happeningNowActive ? 'any' : filters.viewDay

  const placement = getVenueTimelinePlacementForViewDay(
    venue.happy_hour_slots,
    viewDayForPlacement,
    now,
    timeZone,
  )
  if (!placement) {
    return false
  }

  if (placement.sectionId === 'happening_now') {
    return true
  }

  if (!discoveryFiltersExpandVisibility(filters)) {
    return false
  }

  if (isLiveDay && filters.statusFilters.length > 0) {
    return sectionAllowedForStatusFilters(placement.sectionId, filters.statusFilters)
  }

  return true
}

export function countVenuesMatchingFilters(
  venues: VenueDetail[],
  filters: DiscoveryFiltersState,
  now: Date,
): number {
  return venues.filter((venue) => venueMatchesDiscoveryFilters(venue, filters, now)).length
}

export function formatMinutesLabel(totalMinutes: number): string {
  const hours24 = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  const period = hours24 >= 12 ? 'PM' : 'AM'
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12
  if (minutes === 0) {
    return `${hours12} ${period}`
  }
  return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`
}

export function getTimeFilterButtonLabel(timeAtMinutes: number | null): string {
  if (timeAtMinutes === null) {
    return 'Any time'
  }
  return formatMinutesLabel(timeAtMinutes)
}
