import type { ViewDayFilter } from '@/hooks/useDiscoveryFilters'
import type { HappyHourSlot, VenueDetail } from '@/types/venue'

import {
  getDayOfWeekInTimezone,
  getVenueMapPinStatus,
  getVenueTimelinePlacementForViewDay,
  isViewingToday,
  resolveDisplayStatusBadgeLabel,
  type VenueTimelinePlacement,
} from '@/utils/happyHour'

export interface VenueOverlayStatus {
  placement: VenueTimelinePlacement | null
  pinStatus: ReturnType<typeof getVenueMapPinStatus>
  isLiveDay: boolean
  statusBadgeLabel: string | null
}

export function getVenueOverlayStatus(
  slots: HappyHourSlot[],
  viewDay: ViewDayFilter,
  now: Date,
  timeZone: string,
): VenueOverlayStatus {
  const today = getDayOfWeekInTimezone(now, timeZone)
  const isLiveDay = isViewingToday(viewDay, today)
  const placement = getVenueTimelinePlacementForViewDay(slots, viewDay, now, timeZone)
  const pinStatus = getVenueMapPinStatus(slots, now, timeZone, viewDay)

  return {
    placement,
    pinStatus,
    isLiveDay,
    statusBadgeLabel: resolveDisplayStatusBadgeLabel(placement?.badgeLabel, isLiveDay),
  }
}

export function getVenueOverlayStatusForVenue(
  venue: Pick<VenueDetail, 'happy_hour_slots' | 'city'>,
  viewDay: ViewDayFilter,
  now: Date,
): VenueOverlayStatus {
  return getVenueOverlayStatus(venue.happy_hour_slots, viewDay, now, venue.city.timezone)
}
