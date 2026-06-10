import { getGooglePlacesApiKey } from './config'
import { ScrapeApiError } from './errors'

const PLACES_NEARBY_URL = 'https://places.googleapis.com/v1/places:searchNearby'
const PLACES_TEXT_SEARCH_URL = 'https://places.googleapis.com/v1/places:searchText'

const SEARCH_FIELD_MASK = [
  'places.id',
  'places.displayName',
  'places.formattedAddress',
  'places.location',
  'places.nationalPhoneNumber',
  'places.websiteUri',
  'places.priceLevel',
  'places.regularOpeningHours',
  'places.photos',
  'places.primaryType',
  'places.types',
].join(',')

const PLACE_DETAIL_FIELD_MASK = [
  'id',
  'displayName',
  'formattedAddress',
  'location',
  'nationalPhoneNumber',
  'websiteUri',
  'priceLevel',
  'regularOpeningHours',
  'photos',
  'primaryType',
  'types',
].join(',')

/** @deprecated Use SEARCH_FIELD_MASK — kept for nearby search helper. */
const FIELD_MASK = SEARCH_FIELD_MASK

/** Table A types for bars, restaurants, and nightlife */
export const DEFAULT_VENUE_INCLUDED_TYPES = [
  'bar',
  'restaurant',
  'night_club',
  'wine_bar',
  'pub',
] as const

export interface GooglePlacesSearchOptions {
  latitude: number
  longitude: number
  /** Search radius in meters (max 50000 per Google docs) */
  radiusMeters?: number
  maxResults?: number
  includedTypes?: readonly string[]
}

export interface GooglePlaceVenue {
  placeId: string
  name: string
  formattedAddress: string
  lat: number
  lng: number
  phone: string | null
  websiteUrl: string | null
  /** Google price level 0–4 */
  googlePriceLevel: number | null
  photoResourceNames: string[]
  primaryType: string | null
  types: string[]
}

interface GoogleDisplayName {
  text?: string
}

interface GoogleLatLng {
  latitude?: number
  longitude?: number
}

interface GooglePlaceRaw {
  id?: string
  displayName?: GoogleDisplayName
  formattedAddress?: string
  location?: GoogleLatLng
  nationalPhoneNumber?: string
  websiteUri?: string
  priceLevel?: string
  photos?: Array<{ name?: string }>
  primaryType?: string
  types?: string[]
}

interface GoogleSearchNearbyResponse {
  places?: GooglePlaceRaw[]
  nextPageToken?: string
}

function parseGooglePriceLevel(value: string | undefined): number | null {
  if (!value) {
    return null
  }
  const match = /PRICE_LEVEL_(\w+)/.exec(value)
  if (!match) {
    return null
  }
  const map: Record<string, number> = {
    FREE: 0,
    INEXPENSIVE: 1,
    MODERATE: 2,
    EXPENSIVE: 3,
    VERY_EXPENSIVE: 4,
  }
  return map[match[1]] ?? null
}

function mapPlace(raw: GooglePlaceRaw): GooglePlaceVenue | null {
  const placeId = raw.id?.trim()
  const name = raw.displayName?.text?.trim()
  const lat = raw.location?.latitude
  const lng = raw.location?.longitude
  const formattedAddress = raw.formattedAddress?.trim()

  if (!placeId || !name || formattedAddress == null || lat == null || lng == null) {
    return null
  }

  return {
    placeId,
    name,
    formattedAddress,
    lat,
    lng,
    phone: raw.nationalPhoneNumber?.trim() ?? null,
    websiteUrl: raw.websiteUri?.trim() ?? null,
    googlePriceLevel: parseGooglePriceLevel(raw.priceLevel),
    photoResourceNames: (raw.photos ?? [])
      .map((photo) => photo.name?.trim())
      .filter((name): name is string => Boolean(name)),
    primaryType: raw.primaryType ?? null,
    types: raw.types ?? [],
  }
}

async function postSearchNearby(
  apiKey: string,
  body: Record<string, unknown>,
): Promise<GoogleSearchNearbyResponse> {
  const response = await fetch(PLACES_NEARBY_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': SEARCH_FIELD_MASK,
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const detail = await response.text()
    throw new ScrapeApiError(
      `Google Places searchNearby failed (${response.status}): ${detail.slice(0, 500)}`,
      { code: 'api_error', provider: 'google', statusCode: response.status },
    )
  }

  return (await response.json()) as GoogleSearchNearbyResponse
}

const DEFAULT_MAX_SCAN = 80

export interface FetchNewVenuesOptions {
  latitude: number
  longitude: number
  targetCount: number
  excludePlaceIds: ReadonlySet<string>
  radiusMeters?: number
  includedTypes?: readonly string[]
  /** Max Google results to scan (pagination) before giving up. */
  maxScan?: number
  /** When set, only places passing this check are queued (e.g. Bend-only market filter). */
  includePlace?: (place: GooglePlaceVenue) => boolean
}

export interface FetchNewVenuesResult {
  venues: GooglePlaceVenue[]
  scanned: number
}

/**
 * Paginates Google nearby search until `targetCount` places not in `excludePlaceIds`
 * are found, or results are exhausted.
 */
export async function fetchNewVenuesFromGoogle(
  options: FetchNewVenuesOptions,
): Promise<FetchNewVenuesResult> {
  const apiKey = getGooglePlacesApiKey()
  const radiusMeters = options.radiusMeters ?? 12_000
  const targetCount = Math.min(Math.max(options.targetCount, 1), 50)
  const maxScan = Math.min(Math.max(options.maxScan ?? DEFAULT_MAX_SCAN, targetCount), 120)
  const includedTypes = options.includedTypes ?? DEFAULT_VENUE_INCLUDED_TYPES

  const venues: GooglePlaceVenue[] = []
  const seenIds = new Set<string>()
  let scanned = 0
  let pageToken: string | undefined

  while (venues.length < targetCount && scanned < maxScan) {
    const body: Record<string, unknown> = {
      includedTypes: [...includedTypes],
      maxResultCount: Math.min(20, maxScan - scanned),
      locationRestriction: {
        circle: {
          center: {
            latitude: options.latitude,
            longitude: options.longitude,
          },
          radius: radiusMeters,
        },
      },
    }

    if (pageToken) {
      body.pageToken = pageToken
    }

    const data = await postSearchNearby(apiKey, body)

    for (const raw of data.places ?? []) {
      if (scanned >= maxScan || venues.length >= targetCount) {
        break
      }
      scanned += 1
      const mapped = mapPlace(raw)
      if (!mapped || seenIds.has(mapped.placeId)) {
        continue
      }
      seenIds.add(mapped.placeId)
      if (options.excludePlaceIds.has(mapped.placeId)) {
        continue
      }
      if (options.includePlace && !options.includePlace(mapped)) {
        continue
      }
      venues.push(mapped)
    }

    pageToken = data.nextPageToken
    if (!pageToken) {
      break
    }
  }

  return { venues, scanned }
}

/**
 * Finds bars/restaurants/nightlife near a city center via Places API (New).
 */
export interface FindGooglePlaceByTextOptions {
  textQuery: string
  latitude: number
  longitude: number
  radiusMeters?: number
  maxResults?: number
}

async function postSearchText(
  apiKey: string,
  body: Record<string, unknown>,
): Promise<GoogleSearchNearbyResponse> {
  const response = await fetch(PLACES_TEXT_SEARCH_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': SEARCH_FIELD_MASK,
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const detail = await response.text()
    throw new ScrapeApiError(
      `Google Places searchText failed (${response.status}): ${detail.slice(0, 500)}`,
      { code: 'api_error', provider: 'google', statusCode: response.status },
    )
  }

  return (await response.json()) as GoogleSearchNearbyResponse
}

function mapPlacesFromSearchResponse(data: GoogleSearchNearbyResponse): GooglePlaceVenue[] {
  const venues: GooglePlaceVenue[] = []
  const seenIds = new Set<string>()

  for (const raw of data.places ?? []) {
    const mapped = mapPlace(raw)
    if (!mapped || seenIds.has(mapped.placeId)) {
      continue
    }
    seenIds.add(mapped.placeId)
    venues.push(mapped)
  }

  return venues
}

/**
 * Text search returning up to `maxResults` Google places (default 5).
 */
export async function searchGooglePlacesByText(
  options: FindGooglePlaceByTextOptions,
): Promise<GooglePlaceVenue[]> {
  const apiKey = getGooglePlacesApiKey()
  const radiusMeters = options.radiusMeters ?? 15_000
  const maxResultCount = Math.min(Math.max(options.maxResults ?? 5, 1), 10)

  const data = await postSearchText(apiKey, {
    textQuery: options.textQuery,
    maxResultCount,
    locationBias: {
      circle: {
        center: {
          latitude: options.latitude,
          longitude: options.longitude,
        },
        radius: radiusMeters,
      },
    },
  })

  return mapPlacesFromSearchResponse(data)
}

/**
 * Resolves a venue name/address to a Google place (for Bend Source / Yelp discovery).
 */
export async function findGooglePlaceByText(
  options: FindGooglePlaceByTextOptions,
): Promise<GooglePlaceVenue | null> {
  const places = await searchGooglePlacesByText({ ...options, maxResults: 1 })
  return places[0] ?? null
}

/**
 * Fetches a single place by Google Places ID.
 */
export async function getGooglePlaceById(placeId: string): Promise<GooglePlaceVenue | null> {
  const apiKey = getGooglePlacesApiKey()
  const encodedId = encodeURIComponent(placeId)

  const response = await fetch(`https://places.googleapis.com/v1/places/${encodedId}`, {
    headers: {
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': PLACE_DETAIL_FIELD_MASK,
    },
  })

  if (response.status === 404) {
    return null
  }

  if (!response.ok) {
    const detail = await response.text()
    throw new ScrapeApiError(
      `Google Places getPlace failed (${response.status}): ${detail.slice(0, 500)}`,
      { code: 'api_error', provider: 'google', statusCode: response.status },
    )
  }

  const raw = (await response.json()) as GooglePlaceRaw
  return mapPlace(raw)
}

export interface GooglePlacePhoto {
  imageBase64: string
  mediaType: string
}

/**
 * Fetches a Google Place photo's image bytes via the Photo Media API.
 * `photoResourceName` is one of `GooglePlaceVenue.photoResourceNames`
 * (format: `places/{placeId}/photos/{photoId}`).
 */
export async function fetchGooglePlacePhoto(
  photoResourceName: string,
  maxWidthPx = 1200,
): Promise<GooglePlacePhoto | null> {
  const apiKey = getGooglePlacesApiKey()

  const response = await fetch(
    `https://places.googleapis.com/v1/${photoResourceName}/media?maxWidthPx=${maxWidthPx}&key=${apiKey}`,
  )

  if (!response.ok) {
    return null
  }

  const contentType = response.headers.get('content-type') ?? ''
  if (!contentType.startsWith('image/')) {
    return null
  }

  const buffer = await response.arrayBuffer()
  return {
    imageBase64: Buffer.from(buffer).toString('base64'),
    mediaType: contentType,
  }
}

export async function fetchVenuesFromGoogle(
  options: GooglePlacesSearchOptions,
): Promise<GooglePlaceVenue[]> {
  const maxResults = Math.min(Math.max(options.maxResults ?? 25, 1), 50)
  const { venues } = await fetchNewVenuesFromGoogle({
    latitude: options.latitude,
    longitude: options.longitude,
    targetCount: maxResults,
    excludePlaceIds: new Set(),
    radiusMeters: options.radiusMeters,
    includedTypes: options.includedTypes,
    maxScan: maxResults,
  })
  return venues
}
