import type { VenueDetail } from '@/types/venue'
import { getVenueTypeLabel, resolveVenueType } from '@/utils/venueType'

/** Subtitle under the venue name in discovery UI (map panel, timeline). */
export function getVenueDisplaySubtitle(venue: VenueDetail): string {
  const description = venue.description?.trim()
  if (description && !description.startsWith('Scrape note:')) {
    return description
  }

  const type = resolveVenueType(venue)
  if (type) {
    return getVenueTypeLabel(type)
  }

  return 'Happy hour spot'
}
