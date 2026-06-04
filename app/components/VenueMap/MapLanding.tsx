import { useMap } from '@/hooks/useMap'
import { useVenues } from '@/hooks/useVenues'

import { VenueMap } from './VenueMap'

function MapLandingContent() {
  const { venues, loading, error, refetch } = useVenues({ citySlug: 'bend-or' })
  const map = useMap()

  if (error) {
    return (
      <div className="flex h-dvh flex-col items-center justify-center gap-4 bg-background px-6 text-center">
        <p className="font-heading text-lg font-semibold text-dark">Couldn&apos;t load venues</p>
        <p className="text-sm text-muted-foreground">{error.message}</p>
        <button
          type="button"
          onClick={() => void refetch()}
          className="btn-gradient rounded-md px-4 py-2 text-sm font-medium"
        >
          Try again
        </button>
      </div>
    )
  }

  return <VenueMap venues={venues} map={map} loading={loading} />
}

export function MapLanding() {
  return <MapLandingContent />
}
