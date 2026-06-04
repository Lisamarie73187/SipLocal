import Supercluster from 'supercluster'

import type { DayOfWeek, VenueDetail } from '@/types/venue'

import { getVenueMapPinStatus, highestMapPinStatus, type MapPinStatus } from './happyHour'

export function resolveMapPinStatus(
  slots: VenueDetail['happy_hour_slots'],
  now: Date,
  timeZone: string,
  viewDay: 'any' | DayOfWeek = 'any',
): Exclude<MapPinStatus, 'none'> {
  const pinStatus = getVenueMapPinStatus(slots, now, timeZone, viewDay)
  if (pinStatus === 'none') {
    return 'later_tonight'
  }
  return pinStatus
}

export interface VenueMapPointProperties {
  venueId: string
  pinStatus: MapPinStatus
}

export type VenueMapClusterIndex = Supercluster<VenueMapPointProperties>

export function buildVenueClusterIndex(
  venues: VenueDetail[],
  now: Date,
  viewDay: 'any' | DayOfWeek = 'any',
): VenueMapClusterIndex {
  const features = venues
    .map((venue) => {
      const pinStatus = resolveMapPinStatus(
        venue.happy_hour_slots,
        now,
        venue.city.timezone,
        viewDay,
      )

      return {
        type: 'Feature' as const,
        properties: {
          venueId: venue.id,
          pinStatus,
        },
        geometry: {
          type: 'Point' as const,
          coordinates: [venue.lng, venue.lat] as [number, number],
        },
      }
    })
    .filter((feature) => feature != null)

  const index = new Supercluster<VenueMapPointProperties>({
    radius: 52,
    maxZoom: 15,
    minZoom: 0,
  })

  index.load(features)
  return index
}

export function getClusterPinStatus(
  index: VenueMapClusterIndex,
  clusterId: number,
): MapPinStatus {
  const leaves = index.getLeaves(clusterId, Infinity)
  return highestMapPinStatus(leaves.map((leaf) => leaf.properties.pinStatus))
}
