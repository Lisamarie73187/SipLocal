import { useCallback, useEffect, useMemo, useState } from 'react'

import { DiscoveryHeader } from '@/components/DiscoveryHeader/DiscoveryHeader'
import { TimelinePanel } from '@/components/TimelinePanel/TimelinePanel'
import { VenueMap } from '@/components/VenueMap/VenueMap'
import { useDiscoveryFilters } from '@/hooks/useDiscoveryFilters'
import { useEventTimeline } from '@/hooks/useEventTimeline'
import { useEvents } from '@/hooks/useEvents'
import { useHappyHourTimeline } from '@/hooks/useHappyHourTimeline'
import { useMap } from '@/hooks/useMap'
import { useVenues } from '@/hooks/useVenues'
import type { VenueDetail } from '@/types/venue'
import { distanceMiles, formatDistanceMiles } from '@/utils/geo'

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
  const discoveryFilters = useDiscoveryFilters()
  const { contentType } = discoveryFilters.applied
  const [hoveredVenueId, setHoveredVenueId] = useState<string | null>(null)
  const [hoveredEventId, setHoveredEventId] = useState<string | null>(null)
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null)

  const venueTimeline = useHappyHourTimeline({
    venues,
    filters: discoveryFilters.applied,
    origin: map.viewport,
  })

  const eventTimeline = useEventTimeline({
    events,
    filters: discoveryFilters.applied,
    origin: map.viewport,
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

  const happeningNowCount =
    contentType === 'events' ? eventTimeline.happeningNowCount : venueTimeline.happeningNowCount
  const startingSoonCount =
    contentType === 'events' ? eventTimeline.startingSoonCount : venueTimeline.startingSoonCount
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
      distanceMiles(map.viewport.latitude, map.viewport.longitude, venue.lat, venue.lng),
    )
  }, [map.selectedVenueId, map.viewport, mapVenues, venues])

  const { selectVenue, clearSelection } = map

  const handleSelectVenue = useCallback(
    (venueId: string): void => {
      setSelectedEventId(null)
      selectVenue(venueId)
      requestAnimationFrame(() => {
        document
          .querySelector(`[data-venue-id="${venueId}"]`)
          ?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
      })
    },
    [selectVenue],
  )

  const handleSelectEvent = useCallback(
    (eventId: string, venueId: string): void => {
      setSelectedEventId(eventId)
      selectVenue(venueId)
      void refetchEvents()
      requestAnimationFrame(() => {
        document
          .querySelector(`[data-event-id="${eventId}"]`)
          ?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
      })
    },
    [refetchEvents, selectVenue],
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
        selectVenue(venueId)
        return
      }
      handleSelectVenue(venueId)
    },
    [contentType, events, handleSelectVenue, selectVenue],
  )

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
        happeningNowCount={happeningNowCount}
        startingSoonCount={startingSoonCount}
        resultCount={resultCount}
        isLiveDay={isLiveDay}
      />
      <div className="discovery-page__main">
        <div className="discovery-content-inset discovery-page__frame">
          <div className="discovery-shell">
            <TimelinePanel
              contentType={contentType}
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
              nowLabel={
                contentType === 'events' ? eventTimeline.nowLabel : venueTimeline.nowLabel
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
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
