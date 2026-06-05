import { Clock, ExternalLink } from 'lucide-react'

import { VenueTrustFooter } from '@/components/VenueTrustFooter/VenueTrustFooter'
import { Button } from '@/components/ui/button'
import type { VenueDetail } from '@/types/venue'
import type { VenueTrustMeta } from '@/utils/venueTrust'
import { formatHappyHourWindow } from '@/utils/happyHour'
import { groupHappyHourSlotsForDisplay } from '@/utils/happyHourSchedule'
import { formatVenueWebsiteUrl } from '@/utils/venueLinks'
import { cn } from '@/utils'

export interface VenueExpandedDetailsProps {
  venue: VenueDetail
  trustMeta?: VenueTrustMeta
  className?: string
}

export function VenueExpandedDetails({ venue, trustMeta, className }: VenueExpandedDetailsProps) {
  const websiteUrl = venue.website_url?.trim() ? formatVenueWebsiteUrl(venue.website_url) : null
  const scheduleGroups = groupHappyHourSlotsForDisplay(venue.happy_hour_slots)

  return (
    <div className={cn('venue-expanded-details space-y-4', className)}>
      <section>
        <h3 className="font-heading text-xs font-bold tracking-wide text-dark uppercase">
          Happy hour schedule
        </h3>
        {scheduleGroups.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">No happy hour times listed yet.</p>
        ) : (
          <ul className="mt-2 space-y-3">
            {scheduleGroups.map((group) => (
              <li key={group.key}>
                <p className="text-sm font-medium text-dark">{group.dayLabel}</p>
                <p className="mt-1 inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Clock className="size-3.5 shrink-0 text-primary" aria-hidden />
                  <span className="font-medium text-foreground">
                    {formatHappyHourWindow({
                      start_time: group.start_time,
                      end_time: group.end_time,
                    })}
                  </span>
                </p>
                {group.deal_summary ? (
                  <p className="mt-1 text-sm leading-snug text-muted-foreground">
                    {group.deal_summary}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      {trustMeta ? <VenueTrustFooter meta={trustMeta} /> : null}

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
