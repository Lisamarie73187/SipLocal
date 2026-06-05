import type { Database } from '@/types/database'

type VenueDataStatus = Database['public']['Enums']['venue_data_status']

/**
 * Keeps venue status aligned with whether happy hour rows exist.
 * "no_happy_hour_found" is only valid when there are zero slots.
 */
export function reconcileVenueDataStatus(
  requested: VenueDataStatus,
  slotCount: number,
): VenueDataStatus {
  if (slotCount > 0 && requested === 'no_happy_hour_found') {
    return 'pending_review'
  }
  if (slotCount > 0 && requested === 'discovered') {
    return 'pending_review'
  }
  return requested
}

export function validateVenueBeforeSave(
  requested: VenueDataStatus,
  slotCount: number,
  isPublished: boolean,
): string | null {
  if (requested === 'live' && slotCount === 0) {
    return 'Add at least one happy hour slot before setting status to Live.'
  }
  if (isPublished && slotCount === 0) {
    return 'Add at least one happy hour slot before publishing on the map.'
  }
  if (isPublished && requested !== 'live') {
    return 'Set data status to Live before publishing on the map.'
  }
  return null
}

export function venueStatusMismatch(
  dataStatus: string,
  slotCount: number,
): string | null {
  if (dataStatus === 'no_happy_hour_found' && slotCount > 0) {
    return 'Has happy hour slots saved, but status says no happy hour found. Edit the venue and set status to Pending review or Live, or remove the slots.'
  }
  if (dataStatus === 'live' && slotCount === 0) {
    return 'Status is Live but there are no happy hour slots — the map will not show deals for this place.'
  }
  return null
}
