import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Map as MapboxMap, Marker as MapboxMarker } from 'mapbox-gl'

import {
  VENUE_MAP_PLACE_PANEL_OFFSET_PX,
  VenueMapPlacePanel,
} from '@/components/VenueMapPlacePanel/VenueMapPlacePanel'
import { MAPBOX_STYLE, mapboxgl } from '@/lib/mapboxBrowser'
import { getMapboxAccessToken, validateMapboxToken } from '@/lib/mapboxEnv'
import {
  buildVenueClusterIndex,
  getClusterPinStatus,
  resolveMapPinStatus,
  type VenueMapClusterIndex,
} from '@/utils/mapCluster'
import { logger } from '@/utils/logger'
import { cn } from '@/utils'

import { MapLegend } from './MapLegend'
import {
  createClusterMarkerElement,
  createVenueMarkerElement,
  updateVenueMarkerElement,
} from './venuePin'
import { getDayOfWeekInTimezone, isViewingToday, type MapPinStatus } from '@/utils/happyHour'
import type { VenueMapProps } from './VenueMap.types'

function isClusterFeature(
  props: { cluster?: boolean; cluster_id?: number; point_count?: number; venueId?: string },
): props is { cluster: true; cluster_id: number; point_count: number } {
  return props.cluster === true
}

const MAPBOX_TOKEN = getMapboxAccessToken()
const MARKER_SYNC_INTERVAL_MS = 60_000

function formatMapboxError(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message
  }
  if (typeof error === 'string' && error) {
    return error
  }
  return 'Unknown Mapbox error — check the browser console for details.'
}

export function VenueMap({
  venues,
  map,
  viewDay = 'any',
  loading = false,
  variant = 'fullscreen',
  selectedDistanceLabel,
  hoveredVenueId = null,
  onHoverVenue,
  onVenueSelect,
}: VenueMapProps) {
  const isEmbedded = variant === 'embedded'
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<MapboxMap | null>(null)
  const markersRef = useRef<MapboxMarker[]>([])
  const markerElementsRef = useRef<Map<string, HTMLButtonElement>>(new Map())
  const clusterIndexRef = useRef<VenueMapClusterIndex | null>(null)
  const hasFittedBoundsRef = useRef(false)
  const previousVenueBoundsKeyRef = useRef('')
  const mapApiRef = useRef(map)
  mapApiRef.current = map
  const onHoverVenueRef = useRef(onHoverVenue)
  onHoverVenueRef.current = onHoverVenue
  const onVenueSelectRef = useRef(onVenueSelect)
  onVenueSelectRef.current = onVenueSelect
  const hoveredVenueIdRef = useRef(hoveredVenueId)
  hoveredVenueIdRef.current = hoveredVenueId
  const venuesRef = useRef(venues)
  venuesRef.current = venues
  const viewDayRef = useRef(viewDay)
  viewDayRef.current = viewDay

  const [mapStatus, setMapStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle')
  const [mapError, setMapError] = useState<string | null>(null)
  const [now, setNow] = useState(() => new Date())

  const timeZone = venues[0]?.city.timezone ?? 'America/Los_Angeles'
  const isLiveDay = useMemo(
    () => isViewingToday(viewDay, getDayOfWeekInTimezone(now, timeZone)),
    [viewDay, now, timeZone],
  )

  const tokenValidationError = MAPBOX_TOKEN ? validateMapboxToken(MAPBOX_TOKEN) : null

  const venueById = useMemo(
    () => new Map(venues.map((venue) => [venue.id, venue])),
    [venues],
  )

  const selectedVenue = useMemo(
    () => venues.find((venue) => venue.id === map.selectedVenueId) ?? null,
    [map.selectedVenueId, venues],
  )

  const flyToSelectedVenue = useCallback((): void => {
    const instance = mapRef.current
    if (!instance || !selectedVenue || mapStatus !== 'ready') {
      return
    }

    const offsetX = isEmbedded ? VENUE_MAP_PLACE_PANEL_OFFSET_PX : 0
    instance.flyTo({
      center: [selectedVenue.lng, selectedVenue.lat],
      zoom: Math.max(instance.getZoom(), 14.2),
      offset: [offsetX, 0],
      duration: 700,
    })
  }, [isEmbedded, mapStatus, selectedVenue])

  const clearMarkers = useCallback((): void => {
    markersRef.current.forEach((marker) => marker.remove())
    markersRef.current = []
    markerElementsRef.current.clear()
  }, [])

  const syncMarkers = useCallback((): void => {
    const instance = mapRef.current
    const index = clusterIndexRef.current
    if (!instance || !index) {
      return
    }

    clearMarkers()

    const bounds = instance.getBounds()
    if (!bounds) {
      return
    }

    const zoom = Math.floor(instance.getZoom())
    const clusters = index.getClusters(
      [bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()],
      zoom,
    )

    const currentNow = now
    const selectedVenueId = mapApiRef.current.selectedVenueId
    const hoveredId = hoveredVenueIdRef.current

    for (const feature of clusters) {
      const [lng, lat] = feature.geometry.coordinates
      const props = feature.properties as {
        cluster?: boolean
        cluster_id?: number
        point_count?: number
        venueId?: string
        pinStatus?: MapPinStatus
      }

      if (isClusterFeature(props)) {
        const clusterId = props.cluster_id
        const count = props.point_count
        const clusterStatus = getClusterPinStatus(index, clusterId)
        const pinStatus: Exclude<MapPinStatus, 'none'> =
          clusterStatus === 'none' ? 'later_tonight' : clusterStatus
        const element = createClusterMarkerElement(count, pinStatus)

        element.addEventListener('click', (event) => {
          event.stopPropagation()
          const expansionZoom = Math.min(index.getClusterExpansionZoom(clusterId), 16)
          instance.easeTo({
            center: [lng, lat],
            zoom: expansionZoom,
            duration: 500,
          })
        })

        const marker = new mapboxgl.Marker({ element, anchor: 'center' })
          .setLngLat([lng, lat])
          .addTo(instance)

        markersRef.current.push(marker)
        continue
      }

      const venueId = props.venueId
      if (!venueId) {
        continue
      }

      const venue = venueById.get(venueId) ?? venuesRef.current.find((item) => item.id === venueId)
      if (!venue) {
        continue
      }

      const timeZone = venue.city.timezone
      const markerPinStatus = resolveMapPinStatus(
        venue.happy_hour_slots,
        currentNow,
        timeZone,
        viewDayRef.current,
      )
      const isSelected = venueId === selectedVenueId
      const isHovered = venueId === hoveredId

      const element = createVenueMarkerElement(venueId, venue.name, markerPinStatus, {
        pinStatus: markerPinStatus,
        isSelected,
        isHovered,
      })

      element.addEventListener('click', (event) => {
        event.stopPropagation()
        mapApiRef.current.selectVenue(venueId)
        onVenueSelectRef.current?.(venueId)
      })

      element.addEventListener('mouseenter', () => {
        onHoverVenueRef.current?.(venueId)
      })
      element.addEventListener('mouseleave', () => {
        if (hoveredVenueIdRef.current === venueId) {
          onHoverVenueRef.current?.(null)
        }
      })

      const marker = new mapboxgl.Marker({ element, anchor: 'bottom' })
        .setLngLat([lng, lat])
        .addTo(instance)

      markersRef.current.push(marker)
      markerElementsRef.current.set(venueId, element)
    }
  }, [clearMarkers, isEmbedded, now, venueById])

  const syncMarkersRef = useRef(syncMarkers)
  syncMarkersRef.current = syncMarkers

  useEffect(() => {
    clusterIndexRef.current = buildVenueClusterIndex(venues, now, viewDay)
    if (mapRef.current && mapStatus === 'ready') {
      syncMarkers()
    }
  }, [venues, now, viewDay, mapStatus, isEmbedded, syncMarkers])

  useEffect(() => {
    const interval = window.setInterval(() => {
      setNow(new Date())
    }, MARKER_SYNC_INTERVAL_MS)
    return () => window.clearInterval(interval)
  }, [])

  useEffect(() => {
    if (!map.selectedVenueId) {
      return
    }
    flyToSelectedVenue()
  }, [map.selectedVenueId, flyToSelectedVenue])

  useEffect(() => {
    const container = containerRef.current
    if (!container || !MAPBOX_TOKEN || tokenValidationError) {
      return
    }

    let cancelled = false
    let loadTimeout: ReturnType<typeof setTimeout> | undefined
    let handleResize: (() => void) | undefined
    let resizeObserver: ResizeObserver | undefined

    setMapStatus('loading')
    setMapError(null)

    try {
      mapboxgl.accessToken = MAPBOX_TOKEN

      const instance = new mapboxgl.Map({
        container,
        style: MAPBOX_STYLE,
        center: [map.viewport.longitude, map.viewport.latitude],
        zoom: map.viewport.zoom,
        attributionControl: true,
      })

      resizeObserver = new ResizeObserver(() => {
        instance.resize()
      })
      resizeObserver.observe(container)

      loadTimeout = setTimeout(() => {
        if (!cancelled) {
          setMapError('Map timed out loading. Check your network and Mapbox token.')
          setMapStatus('error')
        }
      }, 20_000)

      instance.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right')

      instance.once('load', () => {
        if (cancelled) {
          return
        }
        clearTimeout(loadTimeout)
        instance.resize()
        requestAnimationFrame(() => {
          instance.resize()
        })
        setMapStatus('ready')
      })

      handleResize = (): void => {
        instance.resize()
      }
      window.addEventListener('resize', handleResize)

      instance.on('error', (event) => {
        logger.error('Mapbox tile/style error', event.error ?? event)
      })

      instance.on('moveend', () => {
        const center = instance.getCenter()
        mapApiRef.current.setViewport({
          latitude: center.lat,
          longitude: center.lng,
          zoom: instance.getZoom(),
        })
        syncMarkersRef.current()
      })

      instance.on('zoomend', () => {
        syncMarkersRef.current()
      })

      instance.on('click', () => {
        mapApiRef.current.clearSelection()
      })

      mapRef.current = instance
    } catch (caught) {
      clearTimeout(loadTimeout)
      setMapError(formatMapboxError(caught))
      setMapStatus('error')
      logger.error('Mapbox init failed', caught)
    }

    return () => {
      cancelled = true
      clearTimeout(loadTimeout)
      resizeObserver?.disconnect()
      if (handleResize) {
        window.removeEventListener('resize', handleResize)
      }
      clearMarkers()
      mapRef.current?.remove()
      mapRef.current = null
      clusterIndexRef.current = null
      setMapStatus('idle')
    }
  }, [clearMarkers, tokenValidationError])

  useEffect(() => {
    if (mapStatus !== 'ready') {
      return
    }
    syncMarkers()
  }, [mapStatus, syncMarkers])

  useEffect(() => {
    for (const venue of venues) {
      const element = markerElementsRef.current.get(venue.id)
      if (!element) {
        continue
      }
      const timeZone = venue.city.timezone
      const markerPinStatus = resolveMapPinStatus(
        venue.happy_hour_slots,
        now,
        timeZone,
        viewDay,
      )
      const isSelected = venue.id === map.selectedVenueId
      const isHovered = venue.id === hoveredVenueId
      updateVenueMarkerElement(element, {
        pinStatus: markerPinStatus,
        isSelected,
        isHovered,
      })
    }
  }, [venues, map.selectedVenueId, hoveredVenueId, now, viewDay])

  useEffect(() => {
    const instance = mapRef.current
    if (!instance || mapStatus !== 'ready' || venues.length === 0) {
      return
    }

    const venueBoundsKey = venues
      .map((venue) => venue.id)
      .sort()
      .join(',')
    const boundsChanged = venueBoundsKey !== previousVenueBoundsKeyRef.current
    previousVenueBoundsKeyRef.current = venueBoundsKey

    if (!boundsChanged && hasFittedBoundsRef.current) {
      return
    }

    hasFittedBoundsRef.current = true
    const bounds = new mapboxgl.LngLatBounds()
    venues.forEach((venue) => bounds.extend([venue.lng, venue.lat]))
    instance.fitBounds(bounds, {
      padding: isEmbedded
        ? { top: 48, bottom: 48, left: 48, right: 48 }
        : { top: 80, bottom: 120, left: 40, right: 40 },
      maxZoom: 13.5,
      duration: boundsChanged && venueBoundsKey ? 500 : 0,
    })
    instance.resize()
  }, [venues, mapStatus, isEmbedded])

  if (!MAPBOX_TOKEN) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background px-6 text-center">
        <p className="text-sm text-muted-foreground">
          Add <code className="text-foreground">VITE_MAPBOX_TOKEN</code> to `.env.local`, then
          restart the dev server.
        </p>
      </div>
    )
  }

  if (tokenValidationError) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background px-6 text-center">
        <p className="text-sm text-destructive">{tokenValidationError}</p>
      </div>
    )
  }

  if (mapStatus === 'error') {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-background px-6 text-center">
        <p className="font-heading text-lg font-semibold text-dark">Map couldn&apos;t load</p>
        <p className="max-w-md text-sm text-muted-foreground">{mapError}</p>
        <ul className="max-w-md list-disc space-y-1 pl-5 text-left text-xs text-muted-foreground">
          <li>Confirm `.env.local` has your <strong>public</strong> token (`pk.`…)</li>
          <li>Restart dev server after changing env vars</li>
          <li>Hard refresh the browser (Cmd+Shift+R)</li>
          <li>Check browser console for WebGL or network errors</li>
        </ul>
      </div>
    )
  }

  return (
    <div className={cn('venue-map', isEmbedded && 'venue-map--embedded')}>
      <div ref={containerRef} className="venue-map__canvas" />

      <div className="venue-map__golden-tint" aria-hidden />
      <div className="venue-map__wash" aria-hidden />

      {mapStatus === 'loading' ? (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <p
            className={cn(
              'text-sm font-medium',
              isEmbedded ? 'discovery-map-card__loading text-muted-foreground' : 'rounded-full bg-card/90 px-4 py-2 text-muted-foreground shadow-md',
            )}
          >
            Loading map…
          </p>
        </div>
      ) : null}

      {mapStatus === 'ready' && isLiveDay ? <MapLegend /> : null}

      {selectedVenue ? (
        <VenueMapPlacePanel
          venue={selectedVenue}
          viewDay={viewDay}
          distanceLabel={selectedDistanceLabel}
          onClose={map.clearSelection}
        />
      ) : null}
    </div>
  )
}
