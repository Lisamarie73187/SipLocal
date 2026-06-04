import type { VenueDetail } from '@/types/venue'

export function getVenueDirectionsUrl(
  venue: Pick<VenueDetail, 'lat' | 'lng' | 'name' | 'address_line1'>,
): string {
  const coords = `${venue.lat},${venue.lng}`
  const query = encodeURIComponent(`${venue.name}, ${venue.address_line1}`)
  return `https://www.google.com/maps/dir/?api=1&destination=${coords}&destination_address=${query}&travelmode=walking`
}

export function formatVenueWebsiteUrl(url: string): string {
  const trimmed = url.trim()
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed
  }
  return `https://${trimmed}`
}
