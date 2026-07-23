import { useCallback, useEffect, useMemo, useState } from 'react'
import { List, X } from 'lucide-react'

import { DiscoveryHeader } from '@/components/DiscoveryHeader/DiscoveryHeader'
import { TimelinePanel } from '@/components/TimelinePanel/TimelinePanel'
import { VenueMap } from '@/components/VenueMap/VenueMap'
import { useDiscoveryFilters } from '@/hooks/useDiscoveryFilters'
import { useEventTimeline } from '@/hooks/useEventTimeline'
import { useEvents } from '@/hooks/useEvents'
import { useHappyHourTimeline } from '@/hooks/useHappyHourTimeline'
import { useMap, type MapViewport } from '@/hooks/useMap'
import { useUserLocation } from '@/hooks/useUserLocation'
import { useVenues } from '@/hooks/useVenues'
import type { VenueDetail } from '@/types/venue'
import { distanceMiles, formatDistanceMiles } from '@/utils/geo'
import { cn } from '@/utils'

function venuesForMap(
  contentType: ReturnType<typeof useDiscoveryFilters>['applied']['contentType'],
  venueTimelineVenues: VenueDetail[],
  eventTimelineVenues: VenueDetail[],
): VenueDetail[] {
  return contentType === 'events' ? eventTimelineVenues : venueTimelineVenues
}

export function DiscoveryView() {
  const { venues, loading: venuesLoading, error: venuesError, refetch: refetchVenues } =
    useVenues({ citySlug: 'bend-or' })
  const {
    events,
    loading: eventsLoading,
    error: eventsError,
    refetch: refetchEvents,
  } = useEvents({ citySlug: 'bend-or', refetchOnFocus: true })
  const map = useMap()
  const {
    userLocation,
    loading: locatingUser,
    error: locationError,
    requestLocation,
    clearError: clearLocationError,
  } = useUserLocation()
  const discoveryFilters = useDiscoveryFilters()
  const { contentType } = discoveryFilters.applied
  const [hoveredVenueId, setHoveredVenueId] = useState<string | null>(null)
  const [hoveredEventId, setHoveredEventId] = useState<string | null>(null)
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null)
  const [isListDrawerOpen, setIsListDrawerOpen] = useState(false)

  const distanceOrigin = useMemo((): MapViewport => {
    if (userLocation) {
      return {
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        zoom: map.viewport.zoom,
      }
    }

    return map.viewport
  }, [map.viewport, userLocation])

  const venueTimeline = useHappyHourTimeline({
    venues,
    filters: discoveryFilters.applied,
    origin: distanceOrigin,
  })

  const eventTimeline = useEventTimeline({
    events,
    filters: discoveryFilters.applied,
    origin: distanceOrigin,
  })

  const eventMapVenues = useMemo(() => {
    const ids = new Set(eventTimeline.filteredEvents.map((event) => event.venue.id))
    return venues.filter((venue) => ids.has(venue.id))
  }, [eventTimeline.filteredEvents, venues])

  const mapVenues = useMemo(
    () => venuesForMap(contentType, venueTimeline.filteredVenues, eventMapVenues),
    [contentType, venueTimeline.filteredVenues, eventMapVenues],
  )

  const resultCount = useMemo(() => {
    return contentType === 'events'
      ? eventTimeline.filteredEvents.length
      : venueTimeline.filteredVenues.length
  }, [contentType, venueTimeline.filteredVenues.length, eventTimeline.filteredEvents.length])

  const isLiveDay = contentType === 'events' ? eventTimeline.isLiveDay : venueTimeline.isLiveDay

  const loading = contentType === 'events' ? eventsLoading : venuesLoading

  const selectedEventForPanel = useMemo(() => {
    if (contentType !== 'events' || !selectedEventId) {
      return null
    }
    return events.find((item) => item.id === selectedEventId) ?? null
  }, [contentType, events, selectedEventId])

  const selectedVenueForPanel = useMemo(() => {
    if (contentType !== 'happy_hours' || !map.selectedVenueId) {
      return null
    }
    return venues.find((venue) => venue.id === map.selectedVenueId) ?? null
  }, [contentType, map.selectedVenueId, venues])

  const error = venuesError ?? eventsError

  const cityName = venues[0]?.city.name ?? events[0]?.city.name ?? 'Bend, OR'

  const selectedDistanceLabel = useMemo(() => {
    const venue =
      mapVenues.find((item) => item.id === map.selectedVenueId) ??
      venues.find((item) => item.id === map.selectedVenueId)
    if (!venue) {
      return undefined
    }
    return formatDistanceMiles(
      distanceMiles(
        distanceOrigin.latitude,
        distanceOrigin.longitude,
        venue.lat,
        venue.lng,
      ),
    )
  }, [distanceOrigin, map.selectedVenueId, mapVenues, venues])

  const handleUseMyLocation = useCallback((): void => {
    clearLocationError()
    requestLocation()
  }, [clearLocationError, requestLocation])

  useEffect(() => {
    if (!userLocation) {
      return
    }

    map.flyToPoint(userLocation.latitude, userLocation.longitude, 14.2)
  }, [map.flyToPoint, userLocation])

  const { selectVenue, clearSelection } = map

  const isMobileViewport = useCallback((): boolean => {
    return typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches
  }, [])

  const handleSelectVenue = useCallback(
    (venueId: string): void => {
      setSelectedEventId(null)
      setIsListDrawerOpen(false)
      selectVenue(venueId)
      if (isMobileViewport()) {
        return
      }
      requestAnimationFrame(() => {
        document
          .querySelector(`[data-venue-id="${venueId}"]`)
          ?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
      })
    },
    [isMobileViewport, selectVenue],
  )

  const handleSelectEvent = useCallback(
    (eventId: string, venueId: string): void => {
      setSelectedEventId(eventId)
      setIsListDrawerOpen(false)
      selectVenue(venueId)
      void refetchEvents()
      if (isMobileViewport()) {
        return
      }
      requestAnimationFrame(() => {
        document
          .querySelector(`[data-event-id="${eventId}"]`)
          ?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
      })
    },
    [isMobileViewport, refetchEvents, selectVenue],
  )

  const handleMapPinSelect = useCallback(
    (venueId: string): void => {
      if (contentType === 'events') {
        setSelectedEventId((current) => {
          if (!current) {
            return null
          }
          const event = events.find((item) => item.id === current)
          return event?.venue.id === venueId ? current : null
        })
        setIsListDrawerOpen(false)
        selectVenue(venueId)
        return
      }
      handleSelectVenue(venueId)
    },
    [contentType, events, handleSelectVenue, selectVenue],
  )

  const handleOpenListDrawer = useCallback((): void => {
    setSelectedEventId(null)
    clearSelection()
    setIsListDrawerOpen(true)
  }, [clearSelection])

  const handleCloseListDrawer = useCallback((): void => {
    setIsListDrawerOpen(false)
  }, [])

  const handleHoverVenue = useCallback((venueId: string | null): void => {
    setHoveredVenueId(venueId)
    if (venueId) {
      setHoveredEventId(null)
    }
  }, [])

  const handleHoverEvent = useCallback((eventId: string | null, venueId: string | null): void => {
    setHoveredEventId(eventId)
    setHoveredVenueId(venueId)
  }, [])

  const handleClearMapSelection = useCallback((): void => {
    setSelectedEventId(null)
    clearSelection()
  }, [clearSelection])

  useEffect(() => {
    setSelectedEventId(null)
    clearSelection()
  }, [contentType, clearSelection])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        if (discoveryFilters.isFiltersExpanded) {
          discoveryFilters.closeFiltersExpanded()
          return
        }
        handleClearMapSelection()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [discoveryFilters, handleClearMapSelection])

  if (error) {
    return (
      <div className="flex h-dvh flex-col items-center justify-center gap-4 bg-background px-6 text-center">
        <p className="font-heading text-lg font-semibold text-dark">Couldn&apos;t load places</p>
        <p className="text-sm text-muted-foreground">{error.message}</p>
        <button
          type="button"
          onClick={() => {
            void refetchVenues()
            void refetchEvents()
          }}
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
        resultCount={resultCount}
        onUseMyLocation={handleUseMyLocation}
        useMyLocationLoading={locatingUser}
        useMyLocationActive={userLocation != null}
        locationError={locationError}
        onFlyToLocation={map.flyToPoint}
      />
      <div className="discovery-page__main">
        <div className="discovery-content-inset discovery-page__frame">
          <div className="discovery-shell">
            <TimelinePanel
              contentType={contentType}
              citySlug="bend-or"
              venueSections={venueTimeline.sections}
              eventSections={eventTimeline.sections}
              isLiveDay={isLiveDay}
              loading={loading}
              selectedVenueId={map.selectedVenueId}
              hoveredVenueId={hoveredVenueId}
              selectedEventId={selectedEventId}
              hoveredEventId={hoveredEventId}
              filters={discoveryFilters}
              onSelectVenue={handleSelectVenue}
              onHoverVenue={handleHoverVenue}
              onSelectEvent={handleSelectEvent}
              onHoverEvent={handleHoverEvent}
              nowLabel={contentType === 'events' ? eventTimeline.nowLabel : venueTimeline.nowLabel}
              className={cn('discovery-list-drawer', isListDrawerOpen && 'discovery-list-drawer--open')}
              mobileHeader={
                <div className="discovery-list-drawer__header md:hidden">
                  <span className="discovery-list-drawer__handle" aria-hidden />
                  <div className="flex items-center justify-between">
                    <p className="font-heading text-sm font-bold text-dark">
                      {resultCount} {contentType === 'events' ? 'events' : 'venues'}
                    </p>
                    <button
                      type="button"
                      onClick={handleCloseListDrawer}
                      aria-label="Close list"
                      className="flex size-8 items-center justify-center rounded-full text-muted-foreground hover:bg-accent hover:text-dark"
                    >
                      <X className="size-4" />
                    </button>
                  </div>
                </div>
              }
            />
            <div className="discovery-shell__map">
              <div className="discovery-map-card">
                <VenueMap
                  venues={mapVenues}
                  map={map}
                  viewDay={discoveryFilters.applied.viewDay}
                  loading={loading}
                  variant="embedded"
                  selectedVenuePanel={selectedVenueForPanel}
                  selectedEvent={selectedEventForPanel}
                  selectedDistanceLabel={selectedDistanceLabel}
                  hoveredVenueId={hoveredEventId ? hoveredVenueId : hoveredVenueId}
                  onHoverVenue={handleHoverVenue}
                  onVenueSelect={handleMapPinSelect}
                  onClearSelection={handleClearMapSelection}
                />
                {!isListDrawerOpen && !selectedVenueForPanel && !selectedEventForPanel ? (
                  <button
                    type="button"
                    onClick={handleOpenListDrawer}
                    className="discovery-list-toggle md:hidden"
                  >
                    <List className="size-4" aria-hidden />
                    List
                    <span className="discovery-list-toggle__count">{resultCount}</span>
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
