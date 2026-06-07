import type { VenueDetail } from '@/types/venue'
import { getVenueTypeLabel, resolveVenueTypes } from '@/utils/venueType'

/** Subtitle under the venue name in discovery UI (map panel, timeline). */
export function getVenueDisplaySubtitle(venue: VenueDetail): string {
  const description = venue.description?.trim()
  if (description && !description.startsWith('Scrape note:')) {
    return description
  }

  const [type] = resolveVenueTypes(venue)
  if (type) {
    return getVenueTypeLabel(type)
  }

  return 'Happy hour spot'
}

/** Raw description stored on the venue row (owner preview). */
export function getStoredVenueDescription(description: string | null | undefined): string | null {
  const trimmed = description?.trim()
  return trimmed || null
}

/** Subtitle for owner live-preview cards — same logic as the public map. */
export function getOwnerPreviewCardSubtitle(
  venue: Pick<VenueDetail, 'description' | 'name' | 'venue_types'>,
): string {
  return getVenueDisplaySubtitle(venue as VenueDetail)
}

/** Owner preview — show stored description, including cleaned scrape notes. */
export function getOwnerVenueDescriptionText(description: string | null | undefined): string | null {
  return getStoredVenueDescription(description)
}
