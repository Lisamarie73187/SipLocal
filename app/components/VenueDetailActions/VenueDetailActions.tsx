import { ExternalLink, Navigation, Phone } from 'lucide-react'

import { Button } from '@/components/ui/button'
import type { VenueDetail } from '@/types/venue'
import {
  formatVenueWebsiteUrl,
  getVenueDirectionsUrl,
  getVenuePhoneUrl,
} from '@/utils/venueLinks'
import { cn } from '@/utils'

export interface VenueDetailActionsProps {
  venue: Pick<VenueDetail, 'lat' | 'lng' | 'name' | 'address_line1' | 'phone' | 'website_url'>
  className?: string
}

export function VenueDetailActions({ venue, className }: VenueDetailActionsProps) {
  const phone = venue.phone?.trim() || null
  const websiteUrl = venue.website_url?.trim() ? formatVenueWebsiteUrl(venue.website_url) : null

  return (
    <div className={cn('grid grid-cols-1 gap-2 sm:grid-cols-3', className)}>
      <Button asChild variant="outline" size="lg" className="h-11 w-full gap-2">
        <a
          href={getVenueDirectionsUrl(venue)}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Get directions to ${venue.name}`}
        >
          <Navigation className="size-4 shrink-0" aria-hidden />
          Directions
        </a>
      </Button>
      {phone ? (
        <Button asChild variant="outline" size="lg" className="h-11 w-full gap-2">
          <a href={getVenuePhoneUrl(phone)} aria-label={`Call ${venue.name}`}>
            <Phone className="size-4 shrink-0" aria-hidden />
            Call
          </a>
        </Button>
      ) : null}
      {websiteUrl ? (
        <Button asChild variant="outline" size="lg" className="h-11 w-full gap-2">
          <a
            href={websiteUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Visit ${venue.name} website`}
          >
            <ExternalLink className="size-4 shrink-0" aria-hidden />
            Website
          </a>
        </Button>
      ) : null}
    </div>
  )
}
