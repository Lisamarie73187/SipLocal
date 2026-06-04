import { useCallback, useState } from 'react'

export interface MapViewport {
  latitude: number
  longitude: number
  zoom: number
}

export interface UseMapOptions {
  initialViewport?: Partial<MapViewport>
}

export interface UseMapResult {
  viewport: MapViewport
  selectedVenueId: string | null
  setViewport: (next: Partial<MapViewport>) => void
  selectVenue: (venueId: string | null) => void
  clearSelection: () => void
  flyToVenue: (latitude: number, longitude: number, zoom?: number) => void
}

const DEFAULT_VIEWPORT: MapViewport = {
  latitude: 44.0582,
  longitude: -121.3153,
  zoom: 12.8,
}

export function useMap(options: UseMapOptions = {}): UseMapResult {
  const [viewport, setViewportState] = useState<MapViewport>({
    ...DEFAULT_VIEWPORT,
    ...options.initialViewport,
  })
  const [selectedVenueId, setSelectedVenueId] = useState<string | null>(null)

  const setViewport = useCallback((next: Partial<MapViewport>): void => {
    setViewportState((current) => ({ ...current, ...next }))
  }, [])

  const selectVenue = useCallback((venueId: string | null): void => {
    setSelectedVenueId(venueId)
  }, [])

  const clearSelection = useCallback((): void => {
    setSelectedVenueId(null)
  }, [])

  const flyToVenue = useCallback(
    (latitude: number, longitude: number, zoom = 14.2): void => {
      setViewportState((current) => ({
        ...current,
        latitude,
        longitude,
        zoom,
      }))
    },
    [],
  )

  return {
    viewport,
    selectedVenueId,
    setViewport,
    selectVenue,
    clearSelection,
    flyToVenue,
  }
}
