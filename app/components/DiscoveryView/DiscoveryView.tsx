import { useCallback, useEffect, useMemo, useState } from 'react'

import { DiscoveryHeader } from '@/components/DiscoveryHeader/DiscoveryHeader'
import { TimelinePanel } from '@/components/TimelinePanel/TimelinePanel'
import { VenueMap } from '@/components/VenueMap/VenueMap'
import { useDiscoveryFilters } from '@/hooks/useDiscoveryFilters'
import { useHappyHourTimeline } from '@/hooks/useHappyHourTimeline'
import { useMap } from '@/hooks/useMap'
import { useVenues } from '@/hooks/useVenues'
import { distanceMiles, formatDistanceMiles } from '@/utils/geo'

export function DiscoveryView() {
  const { venues, loading, error, refetch } = useVenues({ citySlug: 'bend-or' })
  const map = useMap()
  const discoveryFilters = useDiscoveryFilters()
  const [hoveredVenueId, setHoveredVenueId] = useState<string | null>(null)

  const timeline = useHappyHourTimeline({
    venues,
    filters: discoveryFilters.applied,
    origin: map.viewport,
  })

  const cityName = venues[0]?.city.name ?? 'Bend, OR'

  const selectedDistanceLabel = useMemo(() => {
    const venue =
      timeline.filteredVenues.find((item) => item.id === map.selectedVenueId) ??
      venues.find((item) => item.id === map.selectedVenueId)
    if (!venue) {
      return undefined
    }
    return formatDistanceMiles(
      distanceMiles(map.viewport.latitude, map.viewport.longitude, venue.lat, venue.lng),
    )
  }, [map.selectedVenueId, map.viewport, timeline.filteredVenues, venues])

  const handleSelectVenue = useCallback(
    (venueId: string): void => {
      map.selectVenue(venueId)
      requestAnimationFrame(() => {
        document
          .querySelector(`[data-venue-id="${venueId}"]`)
          ?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
      })
    },
    [map],
  )

  const handleHoverVenue = useCallback((venueId: string | null): void => {
    setHoveredVenueId(venueId)
  }, [])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        if (discoveryFilters.isFiltersExpanded) {
          discoveryFilters.closeFiltersExpanded()
          return
        }
        map.clearSelection()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [map, discoveryFilters])

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

  return (
    <div className="discovery-page flex h-dvh flex-col overflow-hidden">
      <DiscoveryHeader
        cityName={cityName}
        filters={discoveryFilters}
        happeningNowCount={timeline.happeningNowCount}
        startingSoonCount={timeline.startingSoonCount}
        resultCount={timeline.filteredVenues.length}
        isLiveDay={timeline.isLiveDay}
      />
      <div className="discovery-page__main">
        <div className="discovery-content-inset discovery-page__frame">
          <div className="discovery-shell">
            <TimelinePanel
              sections={timeline.sections}
              nowLabel={timeline.nowLabel}
              isLiveDay={timeline.isLiveDay}
              loading={loading}
              selectedVenueId={map.selectedVenueId}
              hoveredVenueId={hoveredVenueId}
              filters={discoveryFilters}
              onSelectVenue={handleSelectVenue}
              onHoverVenue={handleHoverVenue}
            />
            <div className="discovery-shell__map">
              <div className="discovery-map-card">
                <VenueMap
                  venues={timeline.filteredVenues}
                  map={map}
                  viewDay={discoveryFilters.applied.viewDay}
                  loading={loading}
                  variant="embedded"
                  selectedDistanceLabel={selectedDistanceLabel}
                  hoveredVenueId={hoveredVenueId}
                  onHoverVenue={handleHoverVenue}
                  onVenueSelect={handleSelectVenue}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
