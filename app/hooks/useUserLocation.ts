import { createContext, useCallback, useContext, useState } from 'react'

export interface UserLocation {
  latitude: number
  longitude: number
  accuracyMeters: number | null
}

export interface UseUserLocationResult {
  userLocation: UserLocation | null
  loading: boolean
  error: string | null
  requestLocation: () => void
  clearError: () => void
}

export const UserLocationContext = createContext<UseUserLocationResult | null>(null)

function geolocationErrorMessage(code: number): string {
  switch (code) {
    case 1:
      return 'Location permission denied. Allow location in your browser settings and try again.'
    case 2:
      return 'Could not determine your location. Try again in a moment.'
    case 3:
      return 'Location request timed out. Try again.'
    default:
      return 'Could not get your location.'
  }
}

export function useUserLocation(): UseUserLocationResult {
  const context = useContext(UserLocationContext)
  if (!context) {
    throw new Error('useUserLocation must be used within AppProviders')
  }
  return context
}

export function useUserLocationState(): UseUserLocationResult {
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const clearError = useCallback((): void => {
    setError(null)
  }, [])

  const requestLocation = useCallback((): void => {
    if (!navigator.geolocation) {
      setError('Location is not supported in this browser.')
      return
    }

    setLoading(true)
    setError(null)

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracyMeters: Number.isFinite(position.coords.accuracy)
            ? position.coords.accuracy
            : null,
        })
        setLoading(false)
      },
      (geoError) => {
        setLoading(false)
        setError(geolocationErrorMessage(geoError.code))
      },
      {
        enableHighAccuracy: true,
        timeout: 12_000,
        maximumAge: 60_000,
      },
    )
  }, [])

  return {
    userLocation,
    loading,
    error,
    requestLocation,
    clearError,
  }
}
