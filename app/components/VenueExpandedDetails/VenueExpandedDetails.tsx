import { Clock, ExternalLink } from 'lucide-react'

import { Button } from '@/components/ui/button'
import type { VenueDetail } from '@/types/venue'
import { formatTime12h } from '@/utils/happyHour'
import { getVenueMenuLines } from '@/utils/venueMenu'
import { formatVenueWebsiteUrl } from '@/utils/venueLinks'
import { cn } from '@/utils'

const DAY_LABELS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export interface VenueExpandedDetailsProps {
  venue: VenueDetail
  className?: string
}

export function VenueExpandedDetails({ venue, className }: VenueExpandedDetailsProps) {
  const menuLines = getVenueMenuLines(venue)
  const websiteUrl = venue.website_url?.trim() ? formatVenueWebsiteUrl(venue.website_url) : null

  return (
    <div className={cn('venue-expanded-details space-y-4', className)}>
      <section>
        <h3 className="font-heading text-xs font-bold tracking-wide text-dark uppercase">Menu</h3>
        {menuLines.length > 0 ? (
          <ul className="mt-2 space-y-1.5 text-sm text-muted-foreground">
            {menuLines.map((line) => (
              <li key={line.id} className="leading-snug">
                <span className="text-foreground">{line.label}</span>
                {line.priceText ? (
                  <span className="text-secondary"> · {line.priceText}</span>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">No specials listed yet.</p>
        )}
      </section>

      <section>
        <h3 className="font-heading text-xs font-bold tracking-wide text-dark uppercase">
          Happy hour schedule
        </h3>
        <ul className="mt-2 space-y-3">
          {DAY_LABELS.map((dayLabel, dayIndex) => {
            const daySlots = venue.happy_hour_slots.filter((slot) => slot.day_of_week === dayIndex)
            if (daySlots.length === 0) {
              return null
            }

            return (
              <li key={dayLabel}>
                <p className="text-sm font-medium text-dark">{dayLabel}</p>
                <ul className="mt-1 space-y-2">
                  {daySlots.map((slot) => (
                    <li key={slot.id} className="text-sm text-muted-foreground">
                      <p className="inline-flex items-center gap-1.5 font-medium text-foreground">
                        <Clock className="size-3.5 shrink-0 text-primary" aria-hidden />
                        {formatTime12h(slot.start_time)} – {formatTime12h(slot.end_time)}
                      </p>
                      {slot.deal_summary ? (
                        <p className="mt-0.5 pl-5 leading-snug">{slot.deal_summary}</p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </li>
            )
          })}
        </ul>
      </section>

      {websiteUrl ? (
        <Button asChild variant="outline" className="h-10 w-full gap-2 text-sm" size="sm">
          <a href={websiteUrl} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="size-4 shrink-0" aria-hidden />
            Website
          </a>
        </Button>
      ) : null}
    </div>
  )
}
