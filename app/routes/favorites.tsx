import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { ArrowLeft, Clock, Heart, Loader2, MapPin } from 'lucide-react'
import { useEffect, useMemo } from 'react'

import { AccountMenu } from '@/components/AccountMenu/AccountMenu'
import { VenueFavoriteButton } from '@/components/VenueFavoriteButton/VenueFavoriteButton'
import { VenuePriceLevel } from '@/components/VenuePriceLevel/VenuePriceLevel'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/useAuth'
import { useFavorites } from '@/hooks/useFavorites'
import { useProfileOnboarding } from '@/hooks/useProfileOnboarding'
import { useVenues } from '@/hooks/useVenues'
import type { VenueDetail } from '@/types/venue'
import { formatHappyHourWindow, getHappyHourStatus } from '@/utils/happyHour'
import { getVenueDisplaySubtitle } from '@/utils/venueDisplay'
import { cn } from '@/utils'

export const Route = createFileRoute('/favorites')({
  ssr: false,
  component: FavoritesPage,
})

function FavoritesPage() {
  const navigate = useNavigate()
  const { user, loading: authLoading } = useAuth()
  const { needsOnboarding, loading: onboardingLoading } = useProfileOnboarding()
  const { favoriteVenueIds, loading: favoritesLoading } = useFavorites()
  const { venues, loading: venuesLoading } = useVenues({ citySlug: 'bend-or' })

  useEffect(() => {
    if (!authLoading && !user) {
      void navigate({ to: '/login', search: { redirect: '/favorites', mode: 'sign-in' } })
      return
    }

    if (!user || onboardingLoading) {
      return
    }

    if (needsOnboarding) {
      void navigate({ to: '/welcome', search: { redirect: '/favorites' } })
    }
  }, [authLoading, navigate, needsOnboarding, onboardingLoading, user])

  const favoriteVenues = useMemo((): VenueDetail[] => {
    const byId = new Map(venues.map((venue) => [venue.id, venue]))
    return favoriteVenueIds
      .map((venueId) => byId.get(venueId))
      .filter((venue): venue is VenueDetail => venue !== undefined)
  }, [favoriteVenueIds, venues])

  const loading = authLoading || favoritesLoading || venuesLoading

  if (!user && !authLoading) {
    return null
  }

  return (
    <main className="min-h-dvh bg-background pb-8">
      <header className="border-b border-border bg-card/80 px-4 py-4 backdrop-blur-sm">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <Button asChild variant="ghost" size="sm" className="-ml-2 gap-1">
              <Link to="/">
                <ArrowLeft className="size-4" />
                Map
              </Link>
            </Button>
            <h1 className="font-heading text-2xl font-bold text-dark">Favorites</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Happy hours you have saved in Bend.
            </p>
          </div>
          <AccountMenu />
        </div>
      </header>

      <section className="px-4 pt-6">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="size-6 animate-spin text-primary" />
          </div>
        ) : favoriteVenues.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center">
            <Heart className="mx-auto size-8 text-muted-foreground" aria-hidden />
            <p className="font-heading mt-3 text-base font-semibold text-dark">No favorites yet</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Tap the heart on a venue to save it here for quick access.
            </p>
            <Button asChild className="mt-4">
              <Link to="/">Browse happy hours</Link>
            </Button>
          </div>
        ) : (
          <ul className="space-y-3">
            {favoriteVenues.map((venue) => (
              <FavoriteVenueRow key={venue.id} venue={venue} />
            ))}
          </ul>
        )}
      </section>
    </main>
  )
}

interface FavoriteVenueRowProps {
  venue: VenueDetail
}

function FavoriteVenueRow({ venue }: FavoriteVenueRowProps) {
  const now = new Date()
  const status = getHappyHourStatus(venue.happy_hour_slots, now, venue.city.timezone)
  const subtitle = getVenueDisplaySubtitle(venue)
  const nextWindow = venue.happy_hour_slots[0]

  return (
    <li className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <Link
            to="/venues/$slug"
            params={{ slug: venue.slug }}
            className="block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
          >
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
              <p className="font-heading text-base font-bold text-dark">{venue.name}</p>
              <VenuePriceLevel level={venue.price_level} className="text-sm" />
            </div>
            <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">{subtitle}</p>
            <p
              className={cn(
                'mt-2 inline-flex items-center gap-1.5 text-xs font-medium',
                status.kind === 'active' ? 'text-primary' : 'text-muted-foreground',
              )}
            >
              <Clock className="size-3.5 shrink-0" aria-hidden />
              {status.label}
            </p>
            {nextWindow ? (
              <p className="mt-1 inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                <MapPin className="size-3.5 shrink-0 text-primary" aria-hidden />
                {formatHappyHourWindow({
                  start_time: nextWindow.start_time,
                  end_time: nextWindow.end_time,
                })}
              </p>
            ) : null}
          </Link>
        </div>
        <VenueFavoriteButton
          venueId={venue.id}
          redirectTo="/favorites"
          variant="header"
        />
      </div>
    </li>
  )
}
