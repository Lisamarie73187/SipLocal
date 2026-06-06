import type { SupabaseClient } from '@supabase/supabase-js'

import {
  getGooglePlaceById,
  searchGooglePlacesByText,
  type GooglePlaceVenue,
} from '@/lib/scrape/googlePlaces'
import { createSupabaseServiceClient } from '@/lib/supabaseService'
import type { Database } from '@/types/database'

export type VenueSuggestionLookupStrategy = 'name' | 'submitter_location' | 'none'

export interface VenueSuggestionGooglePlace {
  placeId: string
  name: string
  formattedAddress: string
  lat: number
  lng: number
  phone: string | null
  websiteUrl: string | null
}

export interface VenueSuggestionExistingVenue {
  id: string
  name: string
  slug: string
  address_line1: string
  place_id: string | null
  is_published: boolean
  data_status: Database['public']['Enums']['venue_data_status']
  matchReason: 'place_id' | 'name'
}

export interface VenueSuggestionLookupResult {
  strategy: VenueSuggestionLookupStrategy
  googlePlaces: VenueSuggestionGooglePlace[]
  existingVenues: VenueSuggestionExistingVenue[]
}

function normalizeVenueName(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
}

function toGooglePlaceSummary(place: GooglePlaceVenue): VenueSuggestionGooglePlace {
  return {
    placeId: place.placeId,
    name: place.name,
    formattedAddress: place.formattedAddress,
    lat: place.lat,
    lng: place.lng,
    phone: place.phone,
    websiteUrl: place.websiteUrl,
  }
}

export async function findExistingVenuesForSuggestion(
  supabase: SupabaseClient<Database>,
  cityId: string,
  venueName: string,
  googlePlaceIds: readonly string[],
): Promise<VenueSuggestionExistingVenue[]> {
  const matches = new Map<string, VenueSuggestionExistingVenue>()
  const placeIds = [...new Set(googlePlaceIds.filter(Boolean))]

  if (placeIds.length > 0) {
    const { data: byPlaceId, error: placeError } = await supabase
      .from('venues')
      .select('id, name, slug, address_line1, place_id, is_published, data_status')
      .eq('city_id', cityId)
      .in('place_id', placeIds)
      .is('archived_at', null)

    if (placeError) {
      throw placeError
    }

    for (const row of byPlaceId ?? []) {
      matches.set(row.id, { ...row, matchReason: 'place_id' })
    }
  }

  const normalizedQuery = normalizeVenueName(venueName)
  if (normalizedQuery.length >= 2) {
    const { data: byName, error: nameError } = await supabase
      .from('venues')
      .select('id, name, slug, address_line1, place_id, is_published, data_status')
      .eq('city_id', cityId)
      .is('archived_at', null)
      .ilike('name', `%${venueName.trim()}%`)
      .limit(10)

    if (nameError) {
      throw nameError
    }

    for (const row of byName ?? []) {
      if (matches.has(row.id)) {
        continue
      }

      const normalizedRow = normalizeVenueName(row.name)
      if (
        normalizedRow.includes(normalizedQuery) ||
        normalizedQuery.includes(normalizedRow)
      ) {
        matches.set(row.id, { ...row, matchReason: 'name' })
      }
    }
  }

  return [...matches.values()].sort((left, right) => left.name.localeCompare(right.name))
}

export async function lookupVenueSuggestionPlace(input: {
  venueName: string
  citySlug: string
  submitterLat?: number | null
  submitterLng?: number | null
}): Promise<VenueSuggestionLookupResult> {
  const supabase = createSupabaseServiceClient()
  const { data: city, error: cityError } = await supabase
    .from('cities')
    .select('id, name, state, center_lat, center_lng')
    .eq('slug', input.citySlug)
    .eq('is_active', true)
    .single()

  if (cityError || !city) {
    throw new Error(`Unknown or inactive city slug: ${input.citySlug}`)
  }

  const nameQuery = `${input.venueName.trim()}, ${city.name}, ${city.state}`
  let strategy: VenueSuggestionLookupStrategy = 'none'
  let googlePlaces = await searchGooglePlacesByText({
    textQuery: nameQuery,
    latitude: city.center_lat,
    longitude: city.center_lng,
    maxResults: 5,
  })

  if (googlePlaces.length > 0) {
    strategy = 'name'
  } else if (input.submitterLat != null && input.submitterLng != null) {
    googlePlaces = await searchGooglePlacesByText({
      textQuery: input.venueName.trim(),
      latitude: input.submitterLat,
      longitude: input.submitterLng,
      radiusMeters: 3_000,
      maxResults: 5,
    })

    if (googlePlaces.length > 0) {
      strategy = 'submitter_location'
    }
  }

  const existingVenues = await findExistingVenuesForSuggestion(
    supabase,
    city.id,
    input.venueName,
    googlePlaces.map((place) => place.placeId),
  )

  return {
    strategy,
    googlePlaces: googlePlaces.map(toGooglePlaceSummary),
    existingVenues,
  }
}

export async function resolveGooglePlaceForSuggestion(
  googlePlaceId: string,
): Promise<GooglePlaceVenue> {
  const place = await getGooglePlaceById(googlePlaceId)
  if (!place) {
    throw new Error('Google place not found. Run lookup again and pick a match.')
  }
  return place
}
