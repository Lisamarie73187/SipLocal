import { Navigation } from 'lucide-react'

import type { VenueDetail } from '@/types/venue'
import { getVenueDirectionsUrl } from '@/utils/venueLinks'
import { cn } from '@/utils'

export interface VenueMapOverlayDirectionsProps {
  venue: Pick<VenueDetail, 'lat' | 'lng' | 'name' | 'address_line1'>
  className?: string
}

export function VenueMapOverlayDirections({ venue, className }: VenueMapOverlayDirectionsProps) {
  return (
    <a
      href={getVenueDirectionsUrl(venue)}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        'mt-4 inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-primary underline-offset-2 hover:underline',
        className,
      )}
    >
      <Navigation className="size-3.5 shrink-0" aria-hidden />
      Get directions
    </a>
  )
}
