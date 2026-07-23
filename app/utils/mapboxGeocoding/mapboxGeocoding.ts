import { getMapboxAccessToken } from '@/lib/mapboxEnv'

export interface GeocodeResult {
  latitude: number
  longitude: number
  label: string
  context: string | null
}

export class GeocodingError extends Error {}

interface MapboxGeocodeFeature {
  geometry: { coordinates: [number, number] }
  properties: {
    name?: string
    place_formatted?: string
    full_address?: string
  }
}

interface MapboxGeocodeResponse {
  features?: MapboxGeocodeFeature[]
}

function parseFeature(feature: MapboxGeocodeFeature): GeocodeResult | null {
  const [longitude, latitude] = feature.geometry?.coordinates ?? []
  if (typeof latitude !== 'number' || typeof longitude !== 'number') {
    return null
  }

  const label = feature.properties.name?.trim() || feature.properties.full_address?.trim()
  if (!label) {
    return null
  }

  return {
    latitude,
    longitude,
    label,
    context: feature.properties.place_formatted?.trim() || null,
  }
}

export async function geocodeForwardSearch(
  query: string,
  options?: { proximity?: { latitude: number; longitude: number } },
): Promise<GeocodeResult[]> {
  const trimmed = query.trim()
  if (!trimmed) {
    return []
  }

  const token = getMapboxAccessToken()
  if (!token) {
    throw new GeocodingError('Missing Mapbox access token.')
  }

  const params = new URLSearchParams({
    q: trimmed,
    access_token: token,
    types: 'place,postcode',
    limit: '5',
    country: 'us',
  })

  if (options?.proximity) {
    params.set('proximity', `${options.proximity.longitude},${options.proximity.latitude}`)
  }

  let response: Response
  try {
    response = await fetch(`https://api.mapbox.com/search/geocode/v6/forward?${params}`)
  } catch {
    throw new GeocodingError('Could not reach the location search service.')
  }

  if (!response.ok) {
    throw new GeocodingError('Location search failed. Try again.')
  }

  const data = (await response.json()) as MapboxGeocodeResponse
  const features = data.features ?? []
  const results: GeocodeResult[] = []
  for (const feature of features) {
    const parsed = parseFeature(feature)
    if (parsed) {
      results.push(parsed)
    }
  }
  return results
}
