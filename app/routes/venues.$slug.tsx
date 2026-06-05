import { Link, createFileRoute } from '@tanstack/react-router'
import { ArrowLeft, Clock } from 'lucide-react'
import { useMemo } from 'react'

import { VenuePriceLevel } from '@/components/VenuePriceLevel/VenuePriceLevel'
import { VenueThumbnail } from '@/components/VenueThumbnail/VenueThumbnail'
import { Button } from '@/components/ui/button'
import { useVenues } from '@/hooks/useVenues'
import {
  formatHappyHourWindow,
  getHappyHourStatus,
  getVenueCategoryLabel,
  collectVenueCategories,
} from '@/utils/happyHour'
import { groupHappyHourSlotsForDisplay } from '@/utils/happyHourSchedule'
import { cn } from '@/utils'

export const Route = createFileRoute('/venues/$slug')({
  component: VenueDetailPage,
})

function VenueDetailPage() {
  const { slug } = Route.useParams()
  const { venues, loading, error } = useVenues({ citySlug: 'bend-or' })

  const venue = useMemo(() => venues.find((v) => v.slug === slug) ?? null, [venues, slug])
  const now = new Date()

  if (loading) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Loading venue…</p>
      </main>
    )
  }

  if (error || !venue) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-lg flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="font-heading text-xl font-bold text-dark">Venue not found</p>
        <Button asChild variant="outline">
          <Link to="/">Back to map</Link>
        </Button>
      </main>
    )
  }

  const timeZone = venue.city.timezone
  const status = getHappyHourStatus(venue.happy_hour_slots, now, timeZone)
  const category = getVenueCategoryLabel(collectVenueCategories(venue.happy_hour_slots))
  const scheduleGroups = groupHappyHourSlotsForDisplay(venue.happy_hour_slots)

  return (
    <main className="min-h-dvh bg-background pb-8">
      <VenueThumbnail
        imageUrl={venue.image_url}
        venueName={venue.name}
        className="h-48 w-full sm:h-56"
        emojiClassName="text-5xl"
      />
      <header className="border-b border-border bg-card/80 px-4 py-4 backdrop-blur-sm">
        <Button asChild variant="ghost" size="sm" className="-ml-2 gap-1">
          <Link to="/">
            <ArrowLeft className="size-4" />
            Map
          </Link>
        </Button>
        <p className="mt-2 text-xs font-semibold tracking-wide text-secondary uppercase">
          {category}
        </p>
        <div className="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <h1 className="font-heading text-2xl font-bold text-dark">{venue.name}</h1>
          <VenuePriceLevel level={venue.price_level} className="text-lg" />
        </div>
        <p className="mt-1 text-sm text-muted-foreground">{venue.address_line1}</p>
        <p
          className={cn(
            'mt-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium',
            status.kind === 'active' ? 'bg-primary/20 text-dark' : 'bg-muted text-muted-foreground',
          )}
        >
          <Clock className="size-4" />
          {status.label}
        </p>
      </header>

      <section className="px-4 pt-6">
        <h2 className="font-heading text-lg font-semibold text-dark">Happy hour schedule</h2>
        {scheduleGroups.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">No happy hour times listed yet.</p>
        ) : (
          <ul className="mt-4 space-y-4">
            {scheduleGroups.map((group) => (
              <li key={group.key} className="rounded-xl border border-border bg-card p-4">
                <p className="font-medium text-dark">{group.dayLabel}</p>
                <p className="mt-2 text-sm font-medium text-foreground">
                  {formatHappyHourWindow({
                    start_time: group.start_time,
                    end_time: group.end_time,
                  })}
                </p>
                {group.deal_summary ? (
                  <p className="mt-1 text-sm text-muted-foreground">{group.deal_summary}</p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  )
}
